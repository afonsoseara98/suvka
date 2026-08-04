import { SYSTEM_PROMPT } from "../prompts/system";
import { CONVERSION_PROMPT } from "../prompts/conversion";
import { SCHEMA_PROMPT } from "../prompts/schema";
import { describeSignalsForPrompt } from "./CompositionIntelligence";
import { describeBusinessIntelligenceForPrompt } from "./BusinessIntelligence";
import { describeHeroStrategyForPrompt } from "../engines/HeroEngine";
import { describeTrustStrategyForPrompt } from "../engines/TrustEngine";
import { describeCtaStrategyForPrompt } from "../engines/CTAEngine";
import { describePricingStrategyForPrompt } from "../engines/PricingEngine";

import type { BusinessProfile } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { CompositionSignals } from "../types/signals";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { HeroStrategy, TrustStrategy, CtaStrategy, PricingStrategy } from "../types/strategy";
import type { DesignSystem } from "@/app/types/design";
import type { Section } from "@/app/types/landing";

// Copy Intelligence: psychology.pains/desires/objections/emotionalTriggers and
// offer.valueProposition/offerFraming/riskReductionAngle were computed by every
// pipeline run but never reached this prompt before - only trustFactors and
// primaryCTA did. The LLM was writing copy blind to most of the psychological work
// already done for it. Fixed here, not by adding new pipeline stages: the data
// already existed, it just never travelled the last few feet into the prompt.
export function buildPrompt(
  userPrompt: string,
  profile: BusinessProfile,
  knowledge: BusinessKnowledge,
  psychology: PsychologyProfile,
  offer: OfferStrategy,
  design: DesignSystem,
  sections: readonly Section[],
  signals: CompositionSignals,
  businessIntelligence: BusinessIntelligenceProfile,
  heroStrategy: HeroStrategy,
  trustStrategy: TrustStrategy,
  ctaStrategy: CtaStrategy,
  pricingStrategy: PricingStrategy
): string {
  // knowledge.trustSignals and psychology.trustFactors both exist to answer the same
  // question ("why should this reader trust this business") from two different
  // angles (generic industry knowledge vs. this specific business's profile) - merged
  // into one deduplicated list instead of two separately-labeled ones the model would
  // otherwise have to reconcile itself.
  const trustSignals = Array.from(new Set([...psychology.trustFactors, ...knowledge.trustSignals]));

  return [
    SYSTEM_PROMPT,

    "",

    "==============================",
    "BUSINESS PROFILE",
    "==============================",

    `Industry: ${profile.industry}`,
    `Business Model: ${profile.businessModel}`,
    `Primary Goal: ${profile.primaryGoal}`,
    `Audience: ${profile.audience}`,
    `Tone: ${profile.tone}`,
    `Price Level: ${profile.priceLevel}`,

    "",

    "==============================",
    "BUSINESS INTELLIGENCE",
    "==============================",

    "Strategic read of this specific business, inferred from the prompt itself - not just its industry. Let this shape tone, pacing, and how hard the page pushes toward a decision:",

    "",

    ...describeBusinessIntelligenceForPrompt(businessIntelligence),

    "",

    "==============================",
    "PSYCHOLOGY & OFFER STRATEGY",
    "==============================",

    `Value Proposition: ${offer.valueProposition}`,
    `Primary CTA: ${offer.primaryCTA}`,
    `Offer Framing: ${offer.offerFraming}`,
    `Risk Reversal: ${offer.riskReductionAngle}`,

    "",

    "Pain Points:",

    ...psychology.pains,

    "",

    "Desires:",

    ...psychology.desires,

    "",

    "Objections to Defeat:",

    ...psychology.objections,

    "",

    "Emotional Triggers:",

    ...psychology.emotionalTriggers,

    "",

    "Trust Signals:",

    ...trustSignals,

    "",

    "==============================",
    "CONVERSION SIGNALS",
    "==============================",

    "How strongly each factor should shape the copy (derived from this business's profile):",

    "",

    ...describeSignalsForPrompt(signals),

    "",

    "==============================",
    "HERO STRATEGY",
    "==============================",

    ...describeHeroStrategyForPrompt(heroStrategy),

    "",

    "==============================",
    "TRUST STRATEGY",
    "==============================",

    ...describeTrustStrategyForPrompt(trustStrategy),

    "",

    "==============================",
    "CTA STRATEGY",
    "==============================",

    ...describeCtaStrategyForPrompt(ctaStrategy),

    "",

    "==============================",
    "PRICING STRATEGY",
    "==============================",

    ...describePricingStrategyForPrompt(pricingStrategy),

    "",

    "==============================",
    "INDUSTRY KNOWLEDGE",
    "==============================",

    `Hero Style: ${knowledge.heroStyle}`,

    "",

    "Common Features:",

    ...knowledge.commonFeatures,

    "",

    "Common Benefits:",

    ...knowledge.commonBenefits,

    "",

    "FAQ Topics:",

    ...knowledge.faqTopics,

    "",

    "SEO Keywords:",

    ...knowledge.keywords,

    "",

    "==============================",
    "DESIGN SYSTEM",
    "==============================",

    `Style: ${design.style}`,
    `Hero Variant: ${design.heroVariant}`,
    `Feature Variant: ${design.featureVariant}`,
    `Benefit Variant: ${design.benefitVariant}`,
    `Testimonial Variant: ${design.testimonialVariant}`,
    `Pricing Variant: ${design.pricingVariant}`,
    `Primary Color: ${design.primaryColor}`,
    `Background: ${design.background}`,
    `Border Radius: ${design.borderRadius}`,

    "",

    "==============================",
    "PAGE STRUCTURE",
    "==============================",

    "Generate the page using exactly this section structure, in this exact order. Do not add, remove, or reorder sections. \"emphasis\" tells you how much space/weight that section's copy should carry relative to the others:",

    "",

    ...sections.map((section) => `- ${section.type} (variant: ${section.variant}, emphasis: ${section.prominence})`),

    "",

    CONVERSION_PROMPT,

    "",

    SCHEMA_PROMPT,

    "",

    "==============================",
    "USER REQUEST",
    "==============================",

    userPrompt,
  ].join("\n");
}
