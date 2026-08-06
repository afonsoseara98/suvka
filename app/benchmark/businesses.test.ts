import { describe, it, expect } from "vitest";
import { BENCHMARK_BUSINESSES } from "./businesses";

describe("BENCHMARK_BUSINESSES", () => {
  it("has exactly 20 businesses", () => {
    expect(BENCHMARK_BUSINESSES).toHaveLength(20);
  });

  it("has a unique id for every business", () => {
    const ids = BENCHMARK_BUSINESSES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every business a non-trivial prompt", () => {
    for (const business of BENCHMARK_BUSINESSES) {
      expect(business.prompt.length).toBeGreaterThan(20);
      expect(business.label.length).toBeGreaterThan(0);
    }
  });
});
