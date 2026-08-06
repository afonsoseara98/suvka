import type { Prisma } from "@prisma/client";
import type { OperationLogRepository, OperationRecordRow } from "../types";
import type { Operation } from "@/app/editor/operations";

interface OperationLogRow {
  index: number;
  operations: unknown;
  actor: string;
  label: string | null;
  timestamp: Date;
}

function toRow(row: OperationLogRow): OperationRecordRow {
  return {
    index: row.index,
    operations: row.operations as readonly Operation[],
    actor: row.actor as "user" | "ai",
    label: row.label ?? undefined,
    timestamp: row.timestamp.getTime(),
  };
}

export class PrismaOperationLogRepository implements OperationLogRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  // No COUNT here on purpose - see OperationLogRepository.append's contract. The index
  // comes from the caller (the page's cursor), which removes the read-modify-write race
  // the old count-then-insert had. createMany is a single statement; the caller is
  // already inside a transaction with the truncate and the cursor advance.
  async append(
    pageId: string,
    records: readonly Omit<OperationRecordRow, "index">[],
    startIndex: number
  ): Promise<void> {
    if (records.length === 0) return;

    await this.prisma.operationLogEntry.createMany({
      data: records.map((record, offset) => ({
        pageId,
        index: startIndex + offset,
        operations: record.operations as unknown as object,
        actor: record.actor,
        label: record.label ?? null,
        timestamp: new Date(record.timestamp),
      })),
    });
  }

  async list(pageId: string): Promise<OperationRecordRow[]> {
    const rows = await this.prisma.operationLogEntry.findMany({ where: { pageId }, orderBy: { index: "asc" } });
    return rows.map(toRow);
  }

  async truncateAfter(pageId: string, keepCount: number): Promise<void> {
    await this.prisma.operationLogEntry.deleteMany({ where: { pageId, index: { gte: keepCount } } });
  }
}
