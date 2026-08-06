import type { PageRepository, PageRecord, NewPageInput, PublishedSnapshot } from "../types";
import type { PageState } from "@/app/editor/pageState";

export class InMemoryPageRepository implements PageRepository {
  private readonly pages = new Map<string, PageRecord>();
  private readonly baseStates = new Map<string, PageState>();
  private readonly published = new Map<string, PublishedSnapshot>();
  // Order is a project-scoped concern a plain Map<id, record> can't express - tracked
  // separately, mirroring how the Prisma implementation would use an `order` column.
  private readonly orderByProject = new Map<string, string[]>();

  async addPage(input: NewPageInput): Promise<PageRecord> {
    if (this.pages.has(input.id)) {
      throw new Error(`Page id "${input.id}" already exists`);
    }
    const now = new Date();
    const record: PageRecord = {
      id: input.id,
      projectId: input.projectId,
      name: input.name,
      slug: input.slug,
      cursor: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.pages.set(record.id, record);
    this.baseStates.set(record.id, JSON.parse(JSON.stringify(input.baseState)));
    const order = this.orderByProject.get(input.projectId) ?? [];
    this.orderByProject.set(input.projectId, [...order, record.id]);
    return record;
  }

  async getPage(pageId: string): Promise<PageRecord | null> {
    return this.pages.get(pageId) ?? null;
  }

  async getBaseState(pageId: string): Promise<PageState | null> {
    const state = this.baseStates.get(pageId);
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }

  async listPages(projectId: string): Promise<PageRecord[]> {
    const order = this.orderByProject.get(projectId) ?? [];
    return order.map((id) => this.pages.get(id)).filter((p): p is PageRecord => p !== undefined);
  }

  async renamePage(pageId: string, name: string): Promise<void> {
    const existing = this.requirePage(pageId);
    this.pages.set(pageId, { ...existing, name, updatedAt: new Date() });
  }

  async reorderPages(projectId: string, pageId: string, toIndex: number): Promise<void> {
    const order = this.orderByProject.get(projectId) ?? [];
    const index = order.indexOf(pageId);
    if (index === -1) {
      throw new Error(`No page with id "${pageId}" in project "${projectId}"`);
    }
    const next = [...order];
    next.splice(index, 1);
    const clamped = Math.max(0, Math.min(toIndex, next.length));
    next.splice(clamped, 0, pageId);
    this.orderByProject.set(projectId, next);
  }

  async removePage(pageId: string): Promise<void> {
    const existing = this.requirePage(pageId);
    this.pages.delete(pageId);
    this.baseStates.delete(pageId);
    const order = this.orderByProject.get(existing.projectId) ?? [];
    this.orderByProject.set(
      existing.projectId,
      order.filter((id) => id !== pageId)
    );
  }

  async setCursor(pageId: string, cursor: number): Promise<void> {
    const existing = this.requirePage(pageId);
    this.pages.set(pageId, { ...existing, cursor, updatedAt: new Date() });
  }

  // Same contract as the Prisma implementation's conditional UPDATE, minus the real
  // concurrency (a single-threaded in-memory store can't race with itself) - it exists
  // here so the conflict branch in projectService.ts is reachable and testable without
  // a database.
  async advanceCursor(pageId: string, expectedCursor: number): Promise<boolean> {
    const existing = this.pages.get(pageId);
    if (!existing || existing.cursor !== expectedCursor) return false;
    this.pages.set(pageId, { ...existing, cursor: expectedCursor + 1, updatedAt: new Date() });
    return true;
  }

  async setPublishedSnapshot(pageId: string, snapshot: PublishedSnapshot | null): Promise<void> {
    if (snapshot === null) {
      this.published.delete(pageId);
      return;
    }
    // Deep-copied like baseState above: a published snapshot must never alias the live
    // editing state, or an edit would silently change what visitors already see.
    this.published.set(pageId, { ...snapshot, state: JSON.parse(JSON.stringify(snapshot.state)) });
  }

  async getPublishedSnapshot(pageId: string): Promise<PublishedSnapshot | null> {
    const snapshot = this.published.get(pageId);
    return snapshot ? { ...snapshot, state: JSON.parse(JSON.stringify(snapshot.state)) } : null;
  }

  private requirePage(pageId: string): PageRecord {
    const existing = this.pages.get(pageId);
    if (!existing) {
      throw new Error(`No page with id "${pageId}"`);
    }
    return existing;
  }
}
