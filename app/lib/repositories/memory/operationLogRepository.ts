import type { OperationLogRepository, OperationRecordRow } from "../types";

export class InMemoryOperationLogRepository implements OperationLogRepository {
  private readonly logByPage = new Map<string, OperationRecordRow[]>();

  async append(
    pageId: string,
    records: readonly Omit<OperationRecordRow, "index">[],
    startIndex: number
  ): Promise<void> {
    const existing = this.logByPage.get(pageId) ?? [];
    const appended: OperationRecordRow[] = records.map((record, offset) => ({
      ...record,
      index: startIndex + offset,
    }));
    // Mirrors the Prisma implementation's @@unique([pageId, index]) constraint, so a
    // caller passing a startIndex that would overwrite existing entries fails the same
    // way in tests as it would against a real database, rather than silently producing
    // a log with duplicate indices.
    if (existing.some((entry) => entry.index >= startIndex)) {
      throw new Error(`Operation log for page "${pageId}" already has an entry at index ${startIndex}`);
    }
    this.logByPage.set(pageId, [...existing, ...appended]);
  }

  async list(pageId: string): Promise<OperationRecordRow[]> {
    return [...(this.logByPage.get(pageId) ?? [])];
  }

  async truncateAfter(pageId: string, keepCount: number): Promise<void> {
    const existing = this.logByPage.get(pageId) ?? [];
    this.logByPage.set(pageId, existing.slice(0, keepCount));
  }
}
