import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Landing from "@/app/components/Landing";
import { fromLandingPage } from "@/app/editor/pageState";
import { draftStore } from "@/app/lib/restaurant/draftStore";
import PublishBar from "./PublishBar";

export const dynamic = "force-dynamic";

// Never indexed. This is somebody's unpublished draft at a URL they have not chosen, and a
// search engine holding a copy of it - or of an abandoned one - is a URL the owner never
// agreed to and cannot take down.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function DraftPreview({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const draft = await draftStore.get(draftId);

  // Expired and never-existed are the same answer on purpose: a different response for a
  // real-but-expired id would confirm that the id was once valid.
  if (!draft) notFound();

  return (
    <>
      {/* The bar is the only thing on the page that is not the restaurant's own site. It
          sits above rather than inside, so what the owner is judging is exactly what a
          customer would see. */}
      <PublishBar draftId={draft.id} name={draft.input.name} />
      <Landing state={fromLandingPage(draft.landing)} />
    </>
  );
}
