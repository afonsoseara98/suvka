import { describe, it, expect, beforeEach } from "vitest";
import { findExisting, findTooSimilar, remember, resetDiversityHistory, MIN_ACCEPTABLE_DIVERSITY } from "./DiversityTracker";
import type { GenerationFingerprint } from "./DiversityScore";
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

beforeEach(() => {
  resetDiversityHistory();
});

describe("findExisting", () => {
  it("returns null for a prompt hash never remembered", () => {
    expect(findExisting(1)).toBeNull();
  });

  it("returns the remembered entry, including its retries count, for a known prompt hash", () => {
    remember(1, fingerprint(), 2);
    const entry = findExisting(1);
    expect(entry?.promptHash).toBe(1);
    expect(entry?.retries).toBe(2);
  });
});

describe("findTooSimilar", () => {
  it("returns null when history is empty", () => {
    expect(findTooSimilar(fingerprint())).toBeNull();
  });

  it("flags a near-identical fingerprint already in history", () => {
    remember(1, fingerprint(), 0);
    const collision = findTooSimilar(fingerprint());
    expect(collision?.promptHash).toBe(1);
  });

  it("does not flag a sufficiently different fingerprint", () => {
    remember(1, fingerprint(), 0);
    const different = fingerprint({
      dna: neutralStrategyDna({ colorTemperature: 1, saturation: 1, brightness: 1, density: 1, contentWidth: 1 }),
      designFamily: "bold",
      heroVariant: "split",
      sectionSequence: ["hero", "logoCloud", "stats", "faq", "cta", "footer"],
    });
    expect(findTooSimilar(different)).toBeNull();
  });

  it("keeps MIN_ACCEPTABLE_DIVERSITY within a sane (0, 1) range", () => {
    expect(MIN_ACCEPTABLE_DIVERSITY).toBeGreaterThan(0);
    expect(MIN_ACCEPTABLE_DIVERSITY).toBeLessThan(1);
  });
});

describe("remember", () => {
  it("deduplicates by promptHash - re-remembering the same prompt replaces, not appends", () => {
    remember(1, fingerprint({ designFamily: "corporate" }), 0);
    remember(1, fingerprint({ designFamily: "bold" }), 1);

    expect(findExisting(1)?.fingerprint.designFamily).toBe("bold");
    expect(findExisting(1)?.retries).toBe(1);
  });

  it("bounds the RECENT window used for collision detection, but never forgets a prompt's retries count", () => {
    for (let i = 0; i < 30; i++) {
      remember(i, fingerprint({ designFamily: i % 2 === 0 ? "bold" : "minimal" }), 0);
    }

    // findExisting (determinism replay) must never forget, however long ago a prompt
    // was last seen - forgetting it would let a repeated prompt recompute a different
    // recompose count than its first generation used.
    expect(findExisting(0)).not.toBeNull();
    expect(findExisting(29)).not.toBeNull();

    // findTooSimilar (collision detection against RECENT generations) only searches
    // the bounded window - entry 0's fingerprint should no longer be found there.
    remember(9999, fingerprint({ designFamily: "bold" }), 0);
    const collision = findTooSimilar(fingerprint({ designFamily: "bold" }));
    expect(collision?.promptHash).not.toBe(0);
  });
});
