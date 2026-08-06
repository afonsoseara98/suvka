import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
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
  const projects = records
    .map((r) => ({ id: r.id, name: r.name, createdAt: r.createdAt, updatedAt: r.updatedAt }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return NextResponse.json({ projects });
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
