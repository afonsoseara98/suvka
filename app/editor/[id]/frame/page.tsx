import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import Landing from "@/app/components/Landing";
import { repos } from "@/app/lib/repos";
import { loadProject } from "@/app/lib/projectService";
import { currentState } from "@/app/editor/history";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// THE EDITOR'S PHONE PREVIEW, TOLD THE TRUTH
//
// The editor's "mobile" view was a 375px-wide div, which is not a viewport: `sm:` and every
// vw-based clamp() kept resolving against the desktop window. Measured, the opening hours
// sat in three 70px columns inside a 276px box - a layout no phone renders. The preview
// beside the edit surface was showing the owner a page that does not exist.
//
// An iframe has its own viewport, and the same fix already runs on the anonymous preview.
// It could not be used here for one reason: inline editing needs the React tree in the same
// document. So this is the deliberate trade - you EDIT at desktop width, and you CHECK at
// phone width. Checking is what the mobile view was always for.
//
// Renders the project's current cursor state rather than the published snapshot, because
// every edit is persisted the moment it is made; the editor reloads this frame when it has
// something new to show.
export default async function EditorFrame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Ownership, not just a session: this renders an unpublished project by id, so a bare
  // session check would let any signed-in account read any other restaurant's draft site.
  const session = await auth();
  if (!session?.user?.id) notFound();

  const record = await repos.projects.findById(id);
  if (!record || record.ownerId !== session.user.id) notFound();

  const project = await loadProject(repos, id);
  const page = project?.pages[0];
  if (!page) notFound();

  return <Landing state={currentState(page.history)} />;
}
