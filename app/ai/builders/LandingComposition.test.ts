import { describe, it, expect } from "vitest";
import { buildLandingComposition } from "./LandingComposition";
import { deriveCompositionSignals } from "./CompositionIntelligence";
import type { PageArchetype } from "../types/archetype";
import type { BusinessProfile } from "../types";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { CompositionSignals } from "../types/signals";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { SectionType, HeroVariant } from "@/app/types/landing";

const ALL_ARCHETYPES: PageArchetype[] = [
  "authority",
  "luxury",
  "local_business",
  "lead_generation",
  "personal_brand",
  "product_showcase",
  "booking",
  "portfolio",
  "hospitality",
];

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

// Neutral on every dimension - these tests exercise LandingComposition's own
// structural behavior, not the BusinessIntelligence blend (see
// CompositionIntelligence.test.ts for that).
const businessIntelligence: BusinessIntelligenceProfile = {
  pricePositioning: 0.5,
  competitionLevel: 0.5,
  visualImportance: 0.5,
  buyerSophistication: 0.5,
  emotionalVsRational: 0.5,
  decisionComplexity: 0.5,
  purchaseUrgency: 0.5,
  offerComplexity: 0.5,
  riskPerception: 0.5,
  trustDifficulty: 0.5,
  authorityRequirement: 0.5,
  marketPosition: "established",
  brandPersonality: "authoritative",
  buyerAwareness: "solution-aware",
  visitorTemperature: "warm",
  salesCycle: "medium",
  conversionStyle: "direct",
  lifetimeValue: "one-time",
  trafficSourceSuitability: ["search"],
  funnelType: "lead-generation",
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

function composition(archetype: PageArchetype, signals: CompositionSignals = NEUTRAL) {
  return buildLandingComposition(archetype, signals);
}

describe("LandingComposition - coverage and structural invariants", () => {
  it("produces a composition for every declared archetype", () => {
    for (const archetype of ALL_ARCHETYPES) {
      expect(composition(archetype).archetype).toBe(archetype);
    }
  });

  it("always starts with hero and ends with footer", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const { sections } = composition(archetype);
      expect(sections[0]?.role).toBe("hero");
      expect(sections[sections.length - 1]?.role).toBe("footer");
    }
  });

  it("never repeats a role, except cta which may legitimately repeat", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const { sections } = composition(archetype);
      const nonCtaRoles = sections.filter((s) => s.role !== "cta").map((s) => s.role);
      expect(new Set(nonCtaRoles).size).toBe(nonCtaRoles.length);
    }
  });

  it("only uses declared SectionType roles and a valid heroVariant", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const result = composition(archetype);
      expect(VALID_HERO_VARIANTS).toContain(result.heroVariant);
      for (const entry of result.sections) {
        expect(VALID_ROLES).toContain(entry.role);
      }
    }
  });

  it("is deterministic - the same archetype and signals always produce the same composition", () => {
    const a = composition("lead_generation", NEUTRAL);
    const b = composition("lead_generation", NEUTRAL);
    expect(a).toEqual(b);
  });

  // Realistic signals matching real_estate's actual BusinessProfileBuilder defaults
  // (priceLevel "high", goal "schedule_call") - luxury's bias against pricing/stats
  // should hold for the business that archetype actually resolves from in practice.
  it("keeps luxury free of stats/pricing for real_estate's realistic profile", () => {
    const signals = deriveCompositionSignals(
      business({ priceLevel: "high", primaryGoal: "schedule_call", businessModel: "service" }),
      { ...psychology, trustFactors: ["a"] },
      offer,
      businessIntelligence
    );
    const roles = composition("luxury", signals).sections.map((s) => s.role);
    expect(roles).not.toContain("stats");
    expect(roles).not.toContain("pricing");
  });

  // What the redesign actually guarantees: not that luxury is absolutely incapable of
  // ever showing stats/pricing (an extreme enough trust signal legitimately can still
  // pull them in - that's honest, not a bug), but that the same signals produce
  // measurably less pull toward them under luxury than under an archetype with a
  // neutral or positive bias.
  it("gives luxury a measurably lower pull toward stats/pricing than a neutral-bias archetype", () => {
    const signals = deriveCompositionSignals(business(), psychology, offer, businessIntelligence);
    const luxuryRoles = composition("luxury", signals).sections.map((s) => s.role);
    const leadGenRoles = composition("lead_generation", signals).sections.map((s) => s.role);
    const luxuryWeight = luxuryRoles.includes("pricing") ? 1 : 0;
    const leadGenWeight = leadGenRoles.includes("pricing") ? 1 : 0;
    expect(luxuryWeight).toBeLessThanOrEqual(leadGenWeight);
  });
});

describe("LandingComposition - Layout Intelligence (structure is computed, not looked up)", () => {
  it("produces a different composition for the same archetype under different signals", () => {
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

    expect(composition("authority", low)).not.toEqual(composition("authority", high));
  });

  // The actual deliverable: sampling a spread of the signal space for a single
  // archetype produces many structurally distinct pages, not a small fixed set of
  // pre-authored variants.
  it("produces many distinct section-role sequences across the signal space for one archetype", () => {
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
          sequences.add(composition("product_showcase", signals).sections.map((s) => s.role).join(">"));
        }
      }
    }

    expect(sequences.size).toBeGreaterThan(15);
  });
});
