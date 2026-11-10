ALTER TABLE "AssistantRequest" ADD COLUMN "conversationId" TEXT;
CREATE INDEX "AssistantRequest_workspaceId_conversationId_idx" ON "AssistantRequest"("workspaceId", "conversationId");
CREATE TABLE "AssistantConversation" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "entries" JSONB NOT NULL DEFAULT '[]',
  "context" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("workspaceId", "id")
);
CREATE INDEX "AssistantConversation_workspaceId_updatedAt_idx" ON "AssistantConversation"("workspaceId", "updatedAt");
