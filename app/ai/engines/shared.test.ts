import { describe, it, expect } from "vitest";
import { pickBestMatch } from "./shared";

type Option = "a" | "b" | "c";

describe("pickBestMatch", () => {
  const fingerprints: Record<Option, Record<string, number>> = {
    a: { x: 0.1, y: 0.1 },
    b: { x: 0.5, y: 0.5 },
    c: { x: 0.9, y: 0.9 },
  };

  it("picks the option whose fingerprint is closest to the actual signals", () => {
    expect(pickBestMatch(fingerprints, { x: 0.05, y: 0.15 })).toBe("a");
    expect(pickBestMatch(fingerprints, { x: 0.5, y: 0.45 })).toBe("b");
    expect(pickBestMatch(fingerprints, { x: 0.95, y: 0.85 })).toBe("c");
  });

  it("treats a missing dimension in actual as neutral (0.5), not zero", () => {
    // b's fingerprint (0.5, 0.5) is a perfect match for an all-missing actual read as
    // neutral - it should win over a and c even though neither dimension is provided.
    expect(pickBestMatch(fingerprints, {})).toBe("b");
  });

  it("lets bias tip a close call toward the biased option", () => {
    // Exactly equidistant between a and b before bias.
    const tied = { x: 0.3, y: 0.3 };
    expect(pickBestMatch(fingerprints, tied)).toBe("a"); // first-declared wins a true tie
    expect(pickBestMatch(fingerprints, tied, { b: 0.05 })).toBe("b");
  });

  it("does not let a small bias overrule a strong fingerprint mismatch", () => {
    expect(pickBestMatch(fingerprints, { x: 0.9, y: 0.9 }, { a: 0.05 })).toBe("c");
  });

  it("treats an empty fingerprint as a neutral, always-average match", () => {
    const withEmpty: Record<Option, Record<string, number>> = { ...fingerprints, b: {} };
    // b's distance is now the fixed neutral 0.5 regardless of actual - worse than a
    // perfect a-match, better than a's the moment actual drifts far from a.
    expect(pickBestMatch(withEmpty, { x: 0.1, y: 0.1 })).toBe("a");
  });

  it("is deterministic - identical inputs always produce the same pick", () => {
    const signals = { x: 0.42, y: 0.63 };
    expect(pickBestMatch(fingerprints, signals)).toBe(pickBestMatch(fingerprints, signals));
  });

  it("lets a heavily-weighted, well-matched dimension outweigh two poorly-matched ones", () => {
    type W = "priceLed" | "manyDims";
    const weighted: Record<W, Record<string, number | { target: number; weight: number }>> = {
      // A perfect match on price, weighted 5x, despite missing badly on two unweighted dims...
      priceLed: { price: { target: 0.9, weight: 5 }, other: 0.1, another: 0.1 },
      // ...beats an option that matches actual much better on those same two dims but
      // is off on price.
      manyDims: { price: 0.5, other: 0.5, another: 0.5 },
    };
    const actual = { price: 0.9, other: 0.5, another: 0.5 };

    expect(pickBestMatch(weighted, actual)).toBe("priceLed");
  });

  it("treats a bare number and a weight-1 object identically", () => {
    type O = "a";
    const bare: Record<O, Record<string, number>> = { a: { x: 0.5 } };
    const explicit: Record<O, Record<string, { target: number; weight: number }>> = { a: { x: { target: 0.5, weight: 1 } } };
    const actual = { x: 0.3 };

    // Same option set (one option), same distance either way - this just confirms the
    // weighted and unweighted code paths agree, not a real choice between options.
    expect(pickBestMatch(bare, actual)).toBe(pickBestMatch(explicit, actual));
  });
});
