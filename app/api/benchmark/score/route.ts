import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/app/lib/admin";
import { BENCHMARK_CRITERIA, BENCHMARK_SOURCES, type ScoreRecord } from "@/app/benchmark/types";
import { benchmarkStore } from "@/app/benchmark/storeInstance";

function isValidScore(body: unknown): body is Omit<ScoreRecord, "scoredAt"> {
  if (typeof body !== "object" || body === null) return false;
  const record = body as Record<string, unknown>;
  return (
    typeof record.businessId === "string" &&
    (BENCHMARK_SOURCES as readonly string[]).includes(record.source as string) &&
    typeof record.criterion === "string" &&
    (BENCHMARK_CRITERIA as readonly string[]).includes(record.criterion) &&
    typeof record.score === "number" &&
    record.score >= 0 &&
    record.score <= 10
  );
}

// Accepts either a single score or an array (the review UI submits all 12 criteria for
// a business at once).
export async function POST(request: Request) {
  const session = await auth();
  // FERRAMENTA INTERNA, E ESTAS ROTAS GASTAM DINHEIRO
  //
  // Verificava-se que havia sessao e nao QUEM era. O registo e aberto, portanto qualquer conta
  // podia disparar geracoes que fazem chamadas pagas a modelos. Ver app/lib/admin.ts.
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const items = Array.isArray(body) ? body : [body];

  if (!items.every(isValidScore)) {
    return NextResponse.json(
      { success: false, message: "Each score must have businessId, source, criterion (one of the 12), and a score 0-10." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  try {
    await Promise.all(items.map((item) => benchmarkStore.saveScore({ ...item, scoredAt: now })));
    return NextResponse.json({ saved: items.length });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Something went wrong while saving scores." }, { status: 500 });
  }
}
