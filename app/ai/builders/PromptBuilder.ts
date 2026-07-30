import { SYSTEM_PROMPT } from "../prompts/system";
import { CONVERSION_PROMPT } from "../prompts/conversion";
import { SCHEMA_PROMPT } from "../prompts/schema";

import type { BusinessProfile } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { DesignSystem } from "@/app/types/design";

export function buildPrompt(
  userPrompt: string,
  profile: BusinessProfile,
  knowledge: BusinessKnowledge,
  psychology: PsychologyProfile,
  offer: OfferStrategy,
  design: DesignSystem
): string {
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
    `Recommended CTA: ${offer.primaryCTA}`,

    "",

    "Trust Signals:",

    ...psychology.trustFactors,

    "",

    "==============================",
    "INDUSTRY KNOWLEDGE",
    "==============================",

    `Hero Style: ${knowledge.heroStyle}`,
    `Primary CTA: ${knowledge.primaryCTA}`,
    `Audience: ${knowledge.audience}`,
    `Tone: ${knowledge.tone}`,

    "",

    "Trust Signals:",

    ...knowledge.trustSignals,

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

    "Recommended Colors:",

    ...knowledge.colors,

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