import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
import { prisma } from "@/app/lib/prisma";
import { isOwnPhoto } from "@/app/lib/restaurant/photoLimits";
import { nextActionFor, remainingActions, siteStateFrom } from "@/app/lib/restaurant/nextAction";
import { contradicoesDe } from "@/app/lib/restaurant/contradictions";
import type { GalleryImage } from "@/app/types/landing";
import { createProjectFromGeneration } from "@/app/lib/projectService";
import type { LandingPage } from "@/app/types/landing";
import type { BusinessProfile } from "@/app/ai/types";

// The Dashboard's project list - lean summaries (no pages/sections/operation log), most
// recently edited first, so "Last edited" and search can work without loading every
// project's full state (loadProject/GET /api/projects/[id] is for opening ONE project).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const records = await repos.projects.listByOwner(session.user.id);

  // "O QUE FAÇO HOJE PARA ENCHER MAIS MESAS?"
  //
  // A pergunta que o dono tem quando abre o painel. Respondê-la precisa de saber quantas
  // fotografias DELE estão no site - e essas não são um campo do formulário, são ficheiros
  // que ele carregou, portanto vivem na página publicada.
  //
  // Uma consulta para todos os projectos e não uma por projecto: a lista do painel é o ecrã
  // que ele abre mais vezes, e N+1 consultas aqui seriam N+1 em todas elas.
  const comFormulario = records.filter((r) => r.restaurantInput !== null);
  const paginas = comFormulario.length
    ? await prisma.page.findMany({
        where: { projectId: { in: comFormulario.map((r) => r.id) } },
        select: { projectId: true, publishedState: true },
      })
    : [];

  // Só contam as fotografias dele. Um site com seis imagens de banco tem zero, e é
  // exactamente essa a acção que falta.
  const fotografias = new Map<string, number>();
  for (const pagina of paginas) {
    const estado = pagina.publishedState as { gallery?: GalleryImage[] } | null;
    fotografias.set(pagina.projectId, (estado?.gallery ?? []).filter((imagem) => isOwnPhoto(imagem.url)).length);
  }

  const projects = records
    .map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      // Whether the site is actually online, and where. The list carried neither, so the
      // dashboard could not say the one thing an owner opens it to check, and the address
      // of his own website was two clicks away inside the editor.
      published: r.settings.publishing.published,
      slug: r.slug,
      // null quando não há nada a apontar, e o painel não desenha bloco nenhum. Um painel
      // que inventa uma tarefa para ter o que dizer ensina o dono a ignorá-lo.
      ...nextActionSummary(r.restaurantInput, fotografias.get(r.id) ?? 0),
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return NextResponse.json({ projects });
}

function nextActionSummary(input: Parameters<typeof siteStateFrom>[0] | null, fotografiasProprias: number) {
  if (!input) return { nextAction: null, remaining: 0 };
  const estado = siteStateFrom(input, fotografiasProprias);
  const contradicoes = contradicoesDe(input, fotografiasProprias);
  return { nextAction: nextActionFor(estado, contradicoes), remaining: remainingActions(estado, contradicoes) };
}

// Persists a Project from a just-generated LandingPage - the seam between /api/generate
// (unchanged, still just LLM+pipeline output, no auth/persistence concerns) and the
// editable, durable model (see app/lib/projectService.ts's createProjectFromGeneration).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const landing = body?.landing as LandingPage | undefined;
    const businessProfile = body?.businessProfile as BusinessProfile | undefined;
    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Untitled Project";

    if (!landing || !businessProfile) {
      return NextResponse.json({ success: false, message: "landing and businessProfile are required." }, { status: 400 });
    }

    const project = await createProjectFromGeneration(repos, session.user.id, landing, businessProfile, {
      name,
      pageName: typeof body?.pageName === "string" ? body.pageName : undefined,
      pageSlug: typeof body?.pageSlug === "string" ? body.pageSlug : undefined,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Something went wrong while saving the project." }, { status: 500 });
  }
}
