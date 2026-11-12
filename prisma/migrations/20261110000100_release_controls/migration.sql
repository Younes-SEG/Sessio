CREATE TABLE "AiControl" ("id" TEXT PRIMARY KEY, "enabled" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "AiBucket" ("id" TEXT PRIMARY KEY, "value" BIGINT NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "AiAttempt" ("id" TEXT PRIMARY KEY, "subject" TEXT NOT NULL, "feature" TEXT NOT NULL, "model" TEXT NOT NULL, "reservedMicros" BIGINT NOT NULL, "usage" JSONB, "status" TEXT NOT NULL DEFAULT 'RESERVED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "AiAttempt_subject_createdAt_idx" ON "AiAttempt"("subject", "createdAt");
CREATE INDEX "AiAttempt_status_expiresAt_idx" ON "AiAttempt"("status", "expiresAt");
CREATE TABLE "AccountLifecycle" ("workspaceId" TEXT PRIMARY KEY, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "blockedAt" TIMESTAMP(3), "erasedAt" TIMESTAMP(3), "authDeletedAt" TIMESTAMP(3));

-- Shared row locks serialize deletion against even requests authorized before blocking.
-- Local edition is unchanged. Deletes remain possible during account erasure.
CREATE FUNCTION command_check_account(w TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE state TEXT;
BEGIN
  IF w IS NULL OR w NOT LIKE 'user:%' THEN RETURN; END IF;
  INSERT INTO "AccountLifecycle" ("workspaceId") VALUES (w) ON CONFLICT DO NOTHING;
  SELECT "status" INTO state FROM "AccountLifecycle" WHERE "workspaceId" = w FOR SHARE;
  IF state <> 'ACTIVE' THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE = '42501'; END IF;
END;
$$;
CREATE FUNCTION command_guard_account_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w TEXT; parent_id TEXT;
BEGIN
  IF TG_ARGV[0] = 'direct' THEN w := to_jsonb(NEW)->>'workspaceId';
  ELSIF TG_ARGV[0] = 'semester' THEN
    SELECT "workspaceId" INTO w FROM "Semester" WHERE "id" = NEW."semesterId";
  ELSIF TG_ARGV[0] = 'course' THEN
    SELECT s."workspaceId" INTO w FROM "Course" c JOIN "Semester" s ON s."id" = c."semesterId" WHERE c."id" = NEW."courseId";
  ELSIF TG_ARGV[0] = 'task' THEN
    SELECT "workspaceId" INTO w FROM "Task" WHERE "id" = NEW."taskId";
  ELSIF TG_ARGV[0] = 'subscription' THEN
    SELECT "workspaceId" INTO w FROM "CalendarSubscription" WHERE "id" = NEW."subscriptionId";
  ELSIF TG_ARGV[0] = 'connection' THEN
    SELECT "workspaceId" INTO w FROM "GmailConnection" WHERE "id" = NEW."connectionId";
  END IF;
  PERFORM command_check_account(w);
  RETURN NEW;
END;
$$;
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['Semester','Task','CalendarEvent','Settings','CalendarSubscription','GmailOAuthState','GmailConnection','AssistantRequest','AssistantConversation'] LOOP
    EXECUTE format('CREATE TRIGGER account_write_guard BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION command_guard_account_write(''direct'')', t);
  END LOOP;
END $$;
CREATE TRIGGER account_write_guard BEFORE INSERT OR UPDATE ON "Course" FOR EACH ROW EXECUTE FUNCTION command_guard_account_write('semester');
CREATE TRIGGER account_write_guard BEFORE INSERT OR UPDATE ON "Assessment" FOR EACH ROW EXECUTE FUNCTION command_guard_account_write('course');
CREATE TRIGGER account_write_guard BEFORE INSERT OR UPDATE ON "ScheduleEntry" FOR EACH ROW EXECUTE FUNCTION command_guard_account_write('course');
CREATE TRIGGER account_write_guard BEFORE INSERT OR UPDATE ON "Subtask" FOR EACH ROW EXECUTE FUNCTION command_guard_account_write('task');
CREATE TRIGGER account_write_guard BEFORE INSERT OR UPDATE ON "ImportedCalendarItem" FOR EACH ROW EXECUTE FUNCTION command_guard_account_write('subscription');
CREATE TRIGGER account_write_guard BEFORE INSERT OR UPDATE ON "EmailUpdate" FOR EACH ROW EXECUTE FUNCTION command_guard_account_write('connection');
