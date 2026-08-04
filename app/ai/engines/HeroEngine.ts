import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { StrategyDNA } from "../types/dna";
import { clamp01 } from "../utils/math";

// HERO ENGINE
//
// Every field here used to be a category (DesignPlanner.ts's per-industry heroVariant,
// or HeroStrategy's headlineLength/imagery/whitespace/proofPlacement enums). Each is now
// a continuous 0-1 value computed directly from BusinessIntelligenceProfile - the
// compiler (app/styles/theme.ts / layout.ts) decides how a given value actually
// renders (a splitLean of 0.9 vs 0.4 is a genuinely different grid-template-columns
// split, not a snap to one of three pre-authored layouts). Unlike the other three
// engines, hero framing turns out to depend only on the business's own profile, not on
// the psychology/offer-derived CompositionSignals blend.

export type HeroDNA = Pick<StrategyDNA, "heroSplitLean" | "heroImageryProminence" | "emotionalIntensity">;

export function resolveHeroDNA(bi: BusinessIntelligenceProfile): HeroDNA {
  // How much the hero needs a supporting visual/data panel beside the copy, versus
  // standing alone - complex, custom offers earn the extra real estate; a very premium
  // positioning pulls back toward restraint even if the offer is somewhat complex.
  const heroSplitLean = clamp01(0.3 + bi.decisionComplexity * 0.4 + bi.offerComplexity * 0.3 - bi.pricePositioning * 0.2);

  const heroImageryProminence = clamp01(bi.visualImportance * 0.7 + bi.emotionalVsRational * 0.3);

  return {
    heroSplitLean,
    heroImageryProminence,
    emotionalIntensity: bi.emotionalVsRational,
  };
}
