import type { RepositoryBundle } from "../types";
import { InMemoryProjectRepository } from "./projectRepository";
import { InMemoryPageRepository } from "./pageRepository";
import { InMemorySectionRepository } from "./sectionRepository";
import { InMemoryOperationLogRepository } from "./operationLogRepository";
import { InMemoryAssetRepository } from "./assetRepository";

export { InMemoryProjectRepository } from "./projectRepository";
export { InMemoryPageRepository } from "./pageRepository";
export { InMemorySectionRepository } from "./sectionRepository";
export { InMemoryOperationLogRepository } from "./operationLogRepository";
export { InMemoryAssetRepository } from "./assetRepository";

// One fresh, independent in-memory store per call - tests should call this once per
// test (never share an instance across tests) to stay isolated from each other, the
// same discipline app/ai/builders/DiversityTracker.ts's resetDiversityHistory() exists
// to enforce for its own module-level state.
export function createInMemoryRepositories(): RepositoryBundle {
  const bundle: RepositoryBundle = {
    projects: new InMemoryProjectRepository(),
    pages: new InMemoryPageRepository(),
    sections: new InMemorySectionRepository(),
    operationLog: new InMemoryOperationLogRepository(),
    assets: new InMemoryAssetRepository(),

    // No isolation and no rollback - an in-memory store has nothing to roll back to,
    // and tests are single-threaded so nothing can observe a partial write anyway. This
    // exists to satisfy the interface so the same service code runs unchanged against
    // both backends; the atomicity it promises is only real in the Prisma bundle. Same
    // honest-limitation stance as InMemoryRateLimiter (app/lib/rateLimit.ts).
    transaction<T>(fn: (repos: RepositoryBundle) => Promise<T>): Promise<T> {
      return fn(bundle);
    },
  };

  return bundle;
}
