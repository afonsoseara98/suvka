import { describe, it, expect } from "vitest";
import { buildSections } from "./SectionPlanner";
import { createSeededRandom } from "../utils/seed";
import type { LandingComposition } from "../types/composition";
import type { DesignFamilyName } from "../engines/DesignFamily";

function composition(overrides: Partial<LandingComposition>): LandingComposition {
  return {
    heroVariant: "centered",
    sections: [],
    ...overrides,
  };
}

const FAMILY: DesignFamilyName = "corporate"; // a neutral-ish, restrained family for most assertions
const seed = (n: number) => createSeededRandom(n);

describe("SectionPlanner - role/prominence -> variant translation", () => {
  it("uses the composition's heroVariant for the hero section", () => {
    const [hero] = buildSections(
      composition({ heroVariant: "minimal", sections: [{ role: "hero", prominence: "primary", rhythm: "standard" }] }),
      FAMILY,
      seed(1)
    );
    expect(hero.variant).toBe("minimal");
  });

  it("resolves compact features to list always", () => {
    for (let s = 0; s < 10; s++) {
      const [compact] = buildSections(
        composition({ sections: [{ role: "features", prominence: "compact", rhythm: "standard" }] }),
        FAMILY,
        seed(s)
      );
      expect(compact.variant).toBe("list");
    }
  });

  it("resolves non-compact features to one of grid/alternating/bento", () => {
    for (let s = 0; s < 20; s++) {
      const [entry] = buildSections(
        composition({ sections: [{ role: "features", prominence: "primary", rhythm: "standard" }] }),
        FAMILY,
        seed(s)
      );
      expect(["grid", "alternating", "bento"]).toContain(entry.variant);
    }
  });

  it("reaches alternating features far more often under the editorial family than corporate", () => {
    const countFor = (family: DesignFamilyName) => {
      let count = 0;
      for (let s = 0; s < 60; s++) {
        const [entry] = buildSections(
          composition({ sections: [{ role: "features", prominence: "primary", rhythm: "standard" }] }),
          family,
          seed(s)
        );
        if (entry.variant === "alternating") count++;
      }
      return count;
    };

    expect(countFor("editorial")).toBeGreaterThan(countFor("corporate"));
  });

  it("resolves compact benefits to list, otherwise cards", () => {
    const [compact, primary] = buildSections(
      composition({
        sections: [
          { role: "benefits", prominence: "compact", rhythm: "standard" },
          { role: "benefits", prominence: "primary", rhythm: "standard" },
        ],
      }),
      FAMILY,
      seed(1)
    );
    expect(compact.variant).toBe("list");
    expect(primary.variant).toBe("cards");
  });

  it("resolves compact testimonials to minimal always", () => {
    for (let s = 0; s < 10; s++) {
      const [compact] = buildSections(
        composition({ sections: [{ role: "testimonials", prominence: "compact", rhythm: "standard" }] }),
        FAMILY,
        seed(s)
      );
      expect(compact.variant).toBe("minimal");
    }
  });

  it("resolves non-compact testimonials to one of cards/spotlight", () => {
    for (let s = 0; s < 20; s++) {
      const [entry] = buildSections(
        composition({ sections: [{ role: "testimonials", prominence: "primary", rhythm: "standard" }] }),
        FAMILY,
        seed(s)
      );
      expect(["cards", "spotlight"]).toContain(entry.variant);
    }
  });

  it("resolves pricing to one of the prominence-appropriate base variant or comparison", () => {
    for (let s = 0; s < 20; s++) {
      const [entry] = buildSections(
        composition({ sections: [{ role: "pricing", prominence: "primary", rhythm: "standard" }] }),
        FAMILY,
        seed(s)
      );
      expect(["premium", "comparison"]).toContain(entry.variant);
    }
  });

  it("gives single-treatment sections (stats/faq/footer/logoCloud/cta) their one fixed variant", () => {
    const [stats, faq, footer, logoCloud, cta] = buildSections(
      composition({
        sections: [
          { role: "stats", prominence: "standard", rhythm: "standard" },
          { role: "faq", prominence: "standard", rhythm: "standard" },
          { role: "footer", prominence: "compact", rhythm: "standard" },
          { role: "logoCloud", prominence: "standard", rhythm: "standard" },
          { role: "cta", prominence: "standard", rhythm: "standard" },
        ],
      }),
      FAMILY,
      seed(1)
    );
    expect(stats.variant).toBe("cards");
    expect(faq.variant).toBe("accordion");
    expect(footer.variant).toBe("simple");
    expect(logoCloud.variant).toBe("default");
    expect(cta.variant).toBe("default");
  });

  it("carries prominence and rhythm through onto the rendered Section unchanged", () => {
    const [section] = buildSections(
      composition({ sections: [{ role: "benefits", prominence: "primary", rhythm: "breather" }] }),
      FAMILY,
      seed(1)
    );
    expect(section.prominence).toBe("primary");
    expect(section.rhythm).toBe("breather");
  });

  it("is deterministic for a given seed and family", () => {
    const build = () =>
      buildSections(
        composition({
          sections: [
            { role: "features", prominence: "primary", rhythm: "standard" },
            { role: "pricing", prominence: "standard", rhythm: "standard" },
          ],
        }),
        "bold",
        seed(7)
      );
    expect(build()).toEqual(build());
  });
});
