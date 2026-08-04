import { describe, it, expect } from "vitest";
import {
  generateLayout,
  weightOf,
  thresholdFor,
  prominenceFrom,
  rhythmFrom,
  heroVariantFor,
  ctaCountFor,
  sectionWeightsFor,
  resolvePhaseOrder,
  GATED_ROLES,
} from "./LayoutIntelligence";
import { neutralBusinessIntelligence as bi } from "../testFixtures";
import { createSeededRandom } from "../utils/seed";
import type { CompositionSignals } from "../types/signals";

const seed = (n: number) => createSeededRandom(n);

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
    expect(weightOf("features", worstCase, bi())).toBeGreaterThanOrEqual(thresholdFor("features"));
    expect(weightOf("testimonials", worstCase, bi())).toBeGreaterThanOrEqual(thresholdFor("testimonials"));
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
    const lowBi = bi({
      trustDifficulty: 0.1,
      authorityRequirement: 0.1,
      riskPerception: 0.1,
      pricePositioning: 0.9,
      buyerSophistication: 0.1,
      offerComplexity: 0.1,
      competitionLevel: 0.1,
      visualImportance: 0.9,
      emotionalVsRational: 0.9,
    });
    for (const role of ["logoCloud", "stats", "pricing", "benefits", "faq"] as const) {
      expect(weightOf(role, low, lowBi)).toBeLessThan(thresholdFor(role));
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
    const highBi = bi({
      trustDifficulty: 0.95,
      authorityRequirement: 0.6,
      riskPerception: 0.9,
      pricePositioning: 0.05,
      buyerSophistication: 0.8,
      offerComplexity: 0.6,
      competitionLevel: 0.9,
      visualImportance: 0.1,
      emotionalVsRational: 0.1,
    });
    for (const role of ["logoCloud", "stats", "pricing", "benefits", "faq"] as const) {
      expect(weightOf(role, high, highBi)).toBeGreaterThanOrEqual(thresholdFor(role));
    }
  });

  it("every role weight always stays within [0, 1] regardless of BI extremes", () => {
    const extreme: CompositionSignals = {
      trustNeed: 1,
      urgency: 1,
      complexity: 1,
      socialProofNeed: 1,
      objectionPressure: 1,
      priceSensitivity: 0,
    };
    const extremeBi = bi({
      pricePositioning: 1,
      competitionLevel: 1,
      visualImportance: 1,
      buyerSophistication: 1,
      emotionalVsRational: 1,
      decisionComplexity: 1,
      purchaseUrgency: 1,
      offerComplexity: 1,
      riskPerception: 1,
      trustDifficulty: 1,
      authorityRequirement: 1,
    });
    for (const role of GATED_ROLES) {
      const w = weightOf(role, extreme, extremeBi);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
    }
  });

  it("sectionWeightsFor returns every gated role, matching weightOf for each", () => {
    const weights = sectionWeightsFor(NEUTRAL, bi());
    for (const role of GATED_ROLES) {
      expect(weights[role]).toBe(weightOf(role, NEUTRAL, bi()));
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

  describe("heroVariantFor - seeded weighted pick", () => {
    function shareOf(target: string, heroSplitLean: number, priceEmphasis: number, trials = 60): number {
      let hits = 0;
      for (let s = 0; s < trials; s++) {
        if (heroVariantFor(heroSplitLean, priceEmphasis, seed(s)) === target) hits++;
      }
      return hits / trials;
    }

    it("strongly prefers minimal for low price emphasis + low split lean", () => {
      expect(shareOf("minimal", 0.1, 0.1)).toBeGreaterThan(0.6);
    });

    it("strongly prefers split for high split lean", () => {
      expect(shareOf("split", 0.8, 0.5)).toBeGreaterThan(0.5);
    });

    it("strongly prefers centered for the exact middle of the range", () => {
      expect(shareOf("centered", 0.5, 0.5)).toBeGreaterThan(0.6);
    });

    it("reaches every one of the 3 variants across enough seeds - the regression this rewrite fixes (minimal was 0/100 under the old hard-threshold version)", () => {
      const seen = new Set<string>();
      for (let s = 0; s < 100; s++) {
        seen.add(heroVariantFor(0.5, 0.5, seed(s)));
      }
      expect(seen.size).toBe(3);
    });

    it("is deterministic for a given seed", () => {
      expect(heroVariantFor(0.4, 0.6, seed(3))).toBe(heroVariantFor(0.4, 0.6, seed(3)));
    });
  });

  it("returns 0/1/2 CTAs at the documented urgency thresholds", () => {
    expect(ctaCountFor({ ...NEUTRAL, urgency: 0.5 })).toBe(0);
    expect(ctaCountFor({ ...NEUTRAL, urgency: 0.55 })).toBe(1);
    expect(ctaCountFor({ ...NEUTRAL, urgency: 0.79 })).toBe(1);
    expect(ctaCountFor({ ...NEUTRAL, urgency: 0.8 })).toBe(2);
  });
});

describe("generateLayout - structural guarantees", () => {
  it("never places two cta sections adjacent to each other, under any phase order", () => {
    const veryUrgent: CompositionSignals = { ...NEUTRAL, urgency: 0.95 };
    for (let s = 0; s < 20; s++) {
      const { sections } = generateLayout(bi(), veryUrgent, 0.5, 0.5, seed(s));
      for (let i = 0; i < sections.length - 1; i++) {
        if (sections[i].role === "cta") {
          expect(sections[i + 1]?.role).not.toBe("cta");
        }
      }
    }
  });

  it("never places a cta immediately after hero, under any phase order", () => {
    const veryUrgent: CompositionSignals = { ...NEUTRAL, urgency: 0.95 };
    for (let s = 0; s < 20; s++) {
      const { sections } = generateLayout(bi(), veryUrgent, 0.5, 0.5, seed(s));
      expect(sections[1]?.role).not.toBe("cta");
    }
  });

  it("never produces 3+ consecutive sections with identical rhythm, under any phase order", () => {
    for (let s = 0; s < 20; s++) {
      const { sections } = generateLayout(bi(), NEUTRAL, 0.5, 0.5, seed(s));
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
    // trustDifficulty pulls stats up further and visualImportance pulls features up -
    // pushed apart explicitly so the ordering claim doesn't rest on a coincidental tie.
    const statsFirstBi = bi({ trustDifficulty: 0.9, visualImportance: 0.1, emotionalVsRational: 0.1 });
    const { sections } = generateLayout(statsFirstBi, statsFirst, 0.5, 0.5, seed(1));
    const statsIndex = sections.findIndex((s) => s.role === "stats");
    const featuresIndex = sections.findIndex((s) => s.role === "features");
    expect(statsIndex).toBeGreaterThan(-1);
    expect(statsIndex).toBeLessThan(featuresIndex);
  });

  it("is fully deterministic for the same seed", () => {
    const a = generateLayout(bi(), NEUTRAL, 0.5, 0.5, seed(1));
    const b = generateLayout(bi(), NEUTRAL, 0.5, 0.5, seed(1));
    expect(a).toEqual(b);
  });

  it("produces genuinely different section sequences across seeds for the exact same business", () => {
    // The core of the diversity mechanism: two "generations" of the same neutral
    // business (no seed) would previously always be identical in shape (they still
    // are, for the SAME seed - determinism holds), but across different seeds the
    // structure itself now varies, not just prominence/rhythm.
    const sequences = new Set<string>();
    for (let s = 0; s < 30; s++) {
      const { sections } = generateLayout(bi(), NEUTRAL, 0.5, 0.5, seed(s));
      sequences.add(sections.map((sec) => sec.role).join(">"));
    }
    expect(sequences.size).toBeGreaterThan(1);
  });
});

describe("resolvePhaseOrder", () => {
  it("is deterministic for a given seed", () => {
    expect(resolvePhaseOrder(NEUTRAL, seed(5))).toEqual(resolvePhaseOrder(NEUTRAL, seed(5)));
  });

  it("always returns a permutation of the same 5 content phases", () => {
    const expected = ["context", "value", "proof", "decision", "objection"].sort();
    for (let s = 0; s < 20; s++) {
      expect([...resolvePhaseOrder(NEUTRAL, seed(s))].sort()).toEqual(expected);
    }
  });

  it("strongly prefers proof-led ordering for a business with overwhelming social-proof need", () => {
    const proofHeavy: CompositionSignals = { ...NEUTRAL, socialProofNeed: 0.95, trustNeed: 0.9 };
    let proofFirstCount = 0;
    const trials = 40;
    for (let s = 0; s < trials; s++) {
      if (resolvePhaseOrder(proofHeavy, seed(s))[0] === "proof") proofFirstCount++;
    }
    expect(proofFirstCount / trials).toBeGreaterThan(0.5);
  });

  it("resolves to more than one variant across enough seeds, for the same neutral signals", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 30; s++) {
      seen.add(resolvePhaseOrder(NEUTRAL, seed(s)).join(">"));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
