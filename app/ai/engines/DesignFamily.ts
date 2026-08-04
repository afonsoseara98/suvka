import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { StrategyDNA } from "../types/dna";
import { clamp01 } from "../utils/math";
import { seededPick } from "../utils/seed";

// DESIGN FAMILIES
//
// VisualEngine.ts computes a single continuous point in visual-DNA-space per business.
// That point is precise but, on its own, converges: two businesses with close
// BusinessIntelligenceProfile signals land close together in that space too, which is
// exactly why generated pages were reading as "one generator's house style." A design
// family is a named, principled PERTURBATION of that point - not a replacement for it,
// not a category the renderer switches on (nothing downstream of applyDesignFamily
// knows a family was ever chosen; it only ever sees the resulting StrategyDNA numbers).
// Every offset here is deliberately additive and clamped, never a hard override - a
// "Bold" business stays wherever VisualEngine put it on colorTemperature, it just gets
// pushed toward higher saturation/accent/elevation from there.
//
// Which family applies is itself signal-driven (a fit score per family, the same
// pattern as every other scored decision in this pipeline) with the design seed
// breaking ties among families that fit similarly well - see resolveDesignFamily.
export type DesignFamilyName =
  | "minimal"
  | "editorial"
  | "bold"
  | "corporate"
  | "playful"
  | "elegant"
  | "highEndAgency"
  | "startupDashboard";

type DnaAdjustments = Partial<
  Record<
    Extract<
      keyof StrategyDNA,
      | "density"
      | "roundedness"
      | "decorationDensity"
      | "saturation"
      | "contentWidth"
      | "elevation"
      | "typeScale"
      | "typeWeight"
      | "accentIntensity"
      | "colorTemperature"
    >,
    number
  >
>;

// Each family's identity, in one sentence, plus the additive DNA offsets that express
// it. Loosely inspired by real design languages named in the brief (an "Apple-like"
// restraint reads as low density/low decoration/high content width here; a
// "Stripe-like" confidence reads as highEndAgency's elevation+visual weight; a
// "Linear-like" density reads as startupDashboard) - never a literal clone, just the
// same qualitative direction expressed as numbers.
const DESIGN_FAMILIES: Record<DesignFamilyName, DnaAdjustments> = {
  // Restrained, spacious, almost no decoration - let the content breathe.
  minimal: { density: -0.25, decorationDensity: -0.3, roundedness: -0.15, saturation: -0.2, contentWidth: -0.1, elevation: -0.2 },

  // Narrow column, oversized type, magazine-like - a considered read, not a scan.
  editorial: { contentWidth: -0.35, typeScale: 0.15, roundedness: -0.2, density: -0.15, decorationDensity: -0.15 },

  // Loud, high-contrast, energetic - impossible to scroll past without noticing.
  bold: { saturation: 0.25, accentIntensity: 0.25, elevation: 0.2, typeWeight: 0.2, roundedness: 0.1 },

  // Buttoned-up, low-decoration, confidence through restraint rather than flourish.
  corporate: { saturation: -0.2, roundedness: -0.25, decorationDensity: -0.25, elevation: -0.15, contentWidth: 0.1 },

  // Warm, round, bouncy - approachable rather than authoritative.
  playful: { roundedness: 0.3, saturation: 0.2, decorationDensity: 0.15, colorTemperature: 0.15 },

  // Refined and spacious with just enough depth to feel considered, never loud.
  elegant: { density: -0.2, roundedness: -0.1, saturation: -0.15, elevation: 0.1, typeScale: 0.1, contentWidth: -0.15 },

  // Dramatic, big visuals, confident - portfolio-grade presentation.
  highEndAgency: { contentWidth: 0.15, elevation: 0.25, decorationDensity: 0.1, typeScale: 0.15, roundedness: -0.1 },

  // Data-dense, glow-heavy, modern SaaS product feel.
  startupDashboard: { density: 0.2, decorationDensity: 0.2, elevation: 0.15, roundedness: 0.05 },
};

// How well each family's identity matches this specific business - the same
// score-every-option-then-let-the-seed-break-near-ties pattern used for phase order
// (LayoutIntelligence.ts) and, before that, archetype/style resolution. A family with
// weight 0 for this business can still theoretically be drawn (seededPick treats 0 as
// "excluded", so in practice it never is) - what varies who ACTUALLY wins is how many
// families clear a meaningful fit, which is normal: most businesses genuinely suit two
// or three visual languages, not exactly one.
const FAMILY_FIT: Record<DesignFamilyName, (bi: BusinessIntelligenceProfile) => number> = {
  minimal: (bi) => clamp01(bi.pricePositioning * 0.4 + (1 - bi.visualImportance) * 0.3 + (1 - bi.emotionalVsRational) * 0.3),
  editorial: (bi) => clamp01(bi.pricePositioning * 0.3 + bi.visualImportance * 0.3 + (1 - bi.purchaseUrgency) * 0.4),
  bold: (bi) => clamp01(bi.purchaseUrgency * 0.4 + bi.emotionalVsRational * 0.3 + (1 - bi.pricePositioning) * 0.3),
  corporate: (bi) => clamp01(bi.authorityRequirement * 0.4 + bi.trustDifficulty * 0.35 + (1 - bi.visualImportance) * 0.25),
  playful: (bi) => clamp01(bi.emotionalVsRational * 0.4 + (1 - bi.authorityRequirement) * 0.3 + (1 - bi.pricePositioning) * 0.3),
  elegant: (bi) => clamp01(bi.pricePositioning * 0.5 + bi.visualImportance * 0.25 + (1 - bi.purchaseUrgency) * 0.25),
  highEndAgency: (bi) => clamp01(bi.visualImportance * 0.45 + bi.competitionLevel * 0.25 + bi.pricePositioning * 0.3),
  startupDashboard: (bi) => clamp01(bi.offerComplexity * 0.4 + bi.decisionComplexity * 0.3 + (1 - bi.visualImportance) * 0.3),
};

// Fit scores are cubed before weighting the draw: with 8 competing families, a flat
// proportional draw would let a business that fits "corporate" decisively (say 0.85)
// still lose to the combined mass of five families it merely somewhat fits (0.3-0.5
// each) most of the time - the opposite of what a fit score is for. Cubing preserves
// seededPick's honest property (nothing with non-zero fit is ever fully excluded) while
// making a genuinely dominant fit dominate the draw, so the seed's influence is
// concentrated where it belongs: breaking ties among families that fit ALMOST equally
// well, not overriding a business whose signals clearly point one way.
const FIT_SHARPENING_POWER = 3;

export function resolveDesignFamily(bi: BusinessIntelligenceProfile, random: () => number): DesignFamilyName {
  const options = (Object.keys(DESIGN_FAMILIES) as DesignFamilyName[]).map((name) => ({
    value: name,
    weight: FAMILY_FIT[name](bi) ** FIT_SHARPENING_POWER,
  }));

  return seededPick(random, options);
}

// Applies a family's offsets on top of an already-computed StrategyDNA - additive,
// clamped per field, every field VisualEngine didn't touch stays exactly as it was.
export function applyDesignFamily(dna: StrategyDNA, family: DesignFamilyName): StrategyDNA {
  const adjustments = DESIGN_FAMILIES[family];
  const next = { ...dna };

  for (const key of Object.keys(adjustments) as (keyof DnaAdjustments)[]) {
    const offset = adjustments[key];
    if (offset !== undefined) {
      next[key] = clamp01(dna[key] + offset);
    }
  }

  return next;
}
