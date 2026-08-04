import { describe, it, expect } from "vitest";
import { hashString, createSeededRandom, seededPick } from "./seed";

describe("hashString", () => {
  it("is deterministic - the same text always hashes to the same value", () => {
    expect(hashString("A luxury wedding photographer")).toBe(hashString("A luxury wedding photographer"));
  });

  it("produces different hashes for different text (no collision for these cases)", () => {
    expect(hashString("A luxury wedding photographer")).not.toBe(hashString("A cheap wedding photographer"));
  });

  it("is sensitive to small changes, not just wildly different strings", () => {
    expect(hashString("A dental clinic")).not.toBe(hashString("A dental clinics"));
  });

  it("always returns a non-negative 32-bit integer", () => {
    for (const text of ["", "x", "a much longer piece of prompt text describing a business in detail"]) {
      const hash = hashString(text);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(hash)).toBe(true);
    }
  });
});

describe("createSeededRandom", () => {
  it("is deterministic - the same seed always produces the same sequence", () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const sequenceA = [a(), a(), a()];
    const sequenceB = [b(), b(), b()];
    expect(sequenceA).toEqual(sequenceB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    expect(a()).not.toBe(b());
  });

  it("always returns values within [0, 1)", () => {
    const random = createSeededRandom(hashString("test"));
    for (let i = 0; i < 200; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("advances the sequence on every call rather than repeating the same value", () => {
    const random = createSeededRandom(7);
    const values = [random(), random(), random(), random()];
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("seededPick", () => {
  it("is deterministic for a given seed and option set", () => {
    const options = [
      { value: "a", weight: 1 },
      { value: "b", weight: 1 },
      { value: "c", weight: 1 },
    ];
    const pickA = seededPick(createSeededRandom(123), options);
    const pickB = seededPick(createSeededRandom(123), options);
    expect(pickA).toBe(pickB);
  });

  it("never picks a zero-weight option", () => {
    const random = createSeededRandom(99);
    for (let i = 0; i < 100; i++) {
      const pick = seededPick(random, [
        { value: "never", weight: 0 },
        { value: "always", weight: 1 },
      ]);
      expect(pick).toBe("always");
    }
  });

  it("samples every non-zero-weight option across enough draws", () => {
    const random = createSeededRandom(hashString("distribution check"));
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      seen.add(
        seededPick(random, [
          { value: "a", weight: 1 },
          { value: "b", weight: 1 },
          { value: "c", weight: 1 },
        ])
      );
    }
    expect(seen.size).toBe(3);
  });

  it("falls back to the first option when every weight is zero", () => {
    const random = createSeededRandom(1);
    expect(seededPick(random, [{ value: "only", weight: 0 }])).toBe("only");
  });
});
