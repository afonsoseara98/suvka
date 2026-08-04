import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { StrategyDNA } from "../types/dna";
import { clamp01 } from "../utils/math";

// TRUST ENGINE
//
// Deliberately covers what could have been three separate "Authority Engine", "Social
// Proof Engine" and "Objection Engine" modules - they all answer the same underlying
// question ("how does this page earn belief") from the same handful of signals, so
// splitting them would mean three places re-deriving overlapping reads of
// trustDifficulty/authorityRequirement/riskPerception instead of one coherent read.
// credibilityApproach used to be a 4-way enum (credentials/social-proof/data/guarantee)
// - credibilityRationalLean replaces it with where on that spectrum the business sits,
// continuously, rather than snapping to whichever bucket scored highest.

export type TrustDNA = Pick<
  StrategyDNA,
  "credibilityRationalLean" | "proofDensity" | "authorityEmphasis" | "objectionProactivity"
>;

export function resolveTrustDNA(bi: BusinessIntelligenceProfile, signals: CompositionSignals): TrustDNA {
  // 0 = social-proof/emotional credibility, 1 = data/credentials-led. Authority and
  // analytical rigor push toward 1; a socially-proven, less analytical business sits
  // toward 0.
  const credibilityRationalLean = clamp01(
    bi.authorityRequirement * 0.5 + bi.riskPerception * 0.3 + bi.buyerSophistication * 0.2
  );

  return {
    credibilityRationalLean,
    proofDensity: signals.socialProofNeed,
    authorityEmphasis: bi.authorityRequirement,
    objectionProactivity: signals.objectionPressure,
  };
}
