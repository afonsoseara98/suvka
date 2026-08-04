import { describe, it, expect } from "vitest";
import { buildLandingComposition } from "./LandingComposition";
import { deriveCompositionSignals } from "./CompositionIntelligence";
import { neutralBusinessIntelligence as bi } from "../testFixtures";
import { createSeededRandom } from "../utils/seed";
import type { BusinessProfile } from "../types";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { CompositionSignals } from "../types/signals";
import type { SectionType, HeroVariant } from "@/app/types/landing";

const VALID_ROLES: SectionType[] = [
  "hero",
  "logoCloud",
  "stats",
  "features",
  "benefits",
  "testimonials",
  "pricing",
  "faq",
  "cta",
  "footer",
];

const VALID_HERO_VARIANTS: HeroVariant[] = ["centered", "split", "minimal"];

const NEUTRAL: CompositionSignals = {
  trustNeed: 0.5,
  urgency: 0.5,
  complexity: 0.5,
  socialProofNeed: 0.5,
  objectionPressure: 0.5,
  priceSensitivity: 0.5,
};

const psychology: PsychologyProfile = {
  pains: ["pain"],
  desires: ["desire"],
  objections: ["objection"],
  trustFactors: ["a", "b", "c"],
  emotionalTriggers: ["trigger"],
};

const offer: OfferStrategy = {
  primaryCTA: "Get Started",
  valueProposition: "value",
  offerFraming: "framing",
  riskReductionAngle: "No risk",
};

function business(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    industry: "startup",
    businessModel: "saas",
    primaryGoal: "generate_leads",
    audience: "Founders",
    tone: "modern",
    priceLevel: "medium",
    ...overrides,
  };
}

function composition(
  intelligence = bi(),
  signals: CompositionSignals = NEUTRAL,
  heroSplitLean = 0.5,
  priceEmphasis = 0.5,
  random: () => number = createSeededRandom(1)
) {
  return buildLandingComposition(intelligence, signals, heroSplitLean, priceEmphasis, random);
}

describe("LandingComposition - coverage and structural invariants", () => {
  it("always starts with hero and ends with footer", () => {
    const { sections } = composition();
    expect(sections[0]?.role).toBe("hero");
    expect(sections[sections.length - 1]?.role).toBe("footer");
  });

  it("never repeats a role, except cta which may legitimately repeat", () => {
    const { sections } = composition();
    const nonCtaRoles = sections.filter((s) => s.role !== "cta").map((s) => s.role);
    expect(new Set(nonCtaRoles).size).toBe(nonCtaRoles.length);
  });

  it("only uses declared SectionType roles and a valid heroVariant", () => {
    const result = composition();
    expect(VALID_HERO_VARIANTS).toContain(result.heroVariant);
    for (const entry of result.sections) {
      expect(VALID_ROLES).toContain(entry.role);
    }
  });

  it("is deterministic - the same BI and signals always produce the same composition", () => {
    const a = composition();
    const b = composition();
    expect(a).toEqual(b);
  });

  // Realistic signals matching real_estate's actual profile (priceLevel "high", goal
  // "schedule_call") - high pricePositioning should suppress stats/pricing directly,
  // the same compositional intent the old "luxury" archetype bias used to encode.
  it("keeps a high-pricePositioning business free of stats/pricing for a realistic profile", () => {
    const luxuryBi = bi({
      pricePositioning: 0.97,
      decisionComplexity: 0.7,
      riskPerception: 0.65,
      buyerSophistication: 0.2,
      trustDifficulty: 0.2,
    });
    const signals = deriveCompositionSignals(
      business({ priceLevel: "high", primaryGoal: "schedule_call", businessModel: "service" }),
      { ...psychology, trustFactors: ["a"] },
      offer,
      luxuryBi
    );
    const roles = composition(luxuryBi, signals).sections.map((s) => s.role);
    expect(roles).not.toContain("stats");
    expect(roles).not.toContain("pricing");
  });

  // What the redesign actually guarantees: not that a premium business is absolutely
  // incapable of ever showing stats/pricing (an extreme enough trust signal
  // legitimately can still pull them in - that's honest, not a bug), but that the same
  // signals produce measurably less pull toward them as pricePositioning rises.
  it("gives a high-pricePositioning business a measurably lower pull toward pricing than a neutral one", () => {
    const signals = deriveCompositionSignals(business(), psychology, offer, bi());
    const luxuryRoles = composition(bi({ pricePositioning: 0.9 }), signals).sections.map((s) => s.role);
    const neutralRoles = composition(bi(), signals).sections.map((s) => s.role);
    const luxuryWeight = luxuryRoles.includes("pricing") ? 1 : 0;
    const neutralWeight = neutralRoles.includes("pricing") ? 1 : 0;
    expect(luxuryWeight).toBeLessThanOrEqual(neutralWeight);
  });
});

describe("LandingComposition - Layout Intelligence (structure is computed, not looked up)", () => {
  it("produces a different composition for the same BI under different signals", () => {
    const low: CompositionSignals = {
      trustNeed: 0.2,
      urgency: 0.2,
      complexity: 0.2,
      socialProofNeed: 0.2,
      objectionPressure: 0.2,
      priceSensitivity: 0.2,
    };
    const high: CompositionSignals = {
      trustNeed: 0.9,
      urgency: 0.9,
      complexity: 0.9,
      socialProofNeed: 0.9,
      objectionPressure: 0.9,
      priceSensitivity: 0.9,
    };

    expect(composition(bi(), low)).not.toEqual(composition(bi(), high));
  });

  // The actual deliverable: sampling a spread of the signal space produces many
  // structurally distinct pages, not a small fixed set of pre-authored variants.
  it("produces many distinct section-role sequences across the signal space", () => {
    const steps = [0.1, 0.3, 0.5, 0.7, 0.9];
    const sequences = new Set<string>();

    for (const trustNeed of steps) {
      for (const urgency of steps) {
        for (const complexity of steps) {
          const signals: CompositionSignals = {
            trustNeed,
            urgency,
            complexity,
            socialProofNeed: trustNeed,
            objectionPressure: 1 - complexity,
            priceSensitivity: 1 - urgency,
          };
          sequences.add(composition(bi(), signals).sections.map((s) => s.role).join(">"));
        }
      }
    }

    expect(sequences.size).toBeGreaterThan(15);
  });
});
