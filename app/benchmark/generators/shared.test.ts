import { describe, it, expect } from "vitest";
import { normalizeGenericOutput } from "./shared";

describe("normalizeGenericOutput", () => {
  it("fills prominence/rhythm as 'standard' for every section, and keeps the model's own type/variant/order", () => {
    const result = normalizeGenericOutput({
      sections: [
        { type: "hero", variant: "split" },
        { type: "pricing", variant: "comparison" },
      ],
    });

    expect(result.sections).toEqual([
      { type: "hero", variant: "split", prominence: "standard", rhythm: "standard" },
      { type: "pricing", variant: "comparison", prominence: "standard", rhythm: "standard" },
    ]);
  });

  it("defaults a missing variant to 'default'", () => {
    const result = normalizeGenericOutput({ sections: [{ type: "footer" }] });
    expect(result.sections[0].variant).toBe("default");
  });

  it("drops malformed section entries (missing type) instead of throwing", () => {
    const result = normalizeGenericOutput({ sections: [{ variant: "x" }, { type: "hero", variant: "centered" }] });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].type).toBe("hero");
  });

  it("uses a neutral DNA baseline, not Suvka's own pipeline-computed one", () => {
    const result = normalizeGenericOutput({});
    expect(result.dna.saturation).toBe(0.5);
    expect(result.dna.brightness).toBe(0.3);
  });

  it("falls back to empty-but-valid content arrays/objects for missing fields", () => {
    const result = normalizeGenericOutput({});
    expect(result.stats).toEqual([]);
    expect(result.features).toEqual([]);
    expect(result.hero.title).toBe("");
    expect(result.footer.company).toBe("");
  });

  it("passes through content fields the model actually provided", () => {
    const result = normalizeGenericOutput({
      hero: { badge: "B", title: "Great Title", highlightWord: "Title", subtitle: "S", primaryCTA: "Go", secondaryCTA: "Learn", imageStyle: "abstract", imagePrompt: "", stats: [] },
      features: [{ title: "F1", description: "D", icon: "x" }],
    });
    expect(result.hero.title).toBe("Great Title");
    expect(result.features).toHaveLength(1);
  });
});
