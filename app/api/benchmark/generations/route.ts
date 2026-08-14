import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/app/lib/admin";
import { benchmarkStore } from "@/app/benchmark/storeInstance";

export async function GET(request: Request) {
  const session = await auth();
  // FERRAMENTA INTERNA, E ESTAS ROTAS GASTAM DINHEIRO
  //
  // Verificava-se que havia sessao e nao QUEM era. O registo e aberto, portanto qualquer conta
  // podia disparar geracoes que fazem chamadas pagas a modelos. Ver app/lib/admin.ts.
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ success: false, message: "businessId query param is required." }, { status: 400 });
  }

  const generations = await benchmarkStore.listGenerations(businessId);
  return NextResponse.json({ generations });
}
