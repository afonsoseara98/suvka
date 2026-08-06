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
import { resolveDesignFamily, applyDesignFamily } from "../engines/DesignFamily";
import { sectionWeightsFor } from "./LayoutIntelligence";
import { hashString, createSeededRandom } from "../utils/seed";
import { findExisting, findTooSimilar, remember, MAX_RECOMPOSE_ATTEMPTS } from "./DiversityTracker";

import type { BusinessProfile } from "../types";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { CompositionSignals } from "../types/signals";
import type { StrategyDNA } from "../types/dna";
import type { DesignFamilyName } from "../engines/DesignFamily";
import type { GenerationFingerprint } from "./DiversityScore";
import type { LandingComposition } from "../types/composition";
import type { Section } from "@/app/types/landing";

export interface PipelineResult {
  businessProfile: BusinessProfile;
  businessIntelligence: BusinessIntelligenceProfile;
  knowledge: BusinessKnowledge;
  psychology: PsychologyProfile;
  offer: OfferStrategy;
  signals: CompositionSignals;
  designFamily: DesignFamilyName;
  dna: StrategyDNA;
  composition: LandingComposition;
  sections: readonly Section[];
  finalPrompt: string;
}

interface ComposedAttempt {
  designFamily: DesignFamilyName;
  dna: StrategyDNA;
  composition: LandingComposition;
  sections: readonly Section[];
}

// Every seed-consuming decision downstream of the DNA (design family, phase order,
// section variants) in one pure function of (businessIntelligence, signals, baseDna,
// random) - pulled out of buildPipeline so the anti-repetition recompose loop below
// can call it more than once with a different seed, without duplicating the logic.
function composeAttempt(
  businessIntelligence: BusinessIntelligenceProfile,
  signals: CompositionSignals,
  baseDna: StrategyDNA,
  random: () => number
): ComposedAttempt {
  const designFamily = resolveDesignFamily(businessIntelligence, random);
  const dna = applyDesignFamily(baseDna, designFamily);
  const composition = buildLandingComposition(businessIntelligence, signals, dna.heroSplitLean, dna.priceEmphasis, random);
  const sections = buildSections(composition, designFamily, random);

  return { designFamily, dna, composition, sections };
}

function fingerprintOf(attempt: ComposedAttempt): GenerationFingerprint {
  return {
    dna: attempt.dna,
    designFamily: attempt.designFamily,
    sectionSequence: attempt.sections.map((section) => section.type),
    heroVariant: attempt.composition.heroVariant,
  };
}

export function buildPipeline(prompt: string): PipelineResult {
  const businessProfile = buildBusinessProfile(prompt);

  // Reads the prompt's own words, not just the classified industry bucket - this is
  // what lets "Luxury Wedding Photographer" and "Cheap Wedding Photographer" diverge
  // downstream despite sharing an industry, businessModel and primaryGoal.
  const businessIntelligence = buildBusinessIntelligence(prompt, businessProfile);

  const knowledge = resolveKnowledge(businessProfile.industry);

  const psychology = analyzePsychology(businessProfile, knowledge, businessIntelligence);

  const offer = buildOfferStrategy(businessProfile, knowledge, psychology, businessIntelligence);

  // Computed once, consumed by every Decision Engine below and by LayoutIntelligence -
  // the same reading of "who this business is" drives structure, visuals and copy
  // guidance, instead of each independently re-deriving its own view.
  const signals = deriveCompositionSignals(businessProfile, psychology, offer, businessIntelligence);

  // Every engine is a pure function of (businessIntelligence, signals) returning a
  // slice of StrategyDNA - no categories, no lookup tables, just continuous numbers.
  const baseDna: StrategyDNA = {
    sectionWeight: sectionWeightsFor(signals, businessIntelligence),
    urgency: signals.urgency,
    complexity: signals.complexity,
    ...resolveVisualDNA(businessIntelligence),
    ...resolveHeroDNA(businessIntelligence),
    ...resolveTrustDNA(businessIntelligence, signals),
    ...resolveCtaDNA(businessIntelligence, signals),
    ...resolvePricingDNA(businessIntelligence, signals),
  };

  const promptHash = hashString(prompt);

  // ANTI-REPETITION: if this exact prompt was already generated earlier in this
  // process, replay the same number of recompose attempts it used the first time -
  // never re-run collision detection against a history that may have changed shape
  // since then. This is what keeps "same prompt -> same output" true regardless of
  // what else has been generated in between (see DiversityTracker.ts's header comment
  // for why replaying the retry count, not caching the whole result, is the safe way
  // to do this).
  const existing = findExisting(promptHash);
  const maxAttempts = existing ? existing.retries : MAX_RECOMPOSE_ATTEMPTS;

  let attempt = composeAttempt(businessIntelligence, signals, baseDna, createSeededRandom(promptHash));
  let fingerprint = fingerprintOf(attempt);
  let retries = 0;

  if (!existing) {
    // First time seeing this prompt in this process: keep recomposing with a
    // perturbed seed (still a pure function of the prompt text + attempt number, so
    // still fully reproducible) until the result clears the diversity floor against
    // everything else recently generated, or the attempt budget runs out.
    while (retries < maxAttempts && findTooSimilar(fingerprint) !== null) {
      retries++;
      const perturbedSeed = createSeededRandom(hashString(`${prompt}::recompose::${retries}`));
      attempt = composeAttempt(businessIntelligence, signals, baseDna, perturbedSeed);
      fingerprint = fingerprintOf(attempt);
    }
  } else if (existing.retries > 0) {
    // Repeated prompt that needed recomposing the first time - replay that exact
    // number of perturbed attempts, deterministically, with no collision checking.
    const perturbedSeed = createSeededRandom(hashString(`${prompt}::recompose::${existing.retries}`));
    attempt = composeAttempt(businessIntelligence, signals, baseDna, perturbedSeed);
    fingerprint = fingerprintOf(attempt);
    retries = existing.retries;
  }

  remember(promptHash, fingerprint, retries);

  const { designFamily, dna, composition, sections } = attempt;

  const finalPrompt = buildPrompt(
    prompt,
    businessProfile,
    knowledge,
    psychology,
    offer,
    sections,
    businessIntelligence,
    dna,
    designFamily,
    signals
  );

  return {
    businessProfile,
    businessIntelligence,
    knowledge,
    psychology,
    offer,
    signals,
    designFamily,
    dna,
    composition,
    sections,
    finalPrompt,
  };
}
