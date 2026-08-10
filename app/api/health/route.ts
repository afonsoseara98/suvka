import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

// IS THIS DEPLOY ACTUALLY ALIVE?
//
// deploy.sh decided by fetching "/" - the landing page, which is static, touches no database
// and renders perfectly while Postgres is unreachable. A deploy that had broken every
// account and every published site would still have printed "Online" and exited 0.
//
// So this asks the one question that matters: can the process reach its database. Nothing
// else, and nothing expensive - a healthcheck that costs something is a healthcheck somebody
// eventually turns off.
//
// Unauthenticated by necessity, because a monitor cannot sign in - so it says nothing about
// versions, hosts or connection strings. Just yes or no.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Healthcheck failed:", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
