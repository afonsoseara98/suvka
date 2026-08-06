import type { GatedRole } from "../builders/LayoutIntelligence";
import { GATED_ROLES } from "../builders/LayoutIntelligence";

// STRATEGY DNA
//
// Replaces every categorical decision this pipeline used to make (PageArchetype,
// DesignSystem.style/heroVariant/cardStyle/pricingVariant, HeroStrategy.headlineLength/
// imagery/whitespace/proofPlacement, TrustStrategy.credibilityApproach/proofDensity/
// objectionHandling, CtaStrategy.style/commitmentFraming, PricingStrategy.presentation/
// emphasis/anchoring) with ONE continuous descriptor. Nothing here picks "luxury" or
// "soft CTA" - every field is a 0-1 (or named-role -> 0-1) number, and the renderer's
// job is to COMPILE this into concrete CSS/React output (see app/styles/dnaCompiler.ts),
// not to select a pre-authored variant that happens to match a label.
//
// The only place a discrete choice survives past this type is where the DOM itself is
// discrete (a section either exists in the array or it doesn't; a literal React
// component tree has to be one specific tree, not a blend of two) - and even those are
// derived from a DNA field via a single threshold at the compiler boundary, never
// stored as a category here and never looked up from an industry/archetype table.
export interface StrategyDNA {
  // Per-role structural pull - continuous, computed directly from
  // BusinessIntelligenceProfile + CompositionSignals (see LayoutIntelligence.ts). This
  // is what PageArchetype used to be: instead of classifying the business into one of 9
  // named shapes and looking up a small nudge table, every role's pull is now a direct
  // function of the business's own signals. Section presence/order still has to be a
  // discrete array in the end (the DOM has no "60% of a pricing section"), but that
  // array is built by thresholding these weights at the last possible moment, in
  // LayoutIntelligence.ts, not by picking a label upstream.
  sectionWeight: Record<GatedRole, number>;

  // Narrative pacing
  urgency: number; // 0 no rush - 1 act now
  complexity: number; // 0 self-explanatory - 1 needs real room to explain

  // Color
  colorTemperature: number; // 0 cool - 1 warm
  saturation: number; // 0 muted - 1 vivid
  brightness: number; // 0 dark theme - 1 light theme
  accentIntensity: number; // 0 subtle accent - 1 bold/saturated accent

  // Shape & elevation
  roundedness: number; // 0 sharp corners - 1 fully rounded
  elevation: number; // 0 flat - 1 deep shadow/glow
  decorationDensity: number; // 0 no glow/texture - 1 heavy decoration

  // Spacing & density
  density: number; // 0 spacious/editorial - 1 dense/packed
  contentWidth: number; // 0 narrow editorial column - 1 full-width

  // Typography
  typeScale: number; // 0 restrained - 1 oversized/dramatic headlines
  typeWeight: number; // 0 light - 1 black

  // Hero
  heroSplitLean: number; // 0 centered/stacked - 1 fully split (image beside text)
  heroImageryProminence: number; // 0 minimal/no imagery - 1 immersive
  emotionalIntensity: number; // 0 rational/concrete - 1 emotionally driven

  // Trust
  credibilityRationalLean: number; // 0 social-proof/emotional - 1 data/credentials-led
  proofDensity: number; // 0 minimal - 1 heavy
  authorityEmphasis: number; // 0-1
  objectionProactivity: number; // 0 reactive - 1 proactive

  // CTA
  ctaUrgency: number; // 0 soft - 1 urgent
  ctaCommitmentWeight: number; // 0 low-commitment framing - 1 considered/high-commitment

  // Pricing
  priceEmphasis: number; // 0 understated - 1 prominent
  priceAnchoring: number; // 0 no anchor - 1 strong anchor framing
  priceComplexityLean: number; // 0 exact numbers - 1 custom-quote framing
}

// The neutral midpoint of every axis. buildPipeline() always produces a complete DNA, so
// this is never needed for a freshly generated page - it exists for DNA that has been
// through storage and back.
//
// That case became load-bearing the moment publishing started persisting a materialized
// PageState (prisma/schema.prisma's Page.publishedState): a published snapshot is frozen
// JSON written by whatever version of this type existed on the day it was published. Add
// one field to StrategyDNA next month and every already-published site would compile
// `lerp(a, b, undefined)` -> NaN and render `clamp(NaNrem, NaNvw, NaNrem)` - which is
// exactly what a live check of the served HTML caught before this existed.
//
// So the compilers normalize before they read (see compileTheme/compileLayout): a missing
// axis falls back to neutral instead of poisoning every CSS value derived from it.
const NEUTRAL_AXIS = 0.5;

// Derived from GATED_ROLES rather than written out by hand: a role added there must not
// be able to silently go missing here, which is the same class of drift this whole
// defaulting mechanism exists to absorb.
export const DEFAULT_SECTION_WEIGHT: Record<GatedRole, number> = Object.fromEntries(
  GATED_ROLES.map((role) => [role, NEUTRAL_AXIS])
) as Record<GatedRole, number>;

export const DEFAULT_DNA: StrategyDNA = {
  sectionWeight: DEFAULT_SECTION_WEIGHT,
  urgency: NEUTRAL_AXIS,
  complexity: NEUTRAL_AXIS,
  colorTemperature: NEUTRAL_AXIS,
  saturation: NEUTRAL_AXIS,
  brightness: NEUTRAL_AXIS,
  accentIntensity: NEUTRAL_AXIS,
  roundedness: NEUTRAL_AXIS,
  elevation: NEUTRAL_AXIS,
  decorationDensity: NEUTRAL_AXIS,
  density: NEUTRAL_AXIS,
  contentWidth: NEUTRAL_AXIS,
  typeScale: NEUTRAL_AXIS,
  typeWeight: NEUTRAL_AXIS,
  heroSplitLean: NEUTRAL_AXIS,
  heroImageryProminence: NEUTRAL_AXIS,
  emotionalIntensity: NEUTRAL_AXIS,
  credibilityRationalLean: NEUTRAL_AXIS,
  proofDensity: NEUTRAL_AXIS,
  authorityEmphasis: NEUTRAL_AXIS,
  objectionProactivity: NEUTRAL_AXIS,
  ctaUrgency: NEUTRAL_AXIS,
  ctaCommitmentWeight: NEUTRAL_AXIS,
  priceEmphasis: NEUTRAL_AXIS,
  priceAnchoring: NEUTRAL_AXIS,
  priceComplexityLean: NEUTRAL_AXIS,
};

// Fills in any axis that is missing or not a finite number. Deliberately checks
// Number.isFinite rather than `?? default`: a stored null, a string that survived a JSON
// round trip, or an already-NaN value are all just as damaging as an absent key, and all
// three would slip past a nullish check.
export function withDnaDefaults(dna: Partial<StrategyDNA> | null | undefined): StrategyDNA {
  const source = dna ?? {};
  const result = { ...DEFAULT_DNA, sectionWeight: { ...DEFAULT_SECTION_WEIGHT, ...(source.sectionWeight ?? {}) } };

  for (const key of Object.keys(DEFAULT_DNA) as (keyof StrategyDNA)[]) {
    if (key === "sectionWeight") continue;
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      (result[key] as number) = value;
    }
  }

  return result;
}
