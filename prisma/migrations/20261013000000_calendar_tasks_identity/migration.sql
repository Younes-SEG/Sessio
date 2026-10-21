ALTER TABLE "Assessment" ADD COLUMN "calendarTaskCreated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "calendarManaged" BOOLEAN NOT NULL DEFAULT false;
DROP INDEX "ImportedCalendarItem_assessmentId_key";
DROP INDEX "ImportedCalendarItem_eventId_key";
CREATE INDEX "ImportedCalendarItem_assessmentId_idx" ON "ImportedCalendarItem"("assessmentId");
CREATE INDEX "ImportedCalendarItem_eventId_idx" ON "ImportedCalendarItem"("eventId");
