import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

import Landing from "@/app/components/Landing";
import { fromLandingPage } from "@/app/editor/pageState";
import { BENCHMARK_BUSINESSES } from "@/app/benchmark/businesses";
import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";
import { deriveVisualIntent } from "@/app/ai/builders/VisualIntelligence";
import { createImageProvider, resolveImageSafely } from "@/app/lib/images";
import type { LandingPage } from "@/app/types/landing";

// OUTPUT QUALITY HARNESS - development only, never part of a deployment.
//
// The quality loop is "change something, look at all 20 businesses, decide if it got
// better". Regenerating copy for that loop would spend 20 paid LLM calls per design tweak
// to rewrite text that is not what is being judged - and would change the copy underneath
// the comparison, so two screenshots would differ for reasons unrelated to the change.
//
// Instead this renders the copy ALREADY generated and stored in benchmark-results/ (real
// model output, captured once) through the current renderer, with the deterministic parts
// of the pipeline recomputed live. So the text is held constant and every visual change is
// attributable. Cost per iteration: zero LLM calls.
export const dynamic = "force-dynamic";

interface StoredGeneration {
  source: string;
  landingPage: LandingPage;
}

function readStoredNoctraPage(businessId: string): LandingPage | null {
  const file = path.join(process.cwd(), "benchmark-results", `${businessId}.json`);
  if (!fs.existsSync(file)) return null;

  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { generations?: StoredGeneration[] };
  const record = parsed.generations?.find((generation) => generation.source === "noctra");
  return record?.landingPage ?? null;
}

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { id } = await params;
  const business = BENCHMARK_BUSINESSES.find((candidate) => candidate.id === id);
  const stored = business ? readStoredNoctraPage(id) : null;
  if (!business || !stored) notFound();

  // The pipeline is deterministic, so everything except the copy is recomputed from the
  // original briefing rather than read from the stored file. That is the point: it means
  // this page always reflects the CURRENT pipeline, which is what is being evaluated.
  const pipeline = buildPipeline(business.prompt);
  const visual = deriveVisualIntent(pipeline.businessProfile, pipeline.businessIntelligence, pipeline.dna);
  const image = await resolveImageSafely(createImageProvider(), visual);

  const landing: LandingPage = {
    ...stored,
    dna: pipeline.dna,
    sections: [...pipeline.sections],
    site:
      stored.site ??
      ({
        seo: { title: business.label, description: "", keywords: [], ogTitle: "", ogDescription: "" },
        branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
        images: { heroPrompt: "", ogImagePrompt: "" },
      } as LandingPage["site"]),
    hero: { ...stored.hero, imageStyle: visual.scene, visual, image },
  };

  return <Landing state={fromLandingPage(landing)} />;
}
