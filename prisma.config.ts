import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 config model: connection URL for `prisma migrate`/`prisma generate` lives
// here, not in schema.prisma's datasource block anymore. Application code never reads
// this file - PrismaClient is constructed with an explicit driver adapter instead (see
// app/lib/prisma.ts), which is Prisma 7's required pattern (`new PrismaClient()` with
// no adapter throws).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
