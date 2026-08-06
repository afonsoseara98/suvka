import { prisma } from "./prisma";
import { createPrismaRepositories } from "./repositories/prisma";

// The one place API routes get a RepositoryBundle from - never construct one ad hoc in
// a route handler. Swapping the Prisma-backed bundle for something else (a future
// caching layer, a different database) touches this file only.
export const repos = createPrismaRepositories(prisma);
