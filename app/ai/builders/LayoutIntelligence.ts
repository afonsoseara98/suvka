import type { CompositionSignals } from "../types/signals";
import type { PageArchetype } from "../types/archetype";
import type { LandingComposition, CompositionSection } from "../types/composition";
import type { SectionType, SectionProminence, SectionRhythm, HeroVariant } from "@/app/types/landing";
import { clamp01 } from "../utils/math";

// LAYOUT INTELLIGENCE
//
// What this replaces: a Record<PageArchetype, LandingComposition> - nine hand-authored
// full-page structures. That is a lookup table wearing an "intelligence" label: two
// businesses landing on the same archetype got the exact same page shape, forever,
// because the shape was the key's *value*, not something computed.
//
// What this is instead: order, count, repetition, rhythm and CTA placement are each
// their own small computation over CompositionSignals - none of them read from a table
// keyed by archetype. The only archetype-specific data left is BIAS_BY_ARCHETYPE below,
// a handful of nudge values (not a structure), because an archetype is still a real,
// useful signal about *tendency* ("luxury tends to want less pricing pressure") - it
// just no longer gets to dictate the page outright.
//
// The generative core is a narrative grammar of PHASES (hook -> context -> value ->
// proof -> decision -> objection -> close). Every SectionType belongs to exactly one
// phase (ROLE_PHASE - a single flat map, not a switch, not a per-archetype anything).
// For each phase, in order: every role in that phase is scored by a per-role weight
// function of the signals, gated by a per-role inclusion threshold, and the surviving
// roles are emitted sorted by weight. That's the entire ordering algorithm - one loop
// over phases, one filter, one sort. Nothing here special-cases an archetype or a
// specific role by name inside the sequencing logic itself.
//
// The result space is combinatorial, not enumerated: 6 continuous signals x 7 gated
// roles x 2 CTA-repetition tiers x 3 hero variants x continuous rhythm/prominence
// bands means the reachable set of distinct (order, count, repetition, rhythm) page
// shapes is in the thousands, without a single one of them having been written down.

type NarrativePhase = "hook" | "context" | "value" | "proof" | "decision" | "objection" | "close";

const PHASE_ORDER: readonly NarrativePhase[] = ["hook", "context", "value", "proof", "decision", "objection", "close"];

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
  weight(signals: CompositionSignals, bias: number): number;
  threshold: number;
}

// Every role's narrative "pull" as a function of the business's own psychology - never
// of which archetype it is. threshold is the bar its weight has to clear to be included
// at all: this is what makes section COUNT a real per-business decision instead of a
// fixed list minus a couple of manual exceptions.
const ROLE_MODEL: Record<GatedRole, RoleModel> = {
  features: {
    weight: (s, bias) => clamp01(0.55 + s.complexity * 0.35 + bias),
    threshold: 0.15, // near-universal: a page explaining nothing about the offer is broken
  },
  testimonials: {
    weight: (s, bias) => clamp01(0.55 + s.socialProofNeed * 0.4 + bias),
    threshold: 0.2, // near-universal: almost every business benefits from some proof
  },
  benefits: {
    // Base deliberately sits below its own threshold - unlike features/testimonials,
    // benefits earns its place from trustNeed, not by default.
    weight: (s, bias) => clamp01(0.25 + s.trustNeed * 0.5 + bias),
    threshold: 0.35,
  },
  stats: {
    weight: (s, bias) => clamp01(s.trustNeed * 0.5 + s.socialProofNeed * 0.35 + bias),
    threshold: 0.4,
  },
  logoCloud: {
    weight: (s, bias) => clamp01(s.trustNeed * 0.6 + (1 - s.complexity) * 0.25 + bias),
    threshold: 0.5, // the most conditional role: a quick trust flash only earns its place
  },
  pricing: {
    // Base deliberately sits below its own threshold so a genuinely price-sensitive
    // audience can result in real exclusion (a "talk to us" ask instead of a visible
    // price table) without needing an archetype bias to make that happen.
    weight: (s, bias) => clamp01(0.25 + (1 - s.priceSensitivity) * 0.5 + bias),
    threshold: 0.35,
  },
  faq: {
    weight: (s, bias) => clamp01(0.2 + s.objectionPressure * 0.6 + bias),
    threshold: 0.3,
  },
};

// Small nudges, not structures: a handful of nudge values for a subset of roles, keyed
// by archetype. This is the only place PageArchetype touches this file. Deleting an
// entry here changes a tendency; it can never remove hero/footer or break the grammar.
const BIAS_BY_ARCHETYPE: Record<PageArchetype, Partial<Record<GatedRole, number>>> = {
  lead_generation: { logoCloud: 0.15, pricing: 0.1 },
  authority: { testimonials: 0.15, stats: 0.1 },
  booking: { faq: 0.1 },
  local_business: { stats: 0.15 },
  hospitality: { features: 0.1, logoCloud: -0.2 },
  product_showcase: { logoCloud: 0.15 },
  luxury: { pricing: -0.35, stats: -0.3, logoCloud: -0.25, faq: -0.1 },
  personal_brand: { testimonials: 0.2, logoCloud: -0.2 },
  portfolio: { features: 0.15, logoCloud: -0.15 },
};

// Exported alongside generateLayout (its only real "public API" for the rest of the
// pipeline) purely so tests can verify each piece of the decision on its own terms -
// weight/threshold/CTA-count/hero-variant are all meaningfully assertable in isolation,
// and testing them that way catches a regression far more precisely than only ever
// observing generateLayout's aggregate output.
export function weightOf(role: GatedRole, signals: CompositionSignals, archetype: PageArchetype): number {
  const bias = BIAS_BY_ARCHETYPE[archetype][role] ?? 0;
  return ROLE_MODEL[role].weight(signals, bias);
}

export function thresholdFor(role: GatedRole): number {
  return ROLE_MODEL[role].threshold;
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

export function heroVariantFor(signals: CompositionSignals): HeroVariant {
  if (signals.priceSensitivity <= 0.35 && signals.complexity <= 0.35) return "minimal";
  if (signals.complexity >= 0.6) return "split";
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
  archetype: PageArchetype
): CompositionSection[] {
  const roles = (Object.keys(ROLE_PHASE) as GatedRole[]).filter((role) => ROLE_PHASE[role] === phase);

  return roles
    .map((role) => ({ role, weight: weightOf(role, signals, archetype) }))
    .filter(({ role, weight }) => weight >= ROLE_MODEL[role].threshold)
    .sort((a, b) => b.weight - a.weight)
    .map(({ role, weight }) => ({
      role,
      prominence: prominenceFrom(weight),
      rhythm: rhythmFrom(signals),
    }));
}

// CTA repetition and placement, as a formula over urgency and the page's own resulting
// length - not a fixed index, not a per-archetype flag. 0 CTAs below "give it a
// low-pressure nudge" territory, 1 as the closing push once urgency clears that bar, a
// second, earlier one only once urgency is high enough that relying on a single
// end-of-page ask would leave real conversions on the table.
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

export function generateLayout(archetype: PageArchetype, signals: CompositionSignals): LandingComposition {
  const contentPhases = PHASE_ORDER.filter((p) => p !== "hook" && p !== "close");

  const body = contentPhases.flatMap((phase) => resolvePhase(phase, signals, archetype));
  const withCtas = insertCtas(body, signals);

  const sections = alternateRhythm([
    { role: "hero", prominence: "primary", rhythm: "standard" },
    ...withCtas,
    { role: "footer", prominence: "compact", rhythm: "standard" },
  ]);

  return {
    archetype,
    heroVariant: heroVariantFor(signals),
    sections,
  };
}
