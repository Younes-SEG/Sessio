ALTER TABLE "Settings" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "Course" ADD COLUMN "credits" DOUBLE PRECISION;
ALTER TABLE "Course" ADD CONSTRAINT "Course_credits_check" CHECK ("credits" IS NULL OR ("credits" > 0 AND "credits" <= 1000));
