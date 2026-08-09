-- One row per thing that happened.
--
-- No visitor identity of any kind: no cookie, no address, no fingerprint. A row records
-- that an action occurred on a project at a time, and cannot say who did it.
--
-- Deliberately no foreign keys. Events outlive the draft, project or account they describe -
-- a funnel that loses every abandoned preview measures only the people who already
-- succeeded, which is the opposite of what a funnel is for.
CREATE TABLE "Event" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "draftId"   TEXT,
    "projectId" TEXT,
    "userId"    TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Event_name_at_idx" ON "Event"("name", "at");
CREATE INDEX "Event_projectId_name_idx" ON "Event"("projectId", "name");
