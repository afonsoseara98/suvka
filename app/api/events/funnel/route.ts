import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { EVENT_NAMES } from "@/app/lib/events";
import { funnelByOrigin } from "@/app/lib/funnel";

// COUNTING IS WORTHLESS UNTIL SOMEBODY CAN READ IT
//
// Events with no way to see them are a table that grows and teaches nothing.
//
// Esta rota já dizia isto e continuava a agrupar só por nome do evento: "100
// pré-visualizações, 42 publicações". Útil, e incapaz de responder à única pergunta que
// decide onde gastar dinheiro — QUAL DELES veio de onde. Um canal que traz cem curiosos e um
// que traz dez restaurantes a sério davam o mesmo número, e o segundo parecia dez vezes pior.
//
// Behind sign-in, because these numbers are the product's own vitals. Not per-user though -
// they are the whole funnel across every restaurant. Per-restaurant numbers are a different
// screen for a different reader, and that reader is the owner.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Inicie sessão." }, { status: 401 });
  }

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days") ?? 30), 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // UM TECTO, PORQUE ISTO LÊ LINHAS E NÃO AGREGA NA BASE
  //
  // A junção entre a origem e o resto do funil faz-se pelo `draftId`, e o Postgres não a faz
  // sozinho sem uma consulta sobre JSON que seria pior de ler do que isto. Com o volume
  // actual - dezenas de linhas - carregar é trivial.
  //
  // O tecto existe para o dia em que não for: melhor um relatório truncado e explícito do que
  // um pedido que demora trinta segundos e ninguém percebe porquê. Quando bater no limite, a
  // resposta certa é agregar na base, não subir o número.
  const LIMITE = 50_000;

  const eventos = await prisma.event.findMany({
    where: { at: { gte: since }, name: { in: [...EVENT_NAMES] } },
    select: { name: true, draftId: true, details: true },
    orderBy: { at: "asc" },
    take: LIMITE,
  });

  const porOrigem = funnelByOrigin(eventos);

  return NextResponse.json({
    days,
    truncado: eventos.length === LIMITE,
    // O total por passo continua cá: é a leitura de cima, e é a que diz se o produto no seu
    // conjunto está a converter, independentemente de onde a gente veio.
    totais: Object.fromEntries(
      EVENT_NAMES.map((nome) => [nome, porOrigem.reduce((soma, linha) => soma + linha.passos[nome], 0)])
    ),
    origens: porOrigem,
  });
}
