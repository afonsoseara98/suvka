import { describe, it, expect } from "vitest";
import { buildDesignSystem } from "./DesignPlanner";
import { buildBusinessProfile } from "./BusinessProfileBuilder";
import { buildBusinessIntelligence } from "./BusinessIntelligence";
import { neutralBusinessIntelligence as neutralBi } from "../testFixtures";
import type { DesignStyle } from "@/app/types/design";

const VALID_STYLES: DesignStyle[] = ["saas", "agency", "luxury", "corporate", "medical", "restaurant", "fitness"];

// Same bland-prompt-per-industry fixture ArchetypeResolver.test.ts uses, so both
// engines are validated end-to-end through the identical, realistic BI computation.
const BLAND_PROMPT_BY_INDUSTRY: Record<string, string> = {
  startup: "A SaaS platform for team collaboration",
  agency: "A digital marketing agency helping brands grow",
  medical: "A dental clinic for families",
  restaurant: "A cozy restaurant downtown",
  fitness: "A local gym offering personal training",
  law: "A law firm specializing in business litigation",
  real_estate: "A real estate agency helping home buyers and sellers",
  ecommerce: "An online store selling handmade goods",
  education: "An online learning platform with courses",
  generic: "A local service business",
};

function designFor(prompt: string) {
  const profile = buildBusinessProfile(prompt);
  const bi = buildBusinessIntelligence(prompt, profile);
  return buildDesignSystem(bi);
}

describe("DesignPlanner (Visual Engine)", () => {
  it("produces a valid DesignSystem for every industry's bland-prompt default", () => {
    for (const prompt of Object.values(BLAND_PROMPT_BY_INDUSTRY)) {
      expect(VALID_STYLES).toContain(designFor(prompt).style);
    }
  });

  it("is deterministic - identical inputs always produce the same DesignSystem", () => {
    const bi = neutralBi();
    expect(buildDesignSystem(bi)).toEqual(buildDesignSystem(bi));
  });

  // Pinned expectations for the bland/default case, for the same reason
  // ArchetypeResolver.test.ts pins its own defaults: a silent drift here for the
  // neutral case would mean the fingerprints stopped matching the reasoning they're
  // supposed to encode, even though a distinctive prompt is free to move the outcome.
  // law and ecommerce land somewhere new here (medical, agency) rather than the old
  // switch's "saas" default - under the old code every industry without its own
  // explicit case (startup/law/ecommerce/education/generic) was dumped into the same
  // bucket purely for lack of a case, not because saas was ever a considered fit for a
  // law firm or an online store. Landing on a fingerprint-matched style instead is the
  // intended improvement, not a regression to explain away.
  it.each([
    ["startup", "saas"],
    ["agency", "agency"],
    ["medical", "medical"],
    ["restaurant", "restaurant"],
    ["fitness", "fitness"],
    ["law", "medical"],
    ["real_estate", "luxury"],
    ["ecommerce", "agency"],
    ["education", "saas"],
    ["generic", "saas"],
  ] as const)("resolves a bland %s prompt to the %s style", (industry, expectedStyle) => {
    expect(designFor(BLAND_PROMPT_BY_INDUSTRY[industry]).style).toBe(expectedStyle);
  });

  it("gives real_estate the luxury style and a minimal hero, matching its luxury archetype", () => {
    const design = designFor(BLAND_PROMPT_BY_INDUSTRY.real_estate);
    expect(design.style).toBe("luxury");
    expect(design.heroVariant).toBe("minimal");
  });

  it("reaches every reachable style (all but the still-themeless 'corporate') from at least one industry's bland default", () => {
    const reached = new Set(Object.values(BLAND_PROMPT_BY_INDUSTRY).map((prompt) => designFor(prompt).style));
    const reachableStyles = VALID_STYLES.filter((style) => style !== "corporate");

    expect(reachableStyles.every((style) => reached.has(style))).toBe(true);
  });

  describe("signal-driven, not industry-driven", () => {
    // buildDesignSystem no longer even accepts an industry parameter - the guarantee
    // that it can't be consulted is now structural (a type-level fact), not just
    // behavioral. This test is about the behavior that guarantee is meant to enable:
    // language alone, within an industry that would never have reached "luxury" under
    // the old switch(industry), can now do so.
    it("routes a prompt written with premium/exclusive/visual language to the luxury style", () => {
      const luxuryDesign = designFor(
        "An exclusive, bespoke jewelry atelier with a stunning, curated portfolio for discerning clients"
      );
      expect(luxuryDesign.style).toBe("luxury");
    });

    // Regression: a genuinely visual/emotional luxury business (extreme pricePositioning
    // + real visualImportance/emotionalVsRational) initially lost to "restaurant" and
    // then to "fitness" during tuning - both fingerprints happened to be tight 2-3 dim
    // matches for "visual and somewhat emotional" without any price dimension to be
    // penalized on. Fixed by giving every non-luxury visual/emotional style its own
    // pricePositioning target so an extreme price signal can't be ignored by them.
    it("routes an extremely premium, visual, emotional prompt to luxury rather than restaurant or fitness", () => {
      const design = designFor(
        "Landing page for a luxury wedding photographer offering bespoke, exclusive photography " +
          "packages for high-end weddings, with a curated portfolio, a unique one-of-a-kind " +
          "experience, and unforgettable artisan photography."
      );
      expect(design.style).toBe("luxury");
    });
  });
});
