import { buildBusinessProfile } from "./BusinessProfileBuilder";
import { resolveKnowledge } from "./KnowledgeResolver";
import { buildDesignSystem } from "./DesignPlanner";
import { buildPrompt } from "./PromptBuilder";
import { analyzePsychology } from "../analyzers/PsychologyAnalyzer";
import { buildOfferStrategy } from "./OfferBuilder";

import type { BusinessProfile } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { DesignSystem } from "@/app/types/design";

export interface PipelineResult {
  businessProfile: BusinessProfile;
  knowledge: BusinessKnowledge;
  psychology: PsychologyProfile;
  offer: OfferStrategy;
  design: DesignSystem;
  finalPrompt: string;
}

export function buildPipeline(prompt: string): PipelineResult {
  const businessProfile = buildBusinessProfile(prompt);

  const knowledge = resolveKnowledge(businessProfile.industry);

  const psychology = analyzePsychology(businessProfile, knowledge);

  const offer = buildOfferStrategy(businessProfile, knowledge, psychology);

  const design = buildDesignSystem(businessProfile.industry);

  const finalPrompt = buildPrompt(
    prompt,
    businessProfile,
    knowledge,
    psychology,
    offer,
    design
  );

  return {
    businessProfile,
    knowledge,
    psychology,
    offer,
    design,
    finalPrompt,
  };
}
