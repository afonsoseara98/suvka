import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { StrategyDNA } from "../types/dna";
import { clamp01 } from "../utils/math";

// PRICING ENGINE
//
// Distinct from LayoutIntelligence.ts's decision of whether a pricing section appears
// at all (structural, unchanged - see sectionWeight.pricing). This engine decides how
// price is PRESENTED within whichever pricing section already exists - continuously
// (exact numbers vs custom quote is now a lean, not a binary choice; anchoring is a
// strength, not a boolean).

export type PricingDNA = Pick<StrategyDNA, "priceEmphasis" | "priceAnchoring" | "priceComplexityLean">;

export function resolvePricingDNA(bi: BusinessIntelligenceProfile, signals: CompositionSignals): PricingDNA {
  const priceComplexityLean = clamp01(bi.offerComplexity * 0.5 + bi.decisionComplexity * 0.5);

  // Anchoring (showing a higher-tier comparison to make the target price look
  // reasonable) is a premium-market tactic that stops making sense once the offer is
  // presented as a custom quote rather than a fixed set of tiers - scaled down rather
  // than switched off, so the lean itself stays legible in the DNA.
  const priceAnchoring = clamp01(bi.pricePositioning * (1 - priceComplexityLean * 0.7));

  // A continuous blend rather than a threshold: high price positioning pulls toward
  // understated (0), high price sensitivity pulls toward prominent (1) - both
  // contribute at once instead of one gating the other.
  const priceEmphasis = clamp01(signals.priceSensitivity * 0.6 + (1 - bi.pricePositioning) * 0.4);

  return {
    priceEmphasis,
    priceAnchoring,
    priceComplexityLean,
  };
}
