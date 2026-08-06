import { SYSTEM_PROMPT } from "../prompts/system";
import { CONVERSION_PROMPT } from "../prompts/conversion";
import { SCHEMA_PROMPT } from "../prompts/schema";
import { describeBusinessIntelligenceForPrompt } from "./BusinessIntelligence";
import { describeSignalsForPrompt } from "./CompositionIntelligence";

import type { BusinessProfile } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { StrategyDNA } from "../types/dna";
import type { DesignFamilyName } from "../engines/DesignFamily";
import type { Section } from "@/app/types/landing";

// Every DNA dimension paired with a short (lowMeaning / highMeaning) hint so the raw
//0-1 number the LLM sees is legible without the pipeline pre-digesting it into a
// curated sentence - that pre-digesting was itself a small reintroduction of
// categorical thinking ("high trust: do X"). The model reads the number and the axis
// it sits on, the same way it reads any other structured input.
const DNA_HINTS: Record<Exclude<keyof StrategyDNA, "sectionWeight">, string> = {
  urgency: "no rush / act now",
  complexity: "self-explanatory / needs real room to explain",
  colorTemperature: "cool / warm",
  saturation: "muted / vivid",
  brightness: "dark theme / light theme",
  accentIntensity: "subtle accent / bold accent",
  roundedness: "sharp corners / fully rounded",
  elevation: "flat / deep shadow and glow",
  decorationDensity: "no decoration / heavy glow-texture",
  density: "spacious/editorial / dense/packed",
  contentWidth: "narrow editorial column / full width",
  typeScale: "restrained headlines / oversized dramatic headlines",
  typeWeight: "light / black",
  heroSplitLean: "centered/stacked hero / fully split hero with side panel",
  heroImageryProminence: "minimal imagery / immersive imagery",
  emotionalIntensity: "rational, concrete copy / emotionally driven copy",
  credibilityRationalLean: "social-proof/emotional credibility / data/credentials-led credibility",
  proofDensity: "minimal proof / heavy proof",
  authorityEmphasis: "credentials don't matter / credentials are central",
  objectionProactivity: "address objections reactively / defeat objections proactively",
  ctaUrgency: "soft CTA / urgent CTA",
  ctaCommitmentWeight: "low-commitment framing / considered, high-commitment framing",
  priceEmphasis: "understated pricing / prominent pricing",
  priceAnchoring: "no anchor tier / strong anchor-tier framing",
  priceComplexityLean: "exact numbers / custom-quote framing",
};

function describeDnaForPrompt(dna: StrategyDNA): string[] {
  const scalarLines = (Object.keys(DNA_HINTS) as (keyof typeof DNA_HINTS)[]).map(
    (key) => `${key}: ${dna[key].toFixed(2)}  (0 = ${DNA_HINTS[key].split(" / ")[0]}, 1 = ${DNA_HINTS[key].split(" / ")[1]})`
  );

  const sectionWeightLines = Object.entries(dna.sectionWeight).map(
    ([role, weight]) => `  ${role}: ${weight.toFixed(2)}`
  );

  return [
    "Every value below is continuous (0-1), not a category - read it as a position on",
    "that axis, not a label. Let these numbers shape word choice, pacing, how much",
    "space copy takes, and how hard the page pushes toward a decision:",
    "",
    ...scalarLines,
    "",
    "Section prominence (how much narrative weight this business's own signals give",
    "each optional section - already reflected in PAGE STRUCTURE below, shown here so",
    "the reasoning behind emphasis is visible):",
    ...sectionWeightLines,
  ];
}

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
  sections: readonly Section[],
  businessIntelligence: BusinessIntelligenceProfile,
  dna: StrategyDNA,
  designFamily: DesignFamilyName,
  signals: CompositionSignals
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

    "Strategic read of this specific business, inferred from the prompt itself - not just its industry:",

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
    "COMPOSITION SIGNALS",
    "==============================",

    // The same 6 signals (trustNeed/urgency/complexity/socialProofNeed/
    // objectionPressure/priceSensitivity) that already decided section count, order and
    // CTA count (LayoutIntelligence.ts) - describeSignalsForPrompt existed, fully built
    // and tested, since CompositionIntelligence.ts was written, but was never actually
    // called from here (Signal Trace Audit v1, finding #4). The model was writing copy
    // blind to the exact reasoning that shaped the PAGE STRUCTURE it's being told to fill in.
    ...describeSignalsForPrompt(signals),

    "",

    "==============================",
    "STRATEGY DNA",
    "==============================",

    `Design family: ${designFamily} - let this inform word choice and tone (e.g. "bold" reads confident and energetic, "elegant" reads restrained and considered), it is already fully reflected in the numbers below.`,

    "",

    ...describeDnaForPrompt(dna),

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
