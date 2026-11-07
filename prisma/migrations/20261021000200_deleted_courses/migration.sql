ALTER TABLE "Course" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Course_semesterId_deletedAt_idx" ON "Course"("semesterId", "deletedAt");
