-- Drafts move out of process memory so a deploy or a crash stops destroying the site
-- somebody just generated. Deliberately shallow: no owner, no foreign keys, deleted on
-- claim, swept after 24 hours.
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "landing" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Draft_createdAt_idx" ON "Draft"("createdAt");
