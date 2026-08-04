import type { StrategyDNA } from "../types/dna";
import type { DesignFamilyName } from "../engines/DesignFamily";
import type { SectionType, HeroVariant } from "@/app/types/landing";
import { clamp01 } from "../utils/math";

// DIVERSITY SCORE
//
// A real, deterministic, testable measure of how different two generated pages are -
// 0 means indistinguishable, 1 means maximally different. Combines three independent
// signals so a genuinely different page can't hide behind sameness on the others:
//   - DNA distance (50%): the average absolute difference across every continuous
//     StrategyDNA dimension (colors, shape, spacing, hero framing, trust/CTA/pricing
//     framing) plus the per-role section-weight vector.
//   - Structural distance (30%): normalized edit distance between the two pages'
//     section-role sequences - two pages sharing every section but in a different
//     order, or with a different section COUNT, register as structurally different,
//     not just "the same list."
//   - Categorical distance (20%): whether the design family and hero variant differ -
//     two genuinely continuous-DNA-close pages that land in different design families
//     still read as different work.
export interface GenerationFingerprint {
  dna: StrategyDNA;
  designFamily: DesignFamilyName;
  sectionSequence: readonly SectionType[];
  heroVariant: HeroVariant;
}

function dnaDistance(a: StrategyDNA, b: StrategyDNA): number {
  const scalarKeys = (Object.keys(a) as (keyof StrategyDNA)[]).filter((key) => key !== "sectionWeight");

  const scalarDiff =
    scalarKeys.reduce((sum, key) => sum + Math.abs((a[key] as number) - (b[key] as number)), 0) / scalarKeys.length;

  const roles = Object.keys(a.sectionWeight) as (keyof StrategyDNA["sectionWeight"])[];
  const weightDiff = roles.reduce((sum, role) => sum + Math.abs(a.sectionWeight[role] - b.sectionWeight[role]), 0) / roles.length;

  return clamp01(scalarDiff * 0.7 + weightDiff * 0.3);
}

// Standard Levenshtein edit distance over the two role sequences - insertions,
// deletions and substitutions all cost 1. Normalized by the longer sequence's length
// so the result is comparable across pages of different section counts.
function levenshtein<T>(a: readonly T[], b: readonly T[]): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[rows - 1][cols - 1];
}

function structuralDistance(a: readonly SectionType[], b: readonly SectionType[]): number {
  const maxLength = Math.max(a.length, b.length, 1);
  return clamp01(levenshtein(a, b) / maxLength);
}

function categoricalDistance(a: GenerationFingerprint, b: GenerationFingerprint): number {
  const familyDiff = a.designFamily === b.designFamily ? 0 : 1;
  const heroDiff = a.heroVariant === b.heroVariant ? 0 : 1;
  return (familyDiff + heroDiff) / 2;
}

export function computeDiversityScore(a: GenerationFingerprint, b: GenerationFingerprint): number {
  const dna = dnaDistance(a.dna, b.dna);
  const structure = structuralDistance(a.sectionSequence, b.sectionSequence);
  const categorical = categoricalDistance(a, b);

  return clamp01(dna * 0.5 + structure * 0.3 + categorical * 0.2);
}
