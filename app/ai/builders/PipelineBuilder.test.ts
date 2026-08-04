import { describe, it, expect, beforeEach } from "vitest";
import { buildPipeline } from "./PipelineBuilder";
import { resetDiversityHistory } from "./DiversityTracker";

beforeEach(() => {
  resetDiversityHistory();
});

describe("buildPipeline - determinism", () => {
  it("returns the exact same result for the same prompt called twice in a row", () => {
    const prompt = "A modern SaaS analytics platform for product teams";
    const a = buildPipeline(prompt);
    const b = buildPipeline(prompt);
    expect(a).toEqual(b);
  });

  it("returns the exact same result for a repeated prompt even after other, different prompts were generated in between", () => {
    const prompt = "A family dental clinic offering checkups";
    const first = buildPipeline(prompt);

    buildPipeline("A luxury wedding photographer with a curated portfolio");
    buildPipeline("A budget-friendly local gym");
    buildPipeline("An enterprise SaaS platform for supply chain analytics");

    const repeated = buildPipeline(prompt);
    expect(repeated).toEqual(first);
  });

  it("still returns a fully-formed result (design family, dna, sections) for every call", () => {
    const result = buildPipeline("A boutique law firm for high-net-worth clients");
    expect(result.designFamily).toBeTruthy();
    expect(result.dna).toBeTruthy();
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.sections[0].type).toBe("hero");
  });
});

describe("buildPipeline - diversity", () => {
  it("produces a different design family and/or section sequence for meaningfully different businesses", () => {
    const a = buildPipeline("A luxury wedding photographer with a curated, exclusive portfolio");
    const b = buildPipeline("A budget-friendly wedding photographer, book now for same-day discounts");

    const sameFamily = a.designFamily === b.designFamily;
    const sameSequence = a.sections.map((s) => s.type).join(">") === b.sections.map((s) => s.type).join(">");

    expect(sameFamily && sameSequence).toBe(false);
  });
});
