import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { EVENT_NAMES } from "@/app/lib/events";

// COUNTING IS WORTHLESS UNTIL SOMEBODY CAN READ IT
//
// Events with no way to see them are a table that grows and teaches nothing. This is the
// smallest possible reader: one count per event name over a window.
//
// Behind sign-in, because these numbers are the product's own vitals. Not per-user though -
// they are the whole funnel across every restaurant, which is the question being asked
// ("100 previews, 83 publish, 42 signup"). Per-restaurant numbers are a different screen for
// a different reader, and that reader is the owner.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Inicie sessão." }, { status: 401 });
  }

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days") ?? 30), 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.event.groupBy({
    by: ["name"],
    where: { at: { gte: since } },
    _count: { name: true },
  });

  const counts = Object.fromEntries(rows.map((row) => [row.name, row._count.name]));

  // Every known name present, zeros included. A funnel with missing keys reads as a gap in
  // the product rather than as a step nobody reached.
  return NextResponse.json({
    days,
    counts: Object.fromEntries(EVENT_NAMES.map((name) => [name, counts[name] ?? 0])),
  });
}
