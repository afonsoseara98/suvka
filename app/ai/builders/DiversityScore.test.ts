import { describe, it, expect } from "vitest";
import { computeDiversityScore, type GenerationFingerprint } from "./DiversityScore";
import { neutralStrategyDna } from "../testFixtures";

function fingerprint(overrides: Partial<GenerationFingerprint> = {}): GenerationFingerprint {
  return {
    dna: neutralStrategyDna(),
    designFamily: "corporate",
    sectionSequence: ["hero", "features", "benefits", "testimonials", "pricing", "faq", "footer"],
    heroVariant: "centered",
    ...overrides,
  };
}

describe("computeDiversityScore", () => {
  it("is deterministic", () => {
    const a = fingerprint();
    const b = fingerprint({ designFamily: "bold" });
    expect(computeDiversityScore(a, b)).toBe(computeDiversityScore(a, b));
  });

  it("is exactly 0 for two identical fingerprints", () => {
    const a = fingerprint();
    const b = fingerprint();
    expect(computeDiversityScore(a, b)).toBe(0);
  });

  it("is symmetric", () => {
    const a = fingerprint({ designFamily: "bold", heroVariant: "split" });
    const b = fingerprint({ designFamily: "minimal", heroVariant: "minimal" });
    expect(computeDiversityScore(a, b)).toBeCloseTo(computeDiversityScore(b, a));
  });

  it("rises when the DNA differs, holding structure/family/hero constant", () => {
    const a = fingerprint({ dna: neutralStrategyDna({ colorTemperature: 0.1, saturation: 0.1 }) });
    const b = fingerprint({ dna: neutralStrategyDna({ colorTemperature: 0.9, saturation: 0.9 }) });
    expect(computeDiversityScore(a, b)).toBeGreaterThan(0);
  });

  it("rises when the section sequence differs, holding DNA/family/hero constant", () => {
    const a = fingerprint({ sectionSequence: ["hero", "features", "pricing", "footer"] });
    const b = fingerprint({ sectionSequence: ["hero", "testimonials", "faq", "logoCloud", "footer"] });
    const c = fingerprint({ sectionSequence: ["hero", "features", "pricing", "footer"] });
    expect(computeDiversityScore(a, b)).toBeGreaterThan(computeDiversityScore(a, c));
  });

  it("rises when the design family or hero variant differs", () => {
    const a = fingerprint({ designFamily: "corporate", heroVariant: "centered" });
    const sameFamily = fingerprint({ designFamily: "corporate", heroVariant: "centered" });
    const differentFamily = fingerprint({ designFamily: "playful", heroVariant: "split" });
    expect(computeDiversityScore(a, differentFamily)).toBeGreaterThan(computeDiversityScore(a, sameFamily));
  });

  it("is close to maximal for two fingerprints that differ on every dimension", () => {
    const a = fingerprint({
      dna: neutralStrategyDna({
        colorTemperature: 0,
        saturation: 0,
        brightness: 0,
        density: 0,
        contentWidth: 0,
        roundedness: 0,
      }),
      designFamily: "minimal",
      heroVariant: "minimal",
      sectionSequence: ["hero", "footer"],
    });
    const b = fingerprint({
      dna: neutralStrategyDna({
        colorTemperature: 1,
        saturation: 1,
        brightness: 1,
        density: 1,
        contentWidth: 1,
        roundedness: 1,
      }),
      designFamily: "bold",
      heroVariant: "split",
      sectionSequence: ["hero", "logoCloud", "stats", "features", "benefits", "testimonials", "pricing", "faq", "cta", "footer"],
    });
    expect(computeDiversityScore(a, b)).toBeGreaterThan(0.5);
  });

  it("always stays within [0, 1]", () => {
    const a = fingerprint();
    const b = fingerprint({ dna: neutralStrategyDna({ colorTemperature: 1 }), designFamily: "bold", sectionSequence: [] });
    const score = computeDiversityScore(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
