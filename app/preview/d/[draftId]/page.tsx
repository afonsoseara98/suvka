import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Landing from "@/app/components/Landing";
import { fromLandingPage } from "@/app/editor/pageState";
import { draftStore } from "@/app/lib/restaurant/draftStore";
import PublishBar from "./PublishBar";
import PhotoManager from "./PhotoManager";

export const dynamic = "force-dynamic";

// The whole point of this URL is that it gets sent to somebody - a business partner, a
// husband, the person who works the floor. Whatever WhatsApp or Messenger shows in the link
// card IS the first impression, and it was showing "Noctra - AI Conversion System": our
// product name, in English, in SaaS language, on what is supposed to be their restaurant.
//
// Never indexed, though. This is an unpublished draft at a URL the owner did not choose,
// and a search engine holding a copy of it - or of an abandoned one - is a page they never
// agreed to and cannot take down.
export async function generateMetadata({ params }: { params: Promise<{ draftId: string }> }): Promise<Metadata> {
  const { draftId } = await params;
  const draft = await draftStore.get(draftId);
  const robots = { index: false, follow: false, nocache: true } as const;

  if (!draft) return { title: "Pré-visualização expirada", robots };

  const seo = draft.landing.site?.seo;
  return {
    title: seo?.title || draft.input.name,
    description: seo?.description,
    robots,
    openGraph: {
      title: seo?.ogTitle || draft.input.name,
      description: seo?.ogDescription || seo?.description,
      type: "website",
    },
  };
}

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
      <PublishBar draftId={draft.id} name={draft.input.name}>
        {/* The last thing on the page that belonged to somebody else. Until an owner can
            put their own dish here, every preview is a demo. */}
        <PhotoManager draftId={draft.id} gallery={draft.landing.gallery ?? []} />
        <Landing state={fromLandingPage(draft.landing)} />
      </PublishBar>
    </>
  );
}
