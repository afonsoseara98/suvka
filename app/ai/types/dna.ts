import type { GatedRole } from "../builders/LayoutIntelligence";

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
