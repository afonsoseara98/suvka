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
// DOMINANCE, NOT AVERAGING
//
// Each fit used to be a weighted average of three dimensions with weights summing to 1.0.
// Averaging n roughly-independent terms retains only sqrt(sum(w^2)) of a single term's
// spread - about 58% for three equal terms - and because all eight fits averaged
// OVERLAPPING dimensions, they moved together and their differences shrank further.
//
// Measured consequence: sweeping 400 seeds per business gave mean entropy 2.87 of a
// possible 3.00 bits. The selection was a near-uniform lottery over seven of eight
// families; 18 of 20 businesses did not receive their own best fit. Amplifying the
// analysers upstream (see signalCalibration.ts) barely moved it - 2.87 to 2.72 - because
// the averaging here re-compressed what had just been amplified.
//
// A family now wins on the ONE dimension that defines it, at full amplitude, with the
// others modulating rather than diluting. `highEndAgency` is the family for a business
// whose visuals are the product - that should be decided by visualImportance, not by
// visualImportance averaged with two things that have nothing to do with it.
//
// The eight primaries are deliberately four opposed pairs, so the vocabulary spans real
// disagreements rather than eight variations of the same preference:
//   visualImportance   highEndAgency <-> minimal
//   purchaseUrgency    bold          <-> editorial
//   pricePositioning   elegant       <-> (playful's inverse support)
//   authorityRequirement corporate   <-> playful
interface FamilyFit {
  // The dimension that defines this family. Enters at full amplitude.
  primary: (bi: BusinessIntelligenceProfile) => number;
  // Modulate the primary between SUPPORT_FLOOR and 1. A family with a strong primary and
  // weak supports still scores respectably; strong on both dominates.
  supports: ReadonlyArray<(bi: BusinessIntelligenceProfile) => number>;
}

// How far weak supports may pull a strong primary down. At 0 the supports would be able to
// veto the primary entirely, which reintroduces averaging by another name.
const SUPPORT_FLOOR = 0.55;

const FAMILY_FIT_SPEC: Record<DesignFamilyName, FamilyFit> = {
  minimal: {
    primary: (bi) => 1 - bi.visualImportance,
    supports: [(bi) => bi.pricePositioning, (bi) => 1 - bi.emotionalVsRational],
  },
  editorial: {
    primary: (bi) => 1 - bi.purchaseUrgency,
    supports: [(bi) => bi.pricePositioning, (bi) => bi.visualImportance],
  },
  bold: {
    primary: (bi) => bi.purchaseUrgency,
    supports: [(bi) => bi.emotionalVsRational, (bi) => 1 - bi.pricePositioning],
  },
  corporate: {
    primary: (bi) => bi.authorityRequirement,
    supports: [(bi) => bi.trustDifficulty, (bi) => 1 - bi.visualImportance],
  },
  playful: {
    primary: (bi) => bi.emotionalVsRational,
    supports: [(bi) => 1 - bi.authorityRequirement, (bi) => 1 - bi.pricePositioning],
  },
  elegant: {
    primary: (bi) => bi.pricePositioning,
    supports: [(bi) => bi.visualImportance, (bi) => 1 - bi.purchaseUrgency],
  },
  highEndAgency: {
    primary: (bi) => bi.visualImportance,
    supports: [(bi) => bi.competitionLevel, (bi) => bi.pricePositioning],
  },
  startupDashboard: {
    primary: (bi) => bi.offerComplexity,
    supports: [(bi) => bi.decisionComplexity, (bi) => 1 - bi.visualImportance],
  },
};

// RELATIVE, NOT ABSOLUTE
//
// Scoring the primary on its raw value made `corporate` win for 7 of 20 businesses - a
// lawyer, a dentist, a psychologist, a consultant, a physiotherapist and two trades - for
// the mundane reason that authorityRequirement runs high across service businesses
// generally (corpus centre 0.558, the highest of any dimension). Absolute height says
// "this business needs authority". It does not say "authority is what this business is
// ABOUT", and only the second is a reason to choose a visual language.
//
// A family therefore wins when its defining dimension is the business's OWN most
// distinctive trait, measured against that business's other traits. Every business has a
// different strongest characteristic, so this spreads for a principled reason rather than
// by injecting randomness - which is what the seeded lottery was doing, and why it sent a
// wedding planner to `corporate`.
const DISTINCTIVENESS_GAIN = 1.9;

function profileMean(bi: BusinessIntelligenceProfile): number {
  const values = Object.values(bi).filter((v): v is number => typeof v === "number");
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const FAMILY_FIT: Record<DesignFamilyName, (bi: BusinessIntelligenceProfile) => number> = Object.fromEntries(
  (Object.keys(FAMILY_FIT_SPEC) as DesignFamilyName[]).map((name) => {
    const { primary, supports } = FAMILY_FIT_SPEC[name];
    return [
      name,
      (bi: BusinessIntelligenceProfile) => {
        // How far this dimension stands out from the rest of this business's profile.
        const distinctiveness = clamp01(0.5 + (clamp01(primary(bi)) - profileMean(bi)) * DISTINCTIVENESS_GAIN);
        const support = supports.reduce((sum, f) => sum + clamp01(f(bi)), 0) / supports.length;
        return clamp01(distinctiveness * (SUPPORT_FLOOR + (1 - SUPPORT_FLOOR) * support));
      },
    ];
  })
) as Record<DesignFamilyName, (bi: BusinessIntelligenceProfile) => number>;

// Fit scores are cubed before weighting the draw: with 8 competing families, a flat
// proportional draw would let a business that fits "corporate" decisively (say 0.85)
// still lose to the combined mass of five families it merely somewhat fits (0.3-0.5
// each) most of the time - the opposite of what a fit score is for. Cubing preserves
// seededPick's honest property (nothing with non-zero fit is ever fully excluded) while
// making a genuinely dominant fit dominate the draw, so the seed's influence is
// concentrated where it belongs: breaking ties among families that fit ALMOST equally
// well, not overriding a business whose signals clearly point one way.
// Swept against two acceptance criteria in tension: the business must actually decide
// (measured as the winning family holding >50% of the draw) and the corpus must not
// collapse onto one family. At 3 only 5 of 20 businesses decided their own direction - the
// seed did. At 14, all 20 decide, and the distribution is unchanged from the deterministic
// argmax, which means the remaining spread is signal rather than noise.
//
// The seeded draw is deliberately kept rather than replaced with a plain argmax: two
// families that genuinely fit equally well should still be separable, and the seed is the
// honest way to break that tie. What changed is that near-parity is now rare instead of
// universal.
const FIT_SHARPENING_POWER = 14;

export function familyFitScores(bi: BusinessIntelligenceProfile): Record<DesignFamilyName, number> {
  return Object.fromEntries(
    (Object.keys(FAMILY_FIT) as DesignFamilyName[]).map((n) => [n, FAMILY_FIT[n](bi)])
  ) as Record<DesignFamilyName, number>;
}

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
