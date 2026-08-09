-- Expiry now runs from the last time somebody looked, not from when the draft was made.
-- Creating a site today and coming back tomorrow to show it to a business partner is not
-- abandonment, and it was being treated as such.
ALTER TABLE "Draft" ADD COLUMN "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Draft_lastViewedAt_idx" ON "Draft"("lastViewedAt");
