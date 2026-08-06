import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
import { dispatchAndPersist, ConflictError } from "@/app/lib/projectService";
import { validateOperations } from "@/app/lib/validateOperations";
import { OperationError } from "@/app/editor/operations";

// The durability write for an operation the client already applied optimistically and
// instantly via its own local applyOperation() call (see
// docs/editor-architecture-report.md) - this route's job is "make it survive a reload,"
// not "produce the UI update."
export async function POST(request: Request, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const { id: projectId, pageId } = await params;

  const project = await repos.projects.findById(projectId);
  if (!project || project.ownerId !== session.user.id) {
    return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
  }

  const page = await repos.pages.getPage(pageId);
  if (!page || page.projectId !== projectId) {
    return NextResponse.json({ success: false, message: "Page not found in this project." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const validation = validateOperations(body?.operations);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    }

    const actor = body?.actor === "ai" ? "ai" : "user";
    const label = typeof body?.label === "string" ? body.label : undefined;

    const sections = await dispatchAndPersist(repos, pageId, validation.operations, actor, label);
    return NextResponse.json({ sections });
  } catch (error: unknown) {
    // 409, not 500: the operation was valid, it just lost a race with another write to
    // the same page. The client's correct response is to reload and reapply, which is a
    // different recovery from "this change was rejected" (400) or "we broke" (500).
    if (error instanceof ConflictError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 409 });
    }
    if (error instanceof OperationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ success: false, message: "Something went wrong while saving the change." }, { status: 500 });
  }
}
