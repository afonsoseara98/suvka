import { buildBusinessProfile } from "./BusinessProfileBuilder";
import { buildBusinessIntelligence } from "./BusinessIntelligence";
import { resolveKnowledge } from "./KnowledgeResolver";
import { buildPrompt } from "./PromptBuilder";
import { analyzePsychology } from "../analyzers/PsychologyAnalyzer";
import { buildOfferStrategy } from "./OfferBuilder";
import { deriveCompositionSignals } from "./CompositionIntelligence";
import { buildLandingComposition } from "./LandingComposition";
import { buildSections } from "./SectionPlanner";
import { resolveVisualDNA } from "../engines/VisualEngine";
import { resolveHeroDNA } from "../engines/HeroEngine";
import { resolveTrustDNA } from "../engines/TrustEngine";
import { resolveCtaDNA } from "../engines/CTAEngine";
import { resolvePricingDNA } from "../engines/PricingEngine";
import { sectionWeightsFor } from "./LayoutIntelligence";

import type { BusinessProfile } from "../types";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { CompositionSignals } from "../types/signals";
import type { StrategyDNA } from "../types/dna";
import type { LandingComposition } from "../types/composition";
import type { Section } from "@/app/types/landing";

export interface PipelineResult {
  businessProfile: BusinessProfile;
  businessIntelligence: BusinessIntelligenceProfile;
  knowledge: BusinessKnowledge;
  psychology: PsychologyProfile;
  offer: OfferStrategy;
  signals: CompositionSignals;
  dna: StrategyDNA;
  composition: LandingComposition;
  sections: readonly Section[];
  finalPrompt: string;
}

export function buildPipeline(prompt: string): PipelineResult {
  const businessProfile = buildBusinessProfile(prompt);

  // Reads the prompt's own words, not just the classified industry bucket - this is
  // what lets "Luxury Wedding Photographer" and "Cheap Wedding Photographer" diverge
  // downstream despite sharing an industry, businessModel and primaryGoal.
  const businessIntelligence = buildBusinessIntelligence(prompt, businessProfile);

  const knowledge = resolveKnowledge(businessProfile.industry);

  const psychology = analyzePsychology(businessProfile, knowledge);

  const offer = buildOfferStrategy(businessProfile, knowledge, psychology);

  // Computed once, consumed by every Decision Engine below and by LayoutIntelligence -
  // the same reading of "who this business is" drives structure, visuals and copy
  // guidance, instead of each independently re-deriving its own view.
  const signals = deriveCompositionSignals(businessProfile, psychology, offer, businessIntelligence);

  // Every engine is a pure function of (businessIntelligence, signals) returning a
  // slice of StrategyDNA - no categories, no lookup tables, just continuous numbers.
  // Composed into one object here because this IS the DNA: there is no further
  // classification step downstream that turns it into a label.
  const dna: StrategyDNA = {
    sectionWeight: sectionWeightsFor(signals, businessIntelligence),
    urgency: signals.urgency,
    complexity: signals.complexity,
    ...resolveVisualDNA(businessIntelligence),
    ...resolveHeroDNA(businessIntelligence),
    ...resolveTrustDNA(businessIntelligence, signals),
    ...resolveCtaDNA(businessIntelligence, signals),
    ...resolvePricingDNA(businessIntelligence, signals),
  };

  const composition = buildLandingComposition(businessIntelligence, signals, dna.heroSplitLean, dna.priceEmphasis);

  const sections = buildSections(composition);

  const finalPrompt = buildPrompt(prompt, businessProfile, knowledge, psychology, offer, sections, businessIntelligence, dna);

  return {
    businessProfile,
    businessIntelligence,
    knowledge,
    psychology,
    offer,
    signals,
    dna,
    composition,
    sections,
    finalPrompt,
  };
}
