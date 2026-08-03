import type { BusinessProfile, BusinessGoal } from "../types";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { CompositionSignals } from "../types/signals";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";

// Owns the read of "who this business is" as CompositionSignals - both how the page is
// structured (LayoutIntelligence.ts consumes these signals to generate a
// LandingComposition) and how it should be written (describeSignalsForPrompt turns the
// same signals into directives PromptBuilder.ts feeds the LLM). One computation, two
// consumers, so the structure a page renders in and the copy it's written with are
// always describing the same read of the business, never two independent ones.
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const PRICE_LEVEL_TRUST_WEIGHT: Record<BusinessProfile["priceLevel"], number> = {
  low: 0.15,
  medium: 0.35,
  high: 0.65,
  premium: 0.9,
};

const PRICE_LEVEL_SENSITIVITY: Record<BusinessProfile["priceLevel"], number> = {
  low: 0.8,
  medium: 0.5,
  high: 0.3,
  premium: 0.55,
};

const GOAL_URGENCY: Record<BusinessGoal, number> = {
  generate_leads: 0.3,
  collect_emails: 0.2,
  book_demo: 0.5,
  sell_product: 0.6,
  book_consultation: 0.8,
  schedule_call: 0.8,
};

const GOAL_OBJECTION_WEIGHT: Record<BusinessGoal, number> = {
  generate_leads: 0.3,
  collect_emails: 0.3,
  book_demo: 0.5,
  sell_product: 0.5,
  book_consultation: 0.7,
  schedule_call: 0.6,
};

// businessModel is a free string in BusinessProfile (set per-industry in
// BusinessProfileBuilder.ts's INDUSTRY_PROFILES: "saas", "service", "local_business",
// "ecommerce", "online_platform", "business"). Unknown values fall back to 0.5 - this
// signal degrades gracefully rather than throwing if that table ever grows.
const BUSINESS_MODEL_COMPLEXITY: Record<string, number> = {
  saas: 0.8,
  online_platform: 0.7,
  service: 0.5,
  ecommerce: 0.4,
  local_business: 0.3,
  business: 0.4,
};

// Deterministic, explainable scoring - every weight table above is the single place a
// score can be tuned, and every score is a pure function of data the pipeline already
// computes (BusinessProfileBuilder/PsychologyAnalyzer/OfferBuilder/BusinessIntelligence).
// No LLM call, no randomness: the same business always produces the same signals.
//
// bi blends in alongside the original industry-table-driven reads rather than
// replacing them: business.priceLevel/businessModel/primaryGoal still carry real
// signal (they're the coarse, always-available prior), and bi supplies the part that
// actually reads the prompt's own words. Blending at 0.5 means neither source can be
// silently ignored by the other - a business intelligence read of "very premium" can
// still only pull priceSensitivity halfway from where priceLevel alone would put it.
const BI_BLEND = 0.5;

function blend(base: number, bi: number, weight = BI_BLEND): number {
  return clamp01(base * (1 - weight) + bi * weight);
}

export function deriveCompositionSignals(
  business: BusinessProfile,
  psychology: PsychologyProfile,
  offer: OfferStrategy,
  bi: BusinessIntelligenceProfile
): CompositionSignals {
  const trustBase = PRICE_LEVEL_TRUST_WEIGHT[business.priceLevel];
  const trustFromFactors = psychology.trustFactors.length * 0.08;
  const trustFromGoal = business.primaryGoal === "book_consultation" || business.primaryGoal === "schedule_call" ? 0.15 : 0;
  const trustFromBi = (bi.trustDifficulty + bi.authorityRequirement + bi.riskPerception) / 3;

  const complexityBase = BUSINESS_MODEL_COMPLEXITY[business.businessModel] ?? 0.5;
  const complexityFromBi = (bi.offerComplexity + bi.decisionComplexity) / 2;

  const urgencyBase = GOAL_URGENCY[business.primaryGoal];
  const urgencyFromTone = business.tone === "bold" ? 0.1 : 0;

  const socialProofBase = 0.25 + psychology.trustFactors.length * 0.12 + trustBase * 0.25;
  const socialProofFromBi = (bi.riskPerception + bi.buyerSophistication) / 2;

  const objectionBase = GOAL_OBJECTION_WEIGHT[business.primaryGoal] * 0.6 + trustBase * 0.4;
  const objectionFromBi = (bi.riskPerception + bi.decisionComplexity) / 2;

  // offer.riskReductionAngle always exists (OfferBuilder.ts derives one for every
  // goal), but a longer, more specific angle correlates with there being more to
  // reassure someone about - a light, real (not fabricated) additional signal.
  const objectionFromRiskAngle = offer.riskReductionAngle.length > 80 ? 0.1 : 0;

  return {
    trustNeed: blend(clamp01(trustBase + trustFromFactors + trustFromGoal), trustFromBi),
    urgency: blend(clamp01(urgencyBase + urgencyFromTone), bi.purchaseUrgency),
    complexity: blend(complexityBase, complexityFromBi),
    socialProofNeed: blend(clamp01(socialProofBase), socialProofFromBi),
    objectionPressure: blend(clamp01(objectionBase + objectionFromRiskAngle), objectionFromBi),
    priceSensitivity: blend(PRICE_LEVEL_SENSITIVITY[business.priceLevel], 1 - bi.pricePositioning),
  };
}

const HIGH = 0.7;
const LOW = 0.3;

function band(value: number): "low" | "medium" | "high" {
  if (value >= HIGH) return "high";
  if (value <= LOW) return "low";
  return "medium";
}

const DIRECTIVES: Record<keyof CompositionSignals, Record<"low" | "medium" | "high", string>> = {
  trustNeed: {
    low: "credentials can stay light-touch",
    medium: "back claims with at least one concrete proof point",
    high: "lead with credentials/proof before asking for anything",
  },
  urgency: {
    low: "frame the CTA as a low-pressure next step",
    medium: "give the CTA a clear, direct reason to act now",
    high: "make every CTA immediate and specific - no vague 'learn more' framing",
  },
  complexity: {
    low: "keep copy short - the offer is self-explanatory",
    medium: "explain the offer clearly but don't over-elaborate",
    high: "take the space needed to explain how it actually works",
  },
  socialProofNeed: {
    low: "one light social proof mention is enough",
    medium: "make testimonials specific and outcome-focused",
    high: "make testimonials the emotional core of the page, not decoration",
  },
  objectionPressure: {
    low: "objections need only a brief acknowledgment",
    medium: "address the top objection directly in FAQ or copy",
    high: "proactively defeat objections before the reader has to ask",
  },
  priceSensitivity: {
    low: "lean into premium/exclusivity framing on price",
    medium: "justify price with value, not just features",
    high: "lead with value and guarantees before revealing price",
  },
};

// Turns the numeric signals into short, LLM-readable directives - qualitative bands,
// not raw floats, because "urgency: 0.83" means nothing to a language model but "make
// every CTA immediate" does.
export function describeSignalsForPrompt(signals: CompositionSignals): string[] {
  return (Object.keys(signals) as (keyof CompositionSignals)[]).map((key) => {
    const level = band(signals[key]);
    return `${key}: ${level} - ${DIRECTIVES[key][level]}`;
  });
}
