import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
import { loadProject, deleteProject } from "@/app/lib/projectService";
import type { ProjectRecord } from "@/app/lib/repositories/types";

// Shared by every handler below - the same ownership check (never a bare 403, always a
// 404, so a project's existence isn't leaked to a non-owner) repeated identically at
// every access point that touches one specific project by id.
async function requireOwnedProject(id: string, userId: string): Promise<ProjectRecord | NextResponse> {
  const record = await repos.projects.findById(id);
  if (!record || record.ownerId !== userId) {
    return NextResponse.json({ success: false, message: "Project not found." }, { status: 404 });
  }
  return record;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;

  const record = await requireOwnedProject(id, session.user.id);
  if (record instanceof NextResponse) return record;

  const project = await loadProject(repos, id);

  // `slug` lives on the persistence record, not on the pure domain Project (which stays
  // agnostic of hosting concerns, same reasoning as ownerId - see the blueprint's ADR on
  // authorization being an API-layer concern). The editor needs it to show the live URL,
  // so it is merged in here rather than pushed down into app/editor/project.ts.
  return NextResponse.json({ ...project, slug: record.slug });
}

// Rename only, for now - businessProfile/brand/settings already have their own update
// paths (generation, publishing) and don't belong on this ad-hoc PATCH surface.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;

  const record = await requireOwnedProject(id, session.user.id);
  if (record instanceof NextResponse) return record;

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ success: false, message: "name is required." }, { status: 400 });
  }

  const updated = await repos.projects.update(id, { name });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;

  const record = await requireOwnedProject(id, session.user.id);
  if (record instanceof NextResponse) return record;

  await deleteProject(repos, id);
  return NextResponse.json({ success: true });
}
