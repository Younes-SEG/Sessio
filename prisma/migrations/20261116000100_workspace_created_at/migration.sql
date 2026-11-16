-- Additive: when each workspace was first opened, for aggregate retention counts only.
ALTER TABLE "Settings" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing workspaces predate the column. Use the earliest timestamp already stored for
-- each one (tasks, chats, Gmail connection, AI age confirmation); otherwise keep the
-- migration time. Reads only timestamps, never content.
UPDATE "Settings" s
SET "createdAt" = earliest.at
FROM (
  SELECT ws, MIN(at) AS at FROM (
    SELECT "workspaceId" AS ws, "createdAt" AS at FROM "Task"
    UNION ALL SELECT "workspaceId", "createdAt" FROM "AssistantRequest"
    UNION ALL SELECT "workspaceId", "createdAt" FROM "AssistantConversation"
    UNION ALL SELECT "workspaceId", "connectedAt" FROM "GmailConnection"
    UNION ALL SELECT "workspaceId", "aiAgeConfirmedAt" FROM "Settings" WHERE "aiAgeConfirmedAt" IS NOT NULL
  ) signals
  GROUP BY ws
) earliest
WHERE earliest.ws = s."workspaceId" AND earliest.at < s."createdAt";
