import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { PricingStrategy, PricingPresentation, PricingEmphasis } from "../types/strategy";

// PRICING ENGINE
//
// Distinct from SectionPlanner.ts's pricing variant selection (featured vs simple,
// driven by prominence) and LayoutIntelligence.ts's decision of whether a pricing
// section appears at all - both structural/inclusion decisions, unchanged here. This
// engine decides how price is PRESENTED within whichever pricing section already
// exists: as exact numbers, a custom quote, or an anchored tier comparison - a copy/
// framing decision, not a structural one.

function resolvePresentation(bi: BusinessIntelligenceProfile, signals: CompositionSignals): PricingPresentation {
  if (bi.offerComplexity >= 0.6 || bi.decisionComplexity >= 0.6) return "custom-quote";
  if (signals.priceSensitivity <= 0.35 && bi.pricePositioning >= 0.6) return "tiered-comparison";
  return "exact-numbers";
}

function resolveEmphasis(bi: BusinessIntelligenceProfile, signals: CompositionSignals): PricingEmphasis {
  if (bi.pricePositioning >= 0.7) return "understated";
  if (signals.priceSensitivity >= 0.6) return "prominent";
  return "standard";
}

export function resolvePricingStrategy(bi: BusinessIntelligenceProfile, signals: CompositionSignals): PricingStrategy {
  const presentation = resolvePresentation(bi, signals);

  return {
    presentation,
    // A higher-tier anchor to make the target price look reasonable is a premium-market
    // tactic - not useful (and often actively confusing) once the offer is already
    // presented as a custom quote rather than a fixed set of tiers.
    anchoring: bi.pricePositioning >= 0.55 && presentation !== "custom-quote",
    emphasis: resolveEmphasis(bi, signals),
  };
}

export function describePricingStrategyForPrompt(strategy: PricingStrategy): string[] {
  const lines = [`Pricing presentation: ${strategy.presentation}`, `Pricing emphasis: ${strategy.emphasis}`];

  if (strategy.anchoring) {
    lines.push("Include a higher-tier anchor so the target price reads as reasonable by comparison.");
  }

  return lines;
}
