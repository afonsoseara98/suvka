import { buildBusinessProfile } from "./BusinessProfileBuilder";
import { buildBusinessIntelligence } from "./BusinessIntelligence";
import { resolveKnowledge } from "./KnowledgeResolver";
import { buildDesignSystem } from "./DesignPlanner";
import { buildPrompt } from "./PromptBuilder";
import { analyzePsychology } from "../analyzers/PsychologyAnalyzer";
import { buildOfferStrategy } from "./OfferBuilder";
import { resolveArchetype } from "./ArchetypeResolver";
import { deriveCompositionSignals } from "./CompositionIntelligence";
import { buildLandingComposition } from "./LandingComposition";
import { buildSections } from "./SectionPlanner";
import { resolveHeroStrategy } from "../engines/HeroEngine";
import { resolveTrustStrategy } from "../engines/TrustEngine";
import { resolveCtaStrategy } from "../engines/CTAEngine";
import { resolvePricingStrategy } from "../engines/PricingEngine";

import type { BusinessProfile } from "../types";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { PageArchetype } from "../types/archetype";
import type { CompositionSignals } from "../types/signals";
import type { LandingComposition } from "../types/composition";
import type { HeroStrategy, TrustStrategy, CtaStrategy, PricingStrategy } from "../types/strategy";
import type { DesignSystem } from "@/app/types/design";
import type { Section } from "@/app/types/landing";

export interface PipelineResult {
  businessProfile: BusinessProfile;
  businessIntelligence: BusinessIntelligenceProfile;
  knowledge: BusinessKnowledge;
  psychology: PsychologyProfile;
  offer: OfferStrategy;
  design: DesignSystem;
  archetype: PageArchetype;
  signals: CompositionSignals;
  heroStrategy: HeroStrategy;
  trustStrategy: TrustStrategy;
  ctaStrategy: CtaStrategy;
  pricingStrategy: PricingStrategy;
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

  const design = buildDesignSystem(businessIntelligence);

  const archetype = resolveArchetype(businessProfile, businessIntelligence);

  // Computed once, consumed twice: by LandingComposition (structure) and PromptBuilder
  // (copy guidance) - the same reading of "who this business is" drives both, instead
  // of each independently re-deriving its own view of e.g. how urgent the page should
  // feel.
  const signals = deriveCompositionSignals(businessProfile, psychology, offer, businessIntelligence);

  // Each a pure function of the same (businessIntelligence, signals) read the rest of
  // the pipeline already uses - structured decisions computed before the LLM is ever
  // prompted, not left for the model to infer from raw signals itself.
  const heroStrategy = resolveHeroStrategy(businessIntelligence, signals);
  const trustStrategy = resolveTrustStrategy(businessIntelligence, signals);
  const ctaStrategy = resolveCtaStrategy(businessIntelligence, signals);
  const pricingStrategy = resolvePricingStrategy(businessIntelligence, signals);

  const composition = buildLandingComposition(archetype, signals);

  const sections = buildSections(composition);

  const finalPrompt = buildPrompt(
    prompt,
    businessProfile,
    knowledge,
    psychology,
    offer,
    design,
    sections,
    signals,
    businessIntelligence,
    heroStrategy,
    trustStrategy,
    ctaStrategy,
    pricingStrategy
  );

  return {
    businessProfile,
    businessIntelligence,
    knowledge,
    psychology,
    offer,
    design,
    archetype,
    signals,
    heroStrategy,
    trustStrategy,
    ctaStrategy,
    pricingStrategy,
    composition,
    sections,
    finalPrompt,
  };
}
