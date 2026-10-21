CREATE TABLE "GmailConnection" (
 "id" TEXT NOT NULL PRIMARY KEY, "workspaceId" TEXT NOT NULL UNIQUE,
 "email" TEXT NOT NULL, "refreshToken" TEXT NOT NULL, "query" TEXT NOT NULL,
 "autoSync" BOOLEAN NOT NULL DEFAULT true, "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "consentVersion" TEXT NOT NULL DEFAULT '2026-10-19',
 "lastCheckedAt" TIMESTAMP(3), "lastAttemptAt" TIMESTAMP(3), "lastError" TEXT,
 "pageToken" TEXT, "pageQuery" TEXT, "syncToken" TEXT, "syncStartedAt" TIMESTAMP(3)
);
CREATE TABLE "GmailOAuthState" (
 "id" TEXT NOT NULL PRIMARY KEY, "workspaceId" TEXT NOT NULL UNIQUE,
 "verifier" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "claimed" BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE "EmailUpdate" (
 "id" TEXT NOT NULL PRIMARY KEY, "connectionId" TEXT NOT NULL, "messageId" TEXT NOT NULL,
 "subject" TEXT NOT NULL, "sender" TEXT NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL,
 "excerpt" TEXT NOT NULL, "score" DOUBLE PRECISION, "maxScore" DOUBLE PRECISION,
 "suggestedAssessmentId" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "reviewedAt" TIMESTAMP(3),
 CONSTRAINT "EmailUpdate_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GmailConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EmailUpdate_connectionId_messageId_key" ON "EmailUpdate"("connectionId", "messageId");
CREATE INDEX "EmailUpdate_connectionId_status_receivedAt_idx" ON "EmailUpdate"("connectionId", "status", "receivedAt");
