import { describe, it, expect } from "vitest";
import { buildSections } from "./SectionPlanner";
import type { LandingComposition } from "../types/composition";

function composition(overrides: Partial<LandingComposition>): LandingComposition {
  return {
    heroVariant: "centered",
    sections: [],
    ...overrides,
  };
}

describe("SectionPlanner - role/prominence -> variant translation", () => {
  it("uses the composition's heroVariant for the hero section", () => {
    const [hero] = buildSections(
      composition({ heroVariant: "minimal", sections: [{ role: "hero", prominence: "primary", rhythm: "standard" }] })
    );
    expect(hero.variant).toBe("minimal");
  });

  it("resolves compact features to list and primary/standard to grid", () => {
    const [compact, standard, primary] = buildSections(
      composition({
        sections: [
          { role: "features", prominence: "compact", rhythm: "standard" },
          { role: "features", prominence: "standard", rhythm: "standard" },
          { role: "features", prominence: "primary", rhythm: "standard" },
        ],
      })
    );
    expect(compact.variant).toBe("list");
    expect(standard.variant).toBe("grid");
    expect(primary.variant).toBe("grid");
  });

  it("resolves compact benefits to list, otherwise cards", () => {
    const [compact, primary] = buildSections(
      composition({
        sections: [
          { role: "benefits", prominence: "compact", rhythm: "standard" },
          { role: "benefits", prominence: "primary", rhythm: "standard" },
        ],
      })
    );
    expect(compact.variant).toBe("list");
    expect(primary.variant).toBe("cards");
  });

  it("resolves compact testimonials to minimal, otherwise cards", () => {
    const [compact, primary] = buildSections(
      composition({
        sections: [
          { role: "testimonials", prominence: "compact", rhythm: "standard" },
          { role: "testimonials", prominence: "primary", rhythm: "standard" },
        ],
      })
    );
    expect(compact.variant).toBe("minimal");
    expect(primary.variant).toBe("cards");
  });

  it("resolves primary pricing to premium, otherwise simple", () => {
    const [primary, standard, compact] = buildSections(
      composition({
        sections: [
          { role: "pricing", prominence: "primary", rhythm: "standard" },
          { role: "pricing", prominence: "standard", rhythm: "standard" },
          { role: "pricing", prominence: "compact", rhythm: "standard" },
        ],
      })
    );
    expect(primary.variant).toBe("premium");
    expect(standard.variant).toBe("simple");
    expect(compact.variant).toBe("simple");
  });

  it("gives single-treatment sections (stats/faq/footer) their one fixed variant", () => {
    const [stats, faq, footer] = buildSections(
      composition({
        sections: [
          { role: "stats", prominence: "standard", rhythm: "standard" },
          { role: "faq", prominence: "standard", rhythm: "standard" },
          { role: "footer", prominence: "compact", rhythm: "standard" },
        ],
      })
    );
    expect(stats.variant).toBe("cards");
    expect(faq.variant).toBe("accordion");
    expect(footer.variant).toBe("simple");
  });

  it("carries prominence and rhythm through onto the rendered Section unchanged", () => {
    const [section] = buildSections(
      composition({ sections: [{ role: "benefits", prominence: "primary", rhythm: "breather" }] })
    );
    expect(section.prominence).toBe("primary");
    expect(section.rhythm).toBe("breather");
  });
});
