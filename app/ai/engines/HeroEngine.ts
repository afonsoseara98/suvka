import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { HeroStrategy, HeadlineLength, HeroImagery, Whitespace, ProofPlacement } from "../types/strategy";

// HERO ENGINE
//
// Every field here used to be either hardcoded (DesignPlanner.ts's per-industry
// heroVariant) or not decided at all (headline length, whitespace density, proof
// placement were left entirely to the LLM's judgment, with no structured input). Each
// is now a small, explainable threshold rule over BusinessIntelligenceProfile/
// CompositionSignals - no industry, no giant lookup table, and each rule is
// independently testable (see HeroEngine.test.ts).

function resolveHeadlineLength(bi: BusinessIntelligenceProfile, signals: CompositionSignals): HeadlineLength {
  if (bi.decisionComplexity >= 0.6 || bi.trustDifficulty >= 0.6) return "long";
  if (signals.urgency >= 0.6) return "short";
  return "medium";
}

function resolveImagery(bi: BusinessIntelligenceProfile): HeroImagery {
  if (bi.visualImportance >= 0.6 && bi.emotionalVsRational >= 0.5) return "immersive";
  if (bi.offerComplexity >= 0.6 || bi.decisionComplexity >= 0.6) return "data-focused";
  if (bi.visualImportance >= 0.5) return "product-focused";
  return "minimal";
}

function resolveWhitespace(bi: BusinessIntelligenceProfile, signals: CompositionSignals): Whitespace {
  if (bi.pricePositioning >= 0.65) return "airy";
  if (signals.urgency >= 0.6 && bi.decisionComplexity <= 0.4) return "dense";
  return "balanced";
}

function resolveProofPlacement(signals: CompositionSignals): ProofPlacement {
  if (signals.trustNeed >= 0.7 || signals.socialProofNeed >= 0.7) return "immediate";
  if (signals.trustNeed >= 0.4) return "after-hero";
  return "deferred";
}

export function resolveHeroStrategy(bi: BusinessIntelligenceProfile, signals: CompositionSignals): HeroStrategy {
  return {
    emotionalIntensity: bi.emotionalVsRational,
    headlineLength: resolveHeadlineLength(bi, signals),
    imagery: resolveImagery(bi),
    whitespace: resolveWhitespace(bi, signals),
    proofPlacement: resolveProofPlacement(signals),
  };
}

export function describeHeroStrategyForPrompt(strategy: HeroStrategy): string[] {
  const lines = [
    `Headline length: ${strategy.headlineLength}`,
    `Hero imagery: ${strategy.imagery}`,
    `Whitespace: ${strategy.whitespace}`,
    `Proof placement: ${strategy.proofPlacement}`,
  ];

  if (strategy.emotionalIntensity >= 0.65) {
    lines.push("Write the hero with real emotional pull, not just a feature statement.");
  } else if (strategy.emotionalIntensity <= 0.35) {
    lines.push("Keep the hero rational and concrete - lead with outcome, not feeling.");
  }

  return lines;
}
