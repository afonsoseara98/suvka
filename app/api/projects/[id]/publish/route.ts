import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { repos } from "@/app/lib/repos";
import { publishProject, unpublishProject } from "@/app/lib/publishService";

// Publishing is the one action that makes a project visible to people who are not its
// owner, so ownership is checked exactly the way every other project route checks it:
// a 404 (never a 403) for anything the caller doesn't own, so the endpoint can't be used
// to discover which project ids exist.
async function requireOwnership(id: string, userId: string): Promise<NextResponse | null> {
  const record = await repos.projects.findById(id);
  if (!record || record.ownerId !== userId) {
    return NextResponse.json({ success: false, message: "Project not found." }, { status: 404 });
  }
  return null;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const denied = await requireOwnership(id, session.user.id);
  if (denied) return denied;

  try {
    const { slug, publishedAt } = await publishProject(repos, id);
    return NextResponse.json({ slug, url: `/s/${slug}`, publishedAt: publishedAt.toISOString() });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Something went wrong while publishing this site." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const denied = await requireOwnership(id, session.user.id);
  if (denied) return denied;

  try {
    await unpublishProject(repos, id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Something went wrong while taking this site offline." },
      { status: 500 }
    );
  }
}
