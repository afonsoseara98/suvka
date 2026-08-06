import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton PrismaClient, cached on `globalThis` in dev. Next.js hot-reloads modules on
// every file save; without this guard, each reload would construct a brand new
// PrismaClient (and a new underlying connection pool) instead of reusing one, quickly
// exhausting the database's connection limit. Standard Next.js + Prisma pattern.
//
// Prisma 7 requires an explicit driver adapter (no more implicit `url` resolution from
// schema.prisma - see prisma.config.ts's header comment) - PrismaPg wraps `pg` (node-
// postgres), which works against both a local Postgres and a hosted one (Neon/Supabase
// included, over their Postgres-compatible connection string).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
