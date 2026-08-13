import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { repos } from "@/app/lib/repos";
import { ACTIVITY_EVENTS, type ActivityCounts } from "@/app/lib/siteActivity";

// O QUE O SITE DESTE RESTAURANTE FEZ, PARA O DONO DELE
//
// O `/api/events/funnel` responde à nossa pergunta - quantos previews viraram publicações,
// em todo o produto. Esta responde à dele: quantas pessoas ligaram para a casa dele.
// O comentário daquele ficheiro já previa esta: "per-restaurant numbers are a different
// screen for a different reader, and that reader is the owner."
//
// O `@@index([projectId, name])` existe no schema desde que os eventos existem. Isto é a
// consulta que ele estava à espera.
//
// Só o dono do projecto, e 404 e não 403 para um estranho - a mesma regra do resto da API:
// um 403 confirma que o projecto existe.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Inicie sessão." }, { status: 401 });
  }

  const { id } = await params;

  const record = await repos.projects.findById(id);
  if (!record || record.ownerId !== session.user.id) {
    return NextResponse.json({ success: false, message: "Project not found." }, { status: 404 });
  }

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days") ?? 30), 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.event.groupBy({
    by: ["name"],
    where: { projectId: id, at: { gte: since }, name: { in: [...ACTIVITY_EVENTS] } },
    _count: { name: true },
  });

  const counts = Object.fromEntries(rows.map((row) => [row.name, row._count.name]));

  return NextResponse.json({
    days,
    // Todos os nomes presentes, zeros incluídos. Quem lê decide o que faz com um zero - e o
    // que faz, hoje, é não o mostrar (ver app/lib/siteActivity.ts).
    counts: Object.fromEntries(ACTIVITY_EVENTS.map((name) => [name, counts[name] ?? 0])) as unknown as ActivityCounts,
  });
}
