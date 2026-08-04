import { generateLayout } from "./LayoutIntelligence";
import type { LandingComposition } from "../types/composition";
import type { CompositionSignals } from "../types/signals";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";

// LandingComposition is the stable pipeline-facing name for this stage -
// PipelineBuilder.ts depends on `buildLandingComposition`, not on how composition is
// actually decided. The decision itself lives in LayoutIntelligence.ts's generative
// engine: no per-archetype (or per-anything-categorical) table of full page structures
// lives here, or anywhere, anymore.
export function buildLandingComposition(
  bi: BusinessIntelligenceProfile,
  signals: CompositionSignals,
  heroSplitLean: number,
  priceEmphasis: number
): LandingComposition {
  return generateLayout(bi, signals, heroSplitLean, priceEmphasis);
}
