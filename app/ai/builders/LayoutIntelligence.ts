import type { CompositionSignals } from "../types/signals";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { LandingComposition, CompositionSection } from "../types/composition";
import type { SectionType, SectionProminence, SectionRhythm, HeroVariant } from "@/app/types/landing";
import { clamp01 } from "../utils/math";
import { seededPick } from "../utils/seed";

// LAYOUT INTELLIGENCE
//
// What this replaces: a Record<PageArchetype, LandingComposition> - nine hand-authored
// full-page structures, and later, a PageArchetype classification step with a small
// per-archetype nudge table (BIAS_BY_ARCHETYPE). Both were categorical: two businesses
// landing on the same archetype/bucket got the exact same treatment, because the shape
// was a lookup table's *value*, not something computed. PageArchetype has been removed
// entirely - every role's "pull" is now a direct, continuous function of
// BusinessIntelligenceProfile + CompositionSignals. What used to be "luxury archetype
// suppresses pricing/stats by a fixed amount" is now "pricing/stats weight falls off
// smoothly as pricePositioning rises" - the same compositional reasoning, expressed as
// a formula instead of a label lookup.
//
// The generative core is a narrative grammar of PHASES (hook -> context -> value ->
// proof -> decision -> objection -> close). Every SectionType belongs to exactly one
// phase (ROLE_PHASE - a single flat map, not a switch, not a per-archetype anything).
// For each phase, in order: every role in that phase is scored by a per-role weight
// function of the signals, gated by a per-role inclusion threshold, and the surviving
// roles are emitted sorted by weight. That's the entire ordering algorithm - one loop
// over phases, one filter, one sort. Nothing here special-cases a specific role by name
// inside the sequencing logic itself. Section presence in the final array is still a
// discrete fact (the DOM has no "60% of a pricing section") - but that's a threshold
// applied at the very last step, never a category chosen upstream.
//
// The result space is combinatorial, not enumerated: 11 continuous BI dimensions x 6
// composition signals x 7 gated roles x continuous CTA/rhythm/prominence bands means
// the reachable set of distinct (order, count, repetition, rhythm) page shapes is
// effectively unbounded, without a single one of them having been written down.

type NarrativePhase = "hook" | "context" | "value" | "proof" | "decision" | "objection" | "close";
type ContentPhase = Exclude<NarrativePhase, "hook" | "close">;

// STRUCTURAL DIVERSITY: previously a single fixed content order (context -> value ->
// proof -> decision -> objection) ran for every business - inclusion/exclusion and
// prominence were signal-driven, but the SHAPE of the narrative arc itself never
// varied, which is a real source of "every page feels like the same generator" even
// once colors/spacing/copy diverge. Each variant below is a narratively legitimate
// reordering (leading with proof for a business that needs to earn belief before
// anything else lands, leading straight to the offer for an urgent/simple sale,
// surfacing objections before the pitch for a business where skepticism is the real
// barrier) - resolvePhaseOrder scores every variant against the business's own
// signals and lets the design seed (see utils/seed.ts) pick among them weighted by
// fit, so two businesses with similar-but-not-identical signals are meaningfully
// likely to land on different variants instead of the strongest-scoring one winning
// every time by a hair.
const PHASE_ORDER_VARIANTS = {
  standard: ["context", "value", "proof", "decision", "objection"],
  proofLed: ["proof", "context", "value", "decision", "objection"],
  decisionLed: ["value", "decision", "proof", "objection", "context"],
  objectionFirst: ["context", "objection", "value", "proof", "decision"],
} as const satisfies Record<string, readonly ContentPhase[]>;

type PhaseOrderVariant = keyof typeof PHASE_ORDER_VARIANTS;

const PHASE_ORDER_FIT: Record<PhaseOrderVariant, (signals: CompositionSignals) => number> = {
  // A real, always-legitimate default - never zero, so it stays in the running even
  // when nothing else about the business is distinctive.
  standard: () => 0.45,
  proofLed: (s) => clamp01(s.socialProofNeed * 0.7 + s.trustNeed * 0.3),
  decisionLed: (s) => clamp01(s.urgency * 0.6 + (1 - s.complexity) * 0.4),
  objectionFirst: (s) => clamp01(s.objectionPressure * 0.85),
};

// Cubed for the same reason DesignFamily.ts sharpens its own fit scores: with 4
// competing variants, an unsharpened proportional draw lets a business that clearly
// needs one narrative shape still lose to the combined mass of the other three most of
// the time. Cubing keeps a decisive fit decisive while still leaving real room for the
// seed to matter when two variants fit almost equally well.
const FIT_SHARPENING_POWER = 3;

export function resolvePhaseOrder(signals: CompositionSignals, random: () => number): readonly ContentPhase[] {
  const options = (Object.keys(PHASE_ORDER_VARIANTS) as PhaseOrderVariant[]).map((name) => ({
    value: PHASE_ORDER_VARIANTS[name],
    weight: PHASE_ORDER_FIT[name](signals) ** FIT_SHARPENING_POWER,
  }));

  return seededPick(random, options);
}

// The one-and-only structural classification in this file: which storytelling job does
// each role do. This is a *taxonomy*, not a template - it says nothing about whether a
// role appears or where among its phase-mates it lands.
const ROLE_PHASE: Record<Exclude<SectionType, "hero" | "footer" | "cta">, NarrativePhase> = {
  logoCloud: "context",
  features: "value",
  benefits: "value",
  stats: "value",
  testimonials: "proof",
  pricing: "decision",
  faq: "objection",
};

export type GatedRole = Exclude<SectionType, "hero" | "footer" | "cta">;

export const GATED_ROLES: readonly GatedRole[] = [
  "logoCloud",
  "features",
  "benefits",
  "stats",
  "testimonials",
  "pricing",
  "faq",
];

interface RoleModel {
  weight(signals: CompositionSignals, bi: BusinessIntelligenceProfile): number;
  threshold: number;
}

// Every role's narrative "pull" as a direct function of the business's own signals -
// never a lookup keyed by a classification. threshold is the bar its weight has to
// clear to be included at all: this is what makes section COUNT a real per-business
// decision instead of a fixed list minus a couple of manual exceptions. The BI-driven
// terms below (second addend in most formulas) are what used to live in
// BIAS_BY_ARCHETYPE as a per-archetype nudge table - the same compositional reasoning
// (e.g. "a very premium business wants pricing/stats out of sight"), now expressed as a
// continuous term instead of nine hardcoded exceptions.
const ROLE_MODEL: Record<GatedRole, RoleModel> = {
  features: {
    weight: (s, bi) => clamp01(0.55 + s.complexity * 0.35 + bi.emotionalVsRational * 0.1 + bi.visualImportance * 0.15),
    threshold: 0.15, // near-universal: a page explaining nothing about the offer is broken
  },
  testimonials: {
    weight: (s, bi) =>
      clamp01(0.55 + s.socialProofNeed * 0.4 + bi.authorityRequirement * 0.2 + bi.emotionalVsRational * 0.15),
    threshold: 0.2, // near-universal: almost every business benefits from some proof
  },
  benefits: {
    // Base deliberately sits below its own threshold - unlike features/testimonials,
    // benefits earns its place from trustNeed, not by default.
    weight: (s) => clamp01(0.25 + s.trustNeed * 0.5),
    threshold: 0.35,
  },
  stats: {
    weight: (s, bi) => clamp01(s.trustNeed * 0.5 + s.socialProofNeed * 0.35 + bi.trustDifficulty * 0.15 - bi.pricePositioning * 0.3),
    threshold: 0.4,
  },
  logoCloud: {
    weight: (s, bi) =>
      clamp01(
        s.trustNeed * 0.6 +
          (1 - s.complexity) * 0.25 +
          bi.offerComplexity * 0.1 +
          bi.buyerSophistication * 0.1 +
          bi.competitionLevel * 0.15 -
          bi.pricePositioning * 0.25 -
          bi.visualImportance * 0.15 -
          bi.emotionalVsRational * 0.1
      ),
    threshold: 0.5, // the most conditional role: a quick trust flash only earns its place
  },
  pricing: {
    // Base deliberately sits below its own threshold so a genuinely price-sensitive
    // audience can result in real exclusion (a "talk to us" ask instead of a visible
    // price table) without needing a special case to make that happen.
    weight: (s, bi) => clamp01(0.25 + (1 - s.priceSensitivity) * 0.5 + bi.buyerSophistication * 0.15 - bi.pricePositioning * 0.4),
    threshold: 0.35,
  },
  faq: {
    weight: (s, bi) => clamp01(0.2 + s.objectionPressure * 0.6 + bi.riskPerception * 0.15 - bi.pricePositioning * 0.1),
    threshold: 0.3,
  },
};

// Exported alongside generateLayout (its only real "public API" for the rest of the
// pipeline) purely so tests can verify each piece of the decision on its own terms -
// weight/threshold/CTA-count/hero-variant are all meaningfully assertable in isolation,
// and testing them that way catches a regression far more precisely than only ever
// observing generateLayout's aggregate output.
export function weightOf(role: GatedRole, signals: CompositionSignals, bi: BusinessIntelligenceProfile): number {
  return ROLE_MODEL[role].weight(signals, bi);
}

export function thresholdFor(role: GatedRole): number {
  return ROLE_MODEL[role].threshold;
}

// Every gated role's continuous weight, keyed by role - this IS StrategyDNA.sectionWeight.
// PageArchetype used to be an intermediate label standing in for "which combination of
// these weights"; now the combination is the only thing that exists.
export function sectionWeightsFor(
  signals: CompositionSignals,
  bi: BusinessIntelligenceProfile
): Record<GatedRole, number> {
  return Object.fromEntries(GATED_ROLES.map((role) => [role, weightOf(role, signals, bi)])) as Record<GatedRole, number>;
}

export function prominenceFrom(weight: number): SectionProminence {
  if (weight >= 0.7) return "primary";
  if (weight <= 0.35) return "compact";
  return "standard";
}

// Complexity earns a section room to be absorbed (breather); a simple, urgent page
// stays tight (dense) so momentum never drops. Anything in between is "standard" -
// the same continuous read of the business that decided count and prominence also
// decides pacing, rather than a third, disconnected set of rules.
export function rhythmFrom(signals: CompositionSignals): SectionRhythm {
  if (signals.complexity >= 0.7) return "breather";
  if (signals.complexity <= 0.3 && signals.urgency >= 0.6) return "dense";
  return "standard";
}

// The one hero layout decision that stays genuinely structural (a literal different
// React component tree, not a CSS value a compiler can interpolate) - still derived
// from a continuous DNA field (heroSplitLean) via a single threshold at this boundary,
// never stored as its own category upstream.
export function heroVariantFor(heroSplitLean: number, priceEmphasis: number): HeroVariant {
  if (priceEmphasis <= 0.35 && heroSplitLean <= 0.35) return "minimal";
  if (heroSplitLean >= 0.6) return "split";
  return "centered";
}

// Selects and orders every role belonging to one phase: gate by threshold, then sort
// the survivors by weight (most narratively important first within that phase). This
// single function is the entire "order + count" algorithm - it runs identically for
// every phase, so a phase with zero eligible roles just contributes nothing, and a
// phase with three simply orders them by how much this specific business needs each.
function resolvePhase(
  phase: NarrativePhase,
  signals: CompositionSignals,
  bi: BusinessIntelligenceProfile
): CompositionSection[] {
  const roles = (Object.keys(ROLE_PHASE) as GatedRole[]).filter((role) => ROLE_PHASE[role] === phase);

  return roles
    .map((role) => ({ role, weight: weightOf(role, signals, bi) }))
    .filter(({ role, weight }) => weight >= ROLE_MODEL[role].threshold)
    .sort((a, b) => b.weight - a.weight)
    .map(({ role, weight }) => ({
      role,
      prominence: prominenceFrom(weight),
      rhythm: rhythmFrom(signals),
    }));
}

// CTA repetition and placement, as a formula over urgency and the page's own resulting
// length - not a fixed index. 0 CTAs below "give it a low-pressure nudge" territory, 1
// as the closing push once urgency clears that bar, a second, earlier one only once
// urgency is high enough that relying on a single end-of-page ask would leave real
// conversions on the table.
export function ctaCountFor(signals: CompositionSignals): 0 | 1 | 2 {
  if (signals.urgency >= 0.8) return 2;
  if (signals.urgency >= 0.55) return 1;
  return 0;
}

function insertCtas(sections: CompositionSection[], signals: CompositionSignals): CompositionSection[] {
  const count = ctaCountFor(signals);
  if (count === 0) {
    return sections;
  }

  const cta: CompositionSection = { role: "cta", prominence: "primary", rhythm: "breather" };
  const next = [...sections, cta]; // closing CTA: end of content, still before footer/close is appended separately

  if (count === 1) {
    return next;
  }

  // Second CTA sits right after the "value" phase - the first point in the page where
  // the reader has enough context for a mid-page ask to read as reinforcement, not a
  // non sequitur. Only fires when there's enough distance to the closing CTA to avoid
  // clustering (guaranteed by ctaCountFor requiring higher urgency, in practice always
  // several phases apart given value comes before proof/decision/objection).
  const lastValueIndex = next.reduce(
    (found, section, index) => (ROLE_PHASE[section.role as GatedRole] === "value" ? index : found),
    -1
  );

  if (lastValueIndex === -1 || lastValueIndex === next.length - 1) {
    return next;
  }

  const midCta: CompositionSection = { role: "cta", prominence: "standard", rhythm: "breather" };
  const withMidCta = [...next];
  withMidCta.splice(lastValueIndex + 1, 0, midCta);
  return withMidCta;
}

// No three consecutive sections share a rhythm - a page that never varies its pacing
// reads as flat no matter how well any single section is tuned. Runs over the FULL
// page including hero/footer (both always "standard"): a run can legitimately start or
// end at either anchor, so they have to participate in run-detection even though - by
// construction, since a run's middle element is always at index i+1 with i+2 still in
// bounds - they can never be the element this function actually rewrites.
function alternateRhythm(sections: CompositionSection[]): CompositionSection[] {
  const next = [...sections];

  for (let i = 0; i + 2 < next.length; i++) {
    const a = next[i].rhythm;
    if (next[i + 1].rhythm === a && next[i + 2].rhythm === a) {
      // Nudging to "standard" is only a real change when the run itself isn't already
      // "standard" - the most common rhythm value. A run of three "standard"s needs a
      // different escape value, or this is a no-op that leaves the run intact.
      const replacement: SectionRhythm = a === "standard" ? "dense" : "standard";
      next[i + 1] = { ...next[i + 1], rhythm: replacement };
    }
  }

  return next;
}

export function generateLayout(
  bi: BusinessIntelligenceProfile,
  signals: CompositionSignals,
  heroSplitLean: number,
  priceEmphasis: number,
  random: () => number
): LandingComposition {
  const contentPhases = resolvePhaseOrder(signals, random);

  const body = contentPhases.flatMap((phase) => resolvePhase(phase, signals, bi));
  const withCtas = insertCtas(body, signals);

  const sections = alternateRhythm([
    { role: "hero", prominence: "primary", rhythm: "standard" },
    ...withCtas,
    { role: "footer", prominence: "compact", rhythm: "standard" },
  ]);

  return {
    heroVariant: heroVariantFor(heroSplitLean, priceEmphasis),
    sections,
  };
}
