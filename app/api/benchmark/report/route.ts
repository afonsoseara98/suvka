import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildReport } from "@/app/benchmark/scoring";
import { benchmarkStore } from "@/app/benchmark/storeInstance";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const scores = await benchmarkStore.listScores();
  return NextResponse.json(buildReport(scores));
}
