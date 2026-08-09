import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Landing from "@/app/components/Landing";
import { fromLandingPage } from "@/app/editor/pageState";
import { draftStore } from "@/app/lib/restaurant/draftStore";

export const dynamic = "force-dynamic";

// THE SITE ON ITS OWN, SO A PHONE PREVIEW CAN BE A PHONE
//
// The preview used to put the site in a 375px-wide div and call it a phone. It is not one:
// media queries and vw units resolve against the viewport, and the viewport was still the
// 1536px desktop window. So `sm:grid-cols-3` stayed on inside a 276px box and the opening
// hours - the single most looked-up thing on a restaurant's site - rendered as three 70px
// columns breaking "Take-away" across two lines. No phone has ever shown that page. The
// owner was being shown a broken layout that did not exist, on the exact view the whole
// pitch points at ("no telemóvel dos seus clientes").
//
// An iframe has its own viewport. That is the entire reason this route exists: it renders
// nothing but the restaurant's site, so PublishBar can load it 375px wide and have every
// breakpoint resolve the way it will in someone's hand.
//
// Never indexed - it is an unpublished draft, same as its parent.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function DraftPreviewFrame({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const draft = await draftStore.get(draftId);

  // Expired and never-existed answer the same way, as everywhere else a draft id is read.
  if (!draft) notFound();

  return <Landing state={fromLandingPage(draft.landing)} />;
}
