import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { StrategyDNA } from "../types/dna";
import { clamp01 } from "../utils/math";

// CTA ENGINE
//
// Distinct from LayoutIntelligence.ts's ctaCountFor/insertCtas (which decide HOW MANY
// CTAs appear and WHERE in the section order - a structural decision, unchanged here).
// This engine decides how hard those CTAs push and what kind of commitment they're
// framed as asking for - continuously, not as a 3-way style enum.

export type CtaDNA = Pick<StrategyDNA, "ctaUrgency" | "ctaCommitmentWeight">;

export function resolveCtaDNA(bi: BusinessIntelligenceProfile, signals: CompositionSignals): CtaDNA {
  const ctaCommitmentWeight = clamp01(bi.riskPerception * 0.5 + bi.decisionComplexity * 0.5);

  return {
    ctaUrgency: signals.urgency,
    ctaCommitmentWeight,
  };
}
