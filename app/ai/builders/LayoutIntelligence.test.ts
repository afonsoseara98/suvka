import { describe, it, expect } from "vitest";
import {
  generateLayout,
  weightOf,
  thresholdFor,
  prominenceFrom,
  rhythmFrom,
  heroVariantFor,
  ctaCountFor,
  GATED_ROLES,
} from "./LayoutIntelligence";
import type { PageArchetype } from "../types/archetype";
import type { CompositionSignals } from "../types/signals";

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

const NEUTRAL: CompositionSignals = {
  trustNeed: 0.5,
  urgency: 0.5,
  complexity: 0.5,
  socialProofNeed: 0.5,
  objectionPressure: 0.5,
  priceSensitivity: 0.5,
};

describe("ROLE_MODEL weights and thresholds", () => {
  it("keeps features and testimonials includable at almost every realistic signal value (near-universal)", () => {
    const worstCase: CompositionSignals = { ...NEUTRAL, complexity: 0, socialProofNeed: 0 };
    for (const archetype of ALL_ARCHETYPES) {
      expect(weightOf("features", worstCase, archetype)).toBeGreaterThanOrEqual(thresholdFor("features"));
      expect(weightOf("testimonials", worstCase, archetype)).toBeGreaterThanOrEqual(thresholdFor("testimonials"));
    }
  });

  it("can exclude logoCloud, stats, pricing, benefits and faq for the right signal values", () => {
    const low: CompositionSignals = {
      trustNeed: 0.1,
      urgency: 0.1,
      complexity: 0.5,
      socialProofNeed: 0.1,
      objectionPressure: 0.05,
      priceSensitivity: 0.9,
    };
    for (const role of ["logoCloud", "stats", "pricing", "benefits", "faq"] as const) {
      expect(weightOf(role, low, "product_showcase")).toBeLessThan(thresholdFor(role));
    }
  });

  it("can include logoCloud, stats, pricing, benefits and faq for the right signal values", () => {
    const high: CompositionSignals = {
      trustNeed: 0.95,
      urgency: 0.5,
      complexity: 0.1,
      socialProofNeed: 0.95,
      objectionPressure: 0.95,
      priceSensitivity: 0.05,
    };
    for (const role of ["logoCloud", "stats", "pricing", "benefits", "faq"] as const) {
      expect(weightOf(role, high, "product_showcase")).toBeGreaterThanOrEqual(thresholdFor(role));
    }
  });

  it("every role weight always stays within [0, 1] regardless of archetype bias", () => {
    const extreme: CompositionSignals = {
      trustNeed: 1,
      urgency: 1,
      complexity: 1,
      socialProofNeed: 1,
      objectionPressure: 1,
      priceSensitivity: 0,
    };
    for (const archetype of ALL_ARCHETYPES) {
      for (const role of GATED_ROLES) {
        const w = weightOf(role, extreme, archetype);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("prominenceFrom / rhythmFrom / heroVariantFor / ctaCountFor", () => {
  it("bands prominence at the documented 0.35/0.7 thresholds", () => {
    expect(prominenceFrom(0.8)).toBe("primary");
    expect(prominenceFrom(0.7)).toBe("primary");
    expect(prominenceFrom(0.69)).toBe("standard");
    expect(prominenceFrom(0.35)).toBe("compact");
    expect(prominenceFrom(0.36)).toBe("standard");
    expect(prominenceFrom(0.1)).toBe("compact");
  });

  it("gives complex offers breather rhythm and simple+urgent offers dense rhythm", () => {
    expect(rhythmFrom({ ...NEUTRAL, complexity: 0.8 })).toBe("breather");
    expect(rhythmFrom({ ...NEUTRAL, complexity: 0.1, urgency: 0.8 })).toBe("dense");
    expect(rhythmFrom({ ...NEUTRAL, complexity: 0.1, urgency: 0.2 })).toBe("standard");
  });

  it("picks minimal hero for low price sensitivity + low complexity, split for high complexity", () => {
    expect(heroVariantFor({ ...NEUTRAL, priceSensitivity: 0.1, complexity: 0.1 })).toBe("minimal");
    expect(heroVariantFor({ ...NEUTRAL, complexity: 0.8 })).toBe("split");
    expect(heroVariantFor(NEUTRAL)).toBe("centered");
  });

  it("returns 0/1/2 CTAs at the documented urgency thresholds", () => {
    expect(ctaCountFor({ ...NEUTRAL, urgency: 0.5 })).toBe(0);
    expect(ctaCountFor({ ...NEUTRAL, urgency: 0.55 })).toBe(1);
    expect(ctaCountFor({ ...NEUTRAL, urgency: 0.79 })).toBe(1);
    expect(ctaCountFor({ ...NEUTRAL, urgency: 0.8 })).toBe(2);
  });
});

describe("generateLayout - structural guarantees", () => {
  it("never places two cta sections adjacent to each other", () => {
    const veryUrgent: CompositionSignals = { ...NEUTRAL, urgency: 0.95 };
    for (const archetype of ALL_ARCHETYPES) {
      const { sections } = generateLayout(archetype, veryUrgent);
      for (let i = 0; i < sections.length - 1; i++) {
        if (sections[i].role === "cta") {
          expect(sections[i + 1]?.role).not.toBe("cta");
        }
      }
    }
  });

  it("never places a cta immediately after hero or immediately before footer's predecessor being hero", () => {
    const veryUrgent: CompositionSignals = { ...NEUTRAL, urgency: 0.95 };
    for (const archetype of ALL_ARCHETYPES) {
      const { sections } = generateLayout(archetype, veryUrgent);
      expect(sections[1]?.role).not.toBe("cta");
    }
  });

  it("never produces 3+ consecutive sections with identical rhythm", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const { sections } = generateLayout(archetype, NEUTRAL);
      let run = 1;
      for (let i = 1; i < sections.length; i++) {
        run = sections[i].rhythm === sections[i - 1].rhythm ? run + 1 : 1;
        expect(run).toBeLessThan(3);
      }
    }
  });

  it("orders roles within a phase by descending weight", () => {
    // High trust/social-proof-need and low complexity should pull "stats" ahead of
    // "features" within the value phase - a direct, assertable ordering claim.
    const statsFirst: CompositionSignals = {
      ...NEUTRAL,
      trustNeed: 0.9,
      socialProofNeed: 0.9,
      complexity: 0.1,
    };
    const { sections } = generateLayout("local_business", statsFirst);
    const statsIndex = sections.findIndex((s) => s.role === "stats");
    const featuresIndex = sections.findIndex((s) => s.role === "features");
    expect(statsIndex).toBeGreaterThan(-1);
    expect(statsIndex).toBeLessThan(featuresIndex);
  });

  it("is fully deterministic", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const a = generateLayout(archetype, NEUTRAL);
      const b = generateLayout(archetype, NEUTRAL);
      expect(a).toEqual(b);
    }
  });
});
