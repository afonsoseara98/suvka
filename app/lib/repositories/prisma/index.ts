import type { Prisma, PrismaClient } from "@prisma/client";
import type { RepositoryBundle } from "../types";
import { PrismaProjectRepository } from "./projectRepository";
import { PrismaPageRepository } from "./pageRepository";
import { PrismaSectionRepository } from "./sectionRepository";
import { PrismaOperationLogRepository } from "./operationLogRepository";
import { PrismaAssetRepository } from "./assetRepository";

export { PrismaProjectRepository } from "./projectRepository";
export { PrismaPageRepository } from "./pageRepository";
export { PrismaSectionRepository } from "./sectionRepository";
export { PrismaOperationLogRepository } from "./operationLogRepository";
export { PrismaAssetRepository } from "./assetRepository";

// Every repository is constructed against a Prisma.TransactionClient rather than the
// full PrismaClient, which is what lets the exact same classes serve both the normal
// (auto-commit) path and the inside-a-transaction path - a full PrismaClient satisfies
// TransactionClient structurally, an interactive transaction client does not satisfy
// PrismaClient. That asymmetry is the whole reason for the direction of this typing.
function bundleFor(client: Prisma.TransactionClient, inTransaction: boolean): RepositoryBundle {
  return {
    projects: new PrismaProjectRepository(client),
    pages: new PrismaPageRepository(client),
    sections: new PrismaSectionRepository(client),
    operationLog: new PrismaOperationLogRepository(client),
    assets: new PrismaAssetRepository(client),

    // Nested transaction() is a no-op that reuses the current one: Prisma's interactive
    // transaction client has no $transaction of its own, and re-entering would deadlock
    // against the connection the outer transaction already holds. Reusing it keeps
    // "wrap anything transactional in transaction()" safe to apply everywhere without
    // callers having to know whether they're already inside one.
    transaction<T>(fn: (repos: RepositoryBundle) => Promise<T>): Promise<T> {
      if (inTransaction) {
        return fn(bundleFor(client, true));
      }
      return (client as PrismaClient).$transaction((tx) => fn(bundleFor(tx, true)));
    },
  };
}

export function createPrismaRepositories(prisma: PrismaClient): RepositoryBundle {
  return bundleFor(prisma, false);
}
