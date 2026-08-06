import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { Section } from "@/app/types/landing";
import { band } from "./CompositionIntelligence";

// EXPLAIN WHY
//
// A deterministic, no-LLM readout of signals buildPipeline() already computes -
// BusinessIntelligenceProfile and CompositionSignals - translated for a person instead
// of the model. This is the exact same translation layer describeSignalsForPrompt/
// describeBusinessIntelligenceForPrompt already proved out (banding a continuous 0-1
// value into low/medium/high, pairing it with a plain-language consequence), aimed at
// the opposite audience. Nothing here calls an LLM or makes any decision - it explains
// decisions LayoutIntelligence.ts/the Design Engines already made.

export interface ExplanationReason {
  label: string;
  value: string;
}

export interface Explanation {
  title: string;
  reasons: ExplanationReason[];
  conclusion: string;
}

function formatSignal(label: string, value: number): ExplanationReason {
  return { label, value: `${value.toFixed(2)} (${band(value)})` };
}

export function explainHero(bi: BusinessIntelligenceProfile): Explanation {
  const reasons = [
    formatSignal("authorityRequirement", bi.authorityRequirement),
    formatSignal("pricePositioning", bi.pricePositioning),
    formatSignal("emotionalVsRational", bi.emotionalVsRational),
  ];

  let conclusion: string;
  if (bi.authorityRequirement >= 0.6) {
    conclusion = "Authority-first messaging - lead with credentials and expertise.";
  } else if (bi.emotionalVsRational >= 0.6) {
    conclusion = "Emotionally-driven messaging - lead with feeling, not facts.";
  } else if (bi.emotionalVsRational <= 0.35) {
    conclusion = "Rational, benefit-first messaging - lead with concrete outcomes.";
  } else {
    conclusion = "Balanced, benefit-first messaging.";
  }

  return { title: "Hero", reasons, conclusion };
}

export function explainTestimonialsPlacement(
  signals: CompositionSignals,
  sections: readonly Pick<Section, "type">[]
): Explanation {
  const reasons = [formatSignal("socialProofNeed", signals.socialProofNeed)];

  const testimonialsIndex = sections.findIndex((s) => s.type === "testimonials");
  const pricingIndex = sections.findIndex((s) => s.type === "pricing");

  let conclusion: string;
  if (testimonialsIndex === -1) {
    conclusion = "Not included - social proof need didn't clear the threshold for this business.";
  } else if (pricingIndex === -1) {
    conclusion = `Placed at position ${testimonialsIndex + 1} in the page (no pricing section to compare against).`;
  } else if (testimonialsIndex < pricingIndex) {
    conclusion = "Positioned before pricing - trust needs to be established before the ask.";
  } else {
    conclusion = "Positioned after pricing - the offer speaks for itself before reinforcing it with proof.";
  }

  return { title: "Testimonials", reasons, conclusion };
}

export function explainCtaRepetition(signals: CompositionSignals, sections: readonly Pick<Section, "type">[]): Explanation {
  const ctaCount = sections.filter((s) => s.type === "cta").length + 1; // +1 for the hero's own primary CTA, always present
  const reasons = [formatSignal("urgency", signals.urgency)];

  const conclusion =
    ctaCount <= 1
      ? "A single call to action - urgency doesn't justify repeating the ask."
      : `Repeated ${ctaCount}x across the page - high urgency means relying on one ask would leave conversions on the table.`;

  return { title: "CTA", reasons, conclusion };
}

export function explainPricingFraming(bi: BusinessIntelligenceProfile, sections: readonly Pick<Section, "type">[]): Explanation {
  const reasons = [formatSignal("pricePositioning", bi.pricePositioning)];

  let conclusion: string;
  if (sections.every((s) => s.type !== "pricing")) {
    conclusion = "Not included - price sensitivity or positioning didn't clear the threshold for a visible price table.";
  } else if (bi.pricePositioning >= 0.7) {
    conclusion = "Premium framing - price is understated, exclusivity carries the argument instead.";
  } else if (bi.pricePositioning <= 0.3) {
    conclusion = "Value framing - price is prominent and leads the argument.";
  } else {
    conclusion = "Standard framing - price is justified with value, not hidden or led with.";
  }

  return { title: "Pricing", reasons, conclusion };
}

// Assembles every explanation that actually applies to this page - Hero always exists;
// Testimonials/CTA/Pricing only when relevant (Testimonials/Pricing still explain their
// own ABSENCE when gated out, CTA always applies since the hero's own CTA always
// counts).
export function explainPage(
  bi: BusinessIntelligenceProfile,
  signals: CompositionSignals,
  sections: readonly Pick<Section, "type">[]
): Explanation[] {
  return [
    explainHero(bi),
    explainTestimonialsPlacement(signals, sections),
    explainCtaRepetition(signals, sections),
    explainPricingFraming(bi, sections),
  ];
}
