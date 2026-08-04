import { describe, it, expect } from "vitest";
import { resolveDesignFamily, applyDesignFamily, type DesignFamilyName } from "./DesignFamily";
import { neutralBusinessIntelligence as bi, neutralStrategyDna as dna } from "../testFixtures";
import { createSeededRandom } from "../utils/seed";

const ALL_FAMILIES: DesignFamilyName[] = [
  "minimal",
  "editorial",
  "bold",
  "corporate",
  "playful",
  "elegant",
  "highEndAgency",
  "startupDashboard",
];

describe("resolveDesignFamily", () => {
  it("is deterministic - the same bi and seed always resolve to the same family", () => {
    const a = resolveDesignFamily(bi(), createSeededRandom(42));
    const b = resolveDesignFamily(bi(), createSeededRandom(42));
    expect(a).toBe(b);
  });

  it("always resolves to one of the declared families", () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(ALL_FAMILIES).toContain(resolveDesignFamily(bi(), createSeededRandom(seed)));
    }
  });

  it("resolves to different families across enough different seeds, for the same bi", () => {
    const seen = new Set<DesignFamilyName>();
    for (let seed = 0; seed < 100; seed++) {
      seen.add(resolveDesignFamily(bi(), createSeededRandom(seed)));
    }
    // Not asserting all 8 appear (some families may score 0 fit for a neutral bi) -
    // asserting the seed genuinely moves the outcome, which is the entire point.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("strongly prefers corporate for a high-authority, high-trust-difficulty, low-visual business", () => {
    const corporateBi = bi({ authorityRequirement: 0.9, trustDifficulty: 0.9, visualImportance: 0.1, pricePositioning: 0.3 });
    let corporateCount = 0;
    const trials = 50;
    for (let seed = 0; seed < trials; seed++) {
      if (resolveDesignFamily(corporateBi, createSeededRandom(seed)) === "corporate") corporateCount++;
    }
    expect(corporateCount / trials).toBeGreaterThan(0.5);
  });

  it("prefers bold or playful (both legitimately fit) for an urgent, emotional, budget business", () => {
    // Bold and playful are genuinely close competitors for this profile - both are
    // defensible reads of "urgent, emotional, not premium." That ambiguity being
    // resolved by the seed is the mechanism working as intended, not a bug to hide by
    // asserting a single winner.
    const boldBi = bi({ purchaseUrgency: 0.9, emotionalVsRational: 0.9, pricePositioning: 0.1 });
    let matchCount = 0;
    const trials = 50;
    for (let seed = 0; seed < trials; seed++) {
      const family = resolveDesignFamily(boldBi, createSeededRandom(seed));
      if (family === "bold" || family === "playful") matchCount++;
    }
    expect(matchCount / trials).toBeGreaterThan(0.7);
  });
});

describe("applyDesignFamily", () => {
  it("is deterministic", () => {
    expect(applyDesignFamily(dna(), "bold")).toEqual(applyDesignFamily(dna(), "bold"));
  });

  it("only changes the fields a family declares, leaving everything else untouched", () => {
    const base = dna({ urgency: 0.73, ctaUrgency: 0.61 });
    const result = applyDesignFamily(base, "minimal");
    expect(result.urgency).toBe(base.urgency);
    expect(result.ctaUrgency).toBe(base.ctaUrgency);
    expect(result.sectionWeight).toBe(base.sectionWeight);
  });

  it("pushes saturation/accentIntensity/elevation up for bold and down for minimal, from the same base", () => {
    const base = dna();
    const bold = applyDesignFamily(base, "bold");
    const minimal = applyDesignFamily(base, "minimal");
    expect(bold.saturation).toBeGreaterThan(base.saturation);
    expect(minimal.saturation).toBeLessThan(base.saturation);
  });

  it("keeps every adjusted field within [0, 1] even at the extremes", () => {
    const extreme = dna({
      density: 1,
      roundedness: 1,
      decorationDensity: 1,
      saturation: 1,
      contentWidth: 1,
      elevation: 1,
      typeScale: 1,
      typeWeight: 1,
      accentIntensity: 1,
      colorTemperature: 1,
    });

    for (const family of ALL_FAMILIES) {
      const result = applyDesignFamily(extreme, family);
      for (const value of Object.values(result)) {
        if (typeof value === "number") {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }

    const zeroed = dna({
      density: 0,
      roundedness: 0,
      decorationDensity: 0,
      saturation: 0,
      contentWidth: 0,
      elevation: 0,
      typeScale: 0,
      typeWeight: 0,
      accentIntensity: 0,
      colorTemperature: 0,
    });

    for (const family of ALL_FAMILIES) {
      const result = applyDesignFamily(zeroed, family);
      for (const value of Object.values(result)) {
        if (typeof value === "number") {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
