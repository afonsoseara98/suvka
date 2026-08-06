-- AlterTable: public URL segment for a published project.
-- Nullable so drafts never occupy a name they may never publish; globally unique
-- because /s/<slug> is a public namespace shared by every account.
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- AlterTable: the published version of a page, as a materialized snapshot rather than
-- a pointer into the operation log. See prisma/schema.prisma's comment on these columns
-- for why: serving a public page must be one row read, not a replay whose cost grows
-- with how much the owner has edited since.
ALTER TABLE "Page" ADD COLUMN "publishedState" JSONB;
ALTER TABLE "Page" ADD COLUMN "publishedIndex" INTEGER;
ALTER TABLE "Page" ADD COLUMN "publishedAt" TIMESTAMP(3);
