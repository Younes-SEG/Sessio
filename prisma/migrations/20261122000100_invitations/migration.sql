-- Additive: invite-only access. One row per invited (lowercased) email.
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invitation_email_key" ON "Invitation"("email");
CREATE UNIQUE INDEX "Invitation_workspaceId_key" ON "Invitation"("workspaceId");
CREATE INDEX "Invitation_invitedBy_createdAt_idx" ON "Invitation"("invitedBy", "createdAt");

-- Same deletion barrier as the other workspace tables: an account being deleted can't send
-- invitations or claim one. Clearing "invitedBy" during erasure stays possible.
CREATE FUNCTION command_guard_invitation_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM command_check_account(NEW."invitedBy"); END IF;
  IF NEW."workspaceId" IS NOT NULL AND (TG_OP = 'INSERT' OR NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId") THEN
    PERFORM command_check_account(NEW."workspaceId");
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER account_write_guard BEFORE INSERT OR UPDATE ON "Invitation" FOR EACH ROW EXECUTE FUNCTION command_guard_invitation_write();
