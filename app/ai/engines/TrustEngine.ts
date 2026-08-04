import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { TrustStrategy, CredibilityApproach, ProofDensity, ObjectionHandling } from "../types/strategy";

// TRUST ENGINE
//
// Deliberately covers what could have been three separate "Authority Engine", "Social
// Proof Engine" and "Objection Engine" modules - they all answer the same underlying
// question ("how does this specific page earn belief") from the same handful of
// signals, so splitting them would mean three places re-deriving overlapping reads of
// trustDifficulty/authorityRequirement/riskPerception instead of one coherent strategy.
// See types/strategy.ts for the fuller reasoning.

function resolveCredibilityApproach(bi: BusinessIntelligenceProfile, signals: CompositionSignals): CredibilityApproach {
  if (bi.authorityRequirement >= 0.65) return "credentials";
  if (bi.riskPerception >= 0.6 && bi.buyerSophistication >= 0.5) return "data";
  if (signals.socialProofNeed >= 0.55) return "social-proof";
  return "guarantee";
}

function resolveProofDensity(signals: CompositionSignals): ProofDensity {
  if (signals.socialProofNeed >= 0.7) return "heavy";
  if (signals.socialProofNeed <= 0.35) return "minimal";
  return "moderate";
}

function resolveObjectionHandling(signals: CompositionSignals): ObjectionHandling {
  if (signals.objectionPressure >= 0.65) return "proactive";
  if (signals.objectionPressure <= 0.3) return "minimal";
  return "reactive";
}

export function resolveTrustStrategy(bi: BusinessIntelligenceProfile, signals: CompositionSignals): TrustStrategy {
  return {
    credibilityApproach: resolveCredibilityApproach(bi, signals),
    proofDensity: resolveProofDensity(signals),
    objectionHandling: resolveObjectionHandling(signals),
    authorityEmphasis: bi.authorityRequirement,
  };
}

export function describeTrustStrategyForPrompt(strategy: TrustStrategy): string[] {
  const lines = [
    `Credibility approach: ${strategy.credibilityApproach}`,
    `Proof density: ${strategy.proofDensity}`,
    `Objection handling: ${strategy.objectionHandling}`,
  ];

  if (strategy.authorityEmphasis >= 0.65) {
    lines.push("Credentials/expertise are central to the sale - surface them prominently, not as an afterthought.");
  }

  return lines;
}
