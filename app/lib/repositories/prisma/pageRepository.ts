import { Prisma } from "@prisma/client";
import type { PageRepository, PageRecord, NewPageInput, PublishedSnapshot } from "../types";
import type { PageState } from "@/app/editor/pageState";

interface PageRow {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  cursor: number;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: PageRow): PageRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    slug: row.slug,
    cursor: row.cursor,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaPageRepository implements PageRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  async addPage(input: NewPageInput): Promise<PageRecord> {
    const count = await this.prisma.page.count({ where: { projectId: input.projectId } });
    const row = await this.prisma.page.create({
      data: {
        id: input.id,
        projectId: input.projectId,
        name: input.name,
        slug: input.slug,
        order: count,
        baseState: input.baseState as unknown as Prisma.InputJsonValue,
      },
    });
    return toRecord(row);
  }

  async getPage(pageId: string): Promise<PageRecord | null> {
    const row = await this.prisma.page.findUnique({ where: { id: pageId } });
    return row ? toRecord(row) : null;
  }

  async getBaseState(pageId: string): Promise<PageState | null> {
    const row = await this.prisma.page.findUnique({ where: { id: pageId }, select: { baseState: true } });
    return row ? (row.baseState as unknown as PageState) : null;
  }

  async listPages(projectId: string): Promise<PageRecord[]> {
    const rows = await this.prisma.page.findMany({ where: { projectId }, orderBy: { order: "asc" } });
    return rows.map(toRecord);
  }

  async renamePage(pageId: string, name: string): Promise<void> {
    await this.prisma.page.update({ where: { id: pageId }, data: { name } });
  }

  async reorderPages(projectId: string, pageId: string, toIndex: number): Promise<void> {
    const rows = await this.prisma.page.findMany({ where: { projectId }, orderBy: { order: "asc" } });
    const ids = rows.map((r) => r.id);
    const from = ids.indexOf(pageId);
    if (from === -1) {
      throw new Error(`No page with id "${pageId}" in project "${projectId}"`);
    }
    const next = [...ids];
    next.splice(from, 1);
    const clamped = Math.max(0, Math.min(toIndex, next.length));
    next.splice(clamped, 0, pageId);

    // Sequential rather than an inner $transaction: an interactive transaction client
    // can't open a nested one, and callers that need atomicity wrap this in
    // RepositoryBundle.transaction themselves.
    for (const [order, id] of next.entries()) {
      await this.prisma.page.update({ where: { id }, data: { order } });
    }
  }

  async removePage(pageId: string): Promise<void> {
    await this.prisma.page.delete({ where: { id: pageId } });
  }

  async setCursor(pageId: string, cursor: number): Promise<void> {
    await this.prisma.page.update({ where: { id: pageId }, data: { cursor } });
  }

  // updateMany (not update) because it reports how many rows matched: `where` includes
  // the expected cursor, so a row count of 0 means another writer advanced it first.
  // update() would throw a generic not-found instead, which the caller couldn't
  // distinguish from a genuinely missing page.
  async advanceCursor(pageId: string, expectedCursor: number): Promise<boolean> {
    const { count } = await this.prisma.page.updateMany({
      where: { id: pageId, cursor: expectedCursor },
      data: { cursor: expectedCursor + 1 },
    });
    return count === 1;
  }

  async setPublishedSnapshot(pageId: string, snapshot: PublishedSnapshot | null): Promise<void> {
    await this.prisma.page.update({
      where: { id: pageId },
      data: snapshot
        ? {
            publishedState: snapshot.state as unknown as Prisma.InputJsonValue,
            publishedIndex: snapshot.index,
            publishedAt: snapshot.publishedAt,
          }
        : { publishedState: Prisma.DbNull, publishedIndex: null, publishedAt: null },
    });
  }

  async getPublishedSnapshot(pageId: string): Promise<PublishedSnapshot | null> {
    const row = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { publishedState: true, publishedIndex: true, publishedAt: true },
    });

    if (!row?.publishedState || row.publishedIndex === null || row.publishedAt === null) {
      return null;
    }

    return {
      state: row.publishedState as unknown as PageState,
      index: row.publishedIndex,
      publishedAt: row.publishedAt,
    };
  }
}
