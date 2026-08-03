import { describe, it, expect } from "vitest";
import { buildDesignSystem } from "./DesignPlanner";
import type { Industry } from "../types";
import type { DesignStyle } from "@/app/types/design";

const ALL_INDUSTRIES: Industry[] = [
  "startup",
  "agency",
  "medical",
  "restaurant",
  "fitness",
  "law",
  "real_estate",
  "ecommerce",
  "education",
  "generic",
];

const VALID_STYLES: DesignStyle[] = ["saas", "agency", "luxury", "corporate", "medical", "restaurant", "fitness"];

describe("DesignPlanner", () => {
  it("produces a valid DesignSystem for every declared industry", () => {
    for (const industry of ALL_INDUSTRIES) {
      const design = buildDesignSystem(industry);
      expect(VALID_STYLES).toContain(design.style);
    }
  });

  // Regression guard: ArchetypeResolver.ts gives real_estate the "luxury" PageArchetype
  // (minimal hero, no pricing), but DesignPlanner used to leave real_estate in the
  // default "saas" bucket, so the page's visual theme (indigo/violet) silently
  // disagreed with its own composition. This pins the fix in place.
  it("gives real_estate the luxury style and a minimal hero, matching its luxury archetype", () => {
    const design = buildDesignSystem("real_estate");
    expect(design.style).toBe("luxury");
    expect(design.heroVariant).toBe("minimal");
  });

  it("gives every non-default industry its own distinct style from the shared default", () => {
    const defaultStyle = buildDesignSystem("generic").style;

    expect(buildDesignSystem("medical").style).not.toBe(defaultStyle);
    expect(buildDesignSystem("restaurant").style).not.toBe(defaultStyle);
    expect(buildDesignSystem("fitness").style).not.toBe(defaultStyle);
    expect(buildDesignSystem("agency").style).not.toBe(defaultStyle);
    expect(buildDesignSystem("real_estate").style).not.toBe(defaultStyle);
  });

  // BusinessIntelligence tie-breaker: a default-bucket industry whose prompt reads as
  // genuinely premium (pricePositioning >= 0.75, e.g. a "boutique/exclusive" startup
  // or agency) should get the same luxury identity real_estate gets by industry alone,
  // rather than being forced into the generic "saas" look purely because of its
  // industry classification.
  describe("pricePositioning tie-breaker", () => {
    it("routes a default-bucket industry to the luxury style once pricePositioning clears 0.75", () => {
      const design = buildDesignSystem("startup", 0.9);
      expect(design.style).toBe("luxury");
      expect(design.heroVariant).toBe("minimal");
    });

    it("leaves a default-bucket industry on its normal style below the 0.75 threshold", () => {
      expect(buildDesignSystem("startup", 0.5).style).toBe("saas");
      expect(buildDesignSystem("startup", 0.74).style).toBe("saas");
    });

    it("stays on the default style when pricePositioning is omitted (backward compatible)", () => {
      expect(buildDesignSystem("startup").style).toBe("saas");
    });

    it("never overrides an industry that already has its own explicit style", () => {
      const design = buildDesignSystem("medical", 0.95);
      expect(design.style).toBe("medical");
    });
  });
});
