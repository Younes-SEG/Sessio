CREATE TABLE "AssistantRequest" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "plan" JSONB,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantRequest_pkey" PRIMARY KEY ("workspaceId", "id")
);
CREATE INDEX "AssistantRequest_workspaceId_createdAt_idx" ON "AssistantRequest"("workspaceId", "createdAt");
