import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/app/lib/admin";
import { buildReport } from "@/app/benchmark/scoring";
import { benchmarkStore } from "@/app/benchmark/storeInstance";

export async function GET() {
  const session = await auth();
  // FERRAMENTA INTERNA, E ESTAS ROTAS GASTAM DINHEIRO
  //
  // Verificava-se que havia sessao e nao QUEM era. O registo e aberto, portanto qualquer conta
  // podia disparar geracoes que fazem chamadas pagas a modelos. Ver app/lib/admin.ts.
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const scores = await benchmarkStore.listScores();
  return NextResponse.json(buildReport(scores));
}
