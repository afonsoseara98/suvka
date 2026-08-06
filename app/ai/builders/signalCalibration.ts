import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import { clamp01 } from "../utils/math";

// SIGNAL CALIBRATION
//
// The analysers rank businesses correctly and far too quietly. Measured over the
// 20-business corpus (`npm run audit:signal`), before this existed:
//
//   purchaseUrgency       0.40 .. 0.61   sd 0.037   3 distinct values across 20 businesses
//   buyerSophistication   0.29 .. 0.55   sd 0.048   3 distinct values
//   pricePositioning      0.45 .. 0.61   sd 0.058   4 distinct values
//
// An emergency plumber and a wedding planner differed in purchaseUrgency by 0.05, in a
// space that runs 0 to 1. Every consumer downstream - design-family fit, hero variant,
// palette anchor - then had to make a decision from a difference that small, and could
// not. That is the single upstream cause of hero centered 15/20, of the design-family
// lottery (entropy 2.87 of 3.00), and of the palette clustering.
//
// WHY AMPLIFICATION IS THE RIGHT FIX AND NOT A HACK
//
// Three hypotheses were killed before landing here (see the audit scripts):
//   - "the DNA computation compresses the signal" - false, it retains 117%
//   - "dimensions fall back to the neutral default"  - false, only 4% of cells do
//   - "the analyser cannot tell two businesses apart" - false, 18 of 20 are distinct
//
// What survived is that the ORDER is right and the SCALE is wrong. `npm run audit:ordering`
// asserts twelve rankings a person would agree with before reading any code - an emergency
// plumber above an architecture studio on urgency, a lawyer above a restaurant on
// authority - and finds 11 correct, 1 indistinguishable, 0 inverted. Amplifying a correct
// ranking sharpens it. That check is the precondition for this file existing, and the
// regression guard if the analysers are ever rewritten: amplifying a WRONG ranking would
// produce twenty pages that differ confidently and incorrectly, which is worse than today
// because it looks like differentiation without being it.
//
// WHAT THIS IS NOT
//
// Not a normalisation against the corpus at runtime - the pipeline sees one business at a
// time and can never know a population. These are fixed constants, measured once offline,
// applied as a pure monotone function to a single value. Ordering is therefore preserved
// for ANY input, including businesses unlike anything in the corpus.

interface Calibration {
  // The observed centre of the corpus for this dimension. Expansion happens AROUND it
  // rather than around 0.5, so a business sitting at the centre keeps its absolute value
  // and the meaning of downstream absolute thresholds is preserved. Only the distance from
  // the centre grows.
  center: number;
  gain: number;
}

// Healthy axes elsewhere in the system sit near sd 0.18 - roundedness 0.178, elevation
// 0.190, saturation 0.197 - and those are the ones that visibly differentiate pages. That
// is the target, not an arbitrary number.
const TARGET_SD = 0.18;

// Ceiling on amplification. A dimension with sd 0.037 would need a gain of 4.9 to reach
// the target, and at that point the transform is mostly magnifying whatever noise sits in
// the last decimal of a lexicon hit. Capped at 3, which leaves purchaseUrgency short of
// target on purpose: the honest fix for an axis with 3 distinct values is more resolution
// in the analyser, not more volume on the same three values.
const MAX_GAIN = 3.0;

// The policy that produced every gain in the table below, kept executable rather than
// described in a comment: re-running `npm run audit:signal` after any analyser change and
// feeding the observed sd back through this reproduces the constants, and the unit test
// asserts the table still matches its own policy.
export function deriveGain(observedSd: number): number {
  if (observedSd <= 0) return 1;
  return Math.min(TARGET_SD / observedSd, MAX_GAIN);
}

// Measured with `npm run audit:signal` over app/benchmark/businesses.ts. Regenerate these
// if the analysers change materially - the ordering audit will catch it if they drift.
const CALIBRATION: Record<string, Calibration> = {
  purchaseUrgency: { center: 0.456, gain: 3.0 }, // observed sd 0.037 - capped
  buyerSophistication: { center: 0.452, gain: 3.0 }, // observed sd 0.048 - capped
  pricePositioning: { center: 0.479, gain: 3.0 }, // observed sd 0.058 - capped
  competitionLevel: { center: 0.462, gain: 2.45 }, // observed sd 0.073
  visualImportance: { center: 0.503, gain: 1.93 }, // observed sd 0.093
  emotionalVsRational: { center: 0.506, gain: 1.83 }, // observed sd 0.099
  riskPerception: { center: 0.515, gain: 1.59 }, // observed sd 0.113
  trustDifficulty: { center: 0.514, gain: 1.53 }, // observed sd 0.118
  offerComplexity: { center: 0.431, gain: 1.24 }, // observed sd 0.146
  authorityRequirement: { center: 0.558, gain: 1.11 }, // observed sd 0.161
  decisionComplexity: { center: 0.425, gain: 1.09 }, // observed sd 0.165
};

// Pure, monotone, order-preserving for any pair of inputs. An unknown dimension passes
// through untouched rather than guessing a calibration for it.
export function calibrateSignal(dimension: keyof BusinessIntelligenceProfile, raw: number): number {
  const calibration = CALIBRATION[dimension as string];
  if (!calibration) return clamp01(raw);

  return clamp01(calibration.center + (raw - calibration.center) * calibration.gain);
}

export const CALIBRATED_DIMENSIONS = Object.keys(CALIBRATION);
