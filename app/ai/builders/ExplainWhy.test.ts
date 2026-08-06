import { describe, it, expect } from "vitest";
import { explainHero, explainTestimonialsPlacement, explainCtaRepetition, explainPricingFraming, explainPage } from "./ExplainWhy";
import { neutralBusinessIntelligence, neutralCompositionSignals } from "../testFixtures";
import type { Section } from "@/app/types/landing";

function sections(types: string[]): Pick<Section, "type">[] {
  return types.map((type) => ({ type: type as Section["type"] }));
}

describe("explainHero", () => {
  it("recommends authority-first messaging when authorityRequirement is high", () => {
    const explanation = explainHero(neutralBusinessIntelligence({ authorityRequirement: 0.8 }));
    expect(explanation.conclusion).toMatch(/[Aa]uthority-first/);
  });

  it("recommends emotionally-driven messaging when emotionalVsRational is high (and authority is not)", () => {
    const explanation = explainHero(neutralBusinessIntelligence({ authorityRequirement: 0.3, emotionalVsRational: 0.8 }));
    expect(explanation.conclusion).toMatch(/[Ee]motionally-driven/);
  });

  it("recommends rational messaging when emotionalVsRational is low", () => {
    const explanation = explainHero(neutralBusinessIntelligence({ authorityRequirement: 0.3, emotionalVsRational: 0.15 }));
    expect(explanation.conclusion).toMatch(/[Rr]ational/);
  });

  it("includes the actual computed values as reasons, banded", () => {
    const explanation = explainHero(neutralBusinessIntelligence({ authorityRequirement: 0.84 }));
    const reason = explanation.reasons.find((r) => r.label === "authorityRequirement")!;
    expect(reason.value).toBe("0.84 (high)");
  });
});

describe("explainTestimonialsPlacement", () => {
  it("says 'not included' when testimonials aren't in the section list", () => {
    const explanation = explainTestimonialsPlacement(neutralCompositionSignals(), sections(["hero", "footer"]));
    expect(explanation.conclusion).toMatch(/[Nn]ot included/);
  });

  it("says 'before pricing' when testimonials come before pricing in the real section order", () => {
    const explanation = explainTestimonialsPlacement(
      neutralCompositionSignals(),
      sections(["hero", "testimonials", "pricing", "footer"])
    );
    expect(explanation.conclusion).toMatch(/before pricing/);
  });

  it("says 'after pricing' when testimonials come after pricing in the real section order", () => {
    const explanation = explainTestimonialsPlacement(
      neutralCompositionSignals(),
      sections(["hero", "pricing", "testimonials", "footer"])
    );
    expect(explanation.conclusion).toMatch(/after pricing/);
  });
});

describe("explainCtaRepetition", () => {
  it("reports a single CTA when there's no dedicated cta section", () => {
    const explanation = explainCtaRepetition(neutralCompositionSignals(), sections(["hero", "footer"]));
    expect(explanation.conclusion).toMatch(/single call to action/);
  });

  it("reports the real repetition count (hero + every cta section)", () => {
    const explanation = explainCtaRepetition(neutralCompositionSignals(), sections(["hero", "features", "cta", "footer"]));
    expect(explanation.conclusion).toContain("Repeated 2x");
  });
});

describe("explainPricingFraming", () => {
  it("says 'not included' when there's no pricing section", () => {
    const explanation = explainPricingFraming(neutralBusinessIntelligence(), sections(["hero", "footer"]));
    expect(explanation.conclusion).toMatch(/[Nn]ot included/);
  });

  it("uses premium framing language for high pricePositioning", () => {
    const explanation = explainPricingFraming(
      neutralBusinessIntelligence({ pricePositioning: 0.85 }),
      sections(["hero", "pricing", "footer"])
    );
    expect(explanation.conclusion).toMatch(/[Pp]remium framing/);
  });

  it("uses value framing language for low pricePositioning", () => {
    const explanation = explainPricingFraming(
      neutralBusinessIntelligence({ pricePositioning: 0.15 }),
      sections(["hero", "pricing", "footer"])
    );
    expect(explanation.conclusion).toMatch(/[Vv]alue framing/);
  });
});

describe("explainPage", () => {
  it("returns exactly one explanation for each of hero/testimonials/cta/pricing", () => {
    const explanations = explainPage(neutralBusinessIntelligence(), neutralCompositionSignals(), sections(["hero", "footer"]));
    expect(explanations.map((e) => e.title)).toEqual(["Hero", "Testimonials", "CTA", "Pricing"]);
  });

  it("is fully deterministic for the same inputs", () => {
    const bi = neutralBusinessIntelligence({ authorityRequirement: 0.7 });
    const signals = neutralCompositionSignals({ urgency: 0.8 });
    const secs = sections(["hero", "testimonials", "cta", "pricing", "footer"]);
    expect(explainPage(bi, signals, secs)).toEqual(explainPage(bi, signals, secs));
  });
});
