import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { StrategyDNA } from "../types/dna";
import { clamp01 } from "../utils/math";

// VISUAL ENGINE
//
// Replaces DesignPlanner.ts's DesignSystem (a DesignStyle enum + a Record<DesignStyle,
// concrete-values> bundle looked up by that enum). There is no "style" anymore - every
// visual dimension (color temperature/saturation/brightness/accent, shape/elevation/
// decoration, density/width, type scale/weight) is its own continuous 0-1 value,
// computed directly from BusinessIntelligenceProfile. Turning these numbers into actual
// CSS (hex colors, px radii, shadow strength) is app/styles/dnaCompiler.ts's job, not
// this engine's - this file only ever decides WHAT the business needs, never HOW that
// renders.

export type VisualDNA = Pick<
  StrategyDNA,
  | "colorTemperature"
  | "saturation"
  | "brightness"
  | "accentIntensity"
  | "roundedness"
  | "elevation"
  | "decorationDensity"
  | "density"
  | "contentWidth"
  | "typeScale"
  | "typeWeight"
>;

export function resolveVisualDNA(bi: BusinessIntelligenceProfile): VisualDNA {
  const colorTemperature = clamp01(bi.emotionalVsRational * 0.6 + (1 - bi.authorityRequirement) * 0.2 + (1 - bi.trustDifficulty) * 0.2);

  const saturation = clamp01(
    bi.emotionalVsRational * 0.35 + bi.visualImportance * 0.35 + bi.purchaseUrgency * 0.2 - bi.pricePositioning * 0.3
  );

  // Most business identities in this system read as dark by default - brightness only
  // climbs meaningfully for genuinely clinical/high-trust businesses (a base of 0.3
  // rather than 0.5 keeps that the exception, not the midpoint).
  const brightness = clamp01(
    0.3 + bi.trustDifficulty * 0.4 + bi.authorityRequirement * 0.3 - bi.emotionalVsRational * 0.2 - bi.purchaseUrgency * 0.1
  );

  const accentIntensity = clamp01(
    bi.purchaseUrgency * 0.4 + bi.emotionalVsRational * 0.3 + bi.visualImportance * 0.2 - bi.pricePositioning * 0.2
  );

  const roundedness = clamp01(0.6 + bi.emotionalVsRational * 0.2 - bi.pricePositioning * 0.25 - bi.authorityRequirement * 0.15);

  const elevation = clamp01(bi.visualImportance * 0.4 + bi.purchaseUrgency * 0.3 + bi.emotionalVsRational * 0.2 - bi.trustDifficulty * 0.1);

  const decorationDensity = clamp01(
    bi.emotionalVsRational * 0.4 + bi.visualImportance * 0.3 + bi.purchaseUrgency * 0.2 - bi.authorityRequirement * 0.2 - bi.trustDifficulty * 0.2
  );

  const density = clamp01(0.5 + bi.decisionComplexity * 0.2 + bi.offerComplexity * 0.2 - bi.pricePositioning * 0.35);

  const contentWidth = clamp01(0.6 - bi.pricePositioning * 0.4 + bi.decisionComplexity * 0.15);

  const typeScale = clamp01(0.4 + bi.emotionalVsRational * 0.3 + bi.purchaseUrgency * 0.2 + bi.visualImportance * 0.1 - bi.authorityRequirement * 0.15);

  const typeWeight = clamp01(0.4 + bi.purchaseUrgency * 0.3 + bi.emotionalVsRational * 0.2 - bi.authorityRequirement * 0.1);

  return {
    colorTemperature,
    saturation,
    brightness,
    accentIntensity,
    roundedness,
    elevation,
    decorationDensity,
    density,
    contentWidth,
    typeScale,
    typeWeight,
  };
}
