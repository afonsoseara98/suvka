import { buildBusinessProfile } from "./BusinessProfileBuilder";
import { resolveKnowledge } from "./KnowledgeResolver";
import { buildDesignSystem } from "./DesignPlanner";
import { buildPrompt } from "./PromptBuilder";
import { analyzePsychology } from "../analyzers/PsychologyAnalyzer";
import { buildOfferStrategy } from "./OfferBuilder";
import { resolveArchetype } from "./ArchetypeResolver";
import { deriveCompositionSignals } from "./CompositionIntelligence";
import { buildLandingComposition } from "./LandingComposition";
import { buildSections } from "./SectionPlanner";

import type { BusinessProfile } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { PageArchetype } from "../types/archetype";
import type { CompositionSignals } from "../types/signals";
import type { LandingComposition } from "../types/composition";
import type { DesignSystem } from "@/app/types/design";
import type { Section } from "@/app/types/landing";

export interface PipelineResult {
  businessProfile: BusinessProfile;
  knowledge: BusinessKnowledge;
  psychology: PsychologyProfile;
  offer: OfferStrategy;
  design: DesignSystem;
  archetype: PageArchetype;
  signals: CompositionSignals;
  composition: LandingComposition;
  sections: readonly Section[];
  finalPrompt: string;
}

export function buildPipeline(prompt: string): PipelineResult {
  const businessProfile = buildBusinessProfile(prompt);

  const knowledge = resolveKnowledge(businessProfile.industry);

  const psychology = analyzePsychology(businessProfile, knowledge);

  const offer = buildOfferStrategy(businessProfile, knowledge, psychology);

  const design = buildDesignSystem(businessProfile.industry);

  const archetype = resolveArchetype(businessProfile);

  // Computed once, consumed twice: by LandingComposition (structure) and PromptBuilder
  // (copy guidance) - the same reading of "who this business is" drives both, instead
  // of each independently re-deriving its own view of e.g. how urgent the page should
  // feel.
  const signals = deriveCompositionSignals(businessProfile, psychology, offer);

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
    signals
  );

  return {
    businessProfile,
    knowledge,
    psychology,
    offer,
    design,
    archetype,
    signals,
    composition,
    sections,
    finalPrompt,
  };
}
