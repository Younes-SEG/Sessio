-- Additive: records when a hosted user confirmed they are 18 or older for AI features.
ALTER TABLE "Settings" ADD COLUMN "aiAgeConfirmedAt" TIMESTAMP(3);
