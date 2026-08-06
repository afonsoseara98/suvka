import { describe, it, expect } from "vitest";
import { updateHeroField, updateArrayItemField, updateFooterField, updatePlanFeature } from "./contentEdits";
import type { HeroData, FooterData, PricingPlan } from "@/app/types/landing";

function heroFixture(): HeroData {
  return {
    badge: "B",
    title: "T",
    highlightWord: "T",
    subtitle: "S",
    primaryCTA: "Go",
    secondaryCTA: "Learn",
    imageStyle: "abstract",
    imagePrompt: "",
    stats: [],
  };
}

describe("updateHeroField", () => {
  it("replaces only the targeted field", () => {
    const hero = heroFixture();
    const next = updateHeroField(hero, "title", "New Title");
    expect(next.title).toBe("New Title");
    expect(next.subtitle).toBe(hero.subtitle);
  });

  it("does not mutate the original object", () => {
    const hero = heroFixture();
    updateHeroField(hero, "title", "New Title");
    expect(hero.title).toBe("T");
  });
});

describe("updateArrayItemField", () => {
  it("replaces the field only at the targeted index", () => {
    const items = [{ value: "1", label: "One" }, { value: "2", label: "Two" }];
    const next = updateArrayItemField(items, 1, "label", "Dois");
    expect(next[0]).toEqual(items[0]);
    expect(next[1]).toEqual({ value: "2", label: "Dois" });
  });

  it("does not mutate the original array or its items", () => {
    const items = [{ value: "1", label: "One" }];
    const next = updateArrayItemField(items, 0, "label", "Um");
    expect(items[0].label).toBe("One");
    expect(next).not.toBe(items);
    expect(next[0]).not.toBe(items[0]);
  });

  it("leaves other items referentially unchanged", () => {
    const items = [{ value: "1", label: "One" }, { value: "2", label: "Two" }];
    const next = updateArrayItemField(items, 0, "value", "1a");
    expect(next[1]).toBe(items[1]);
  });
});

describe("updateFooterField", () => {
  it("replaces only the targeted field", () => {
    const footer: FooterData = { company: "Acme", email: "a@acme.com", copyright: "(c) 2026" };
    const next = updateFooterField(footer, "email", "hello@acme.com");
    expect(next.email).toBe("hello@acme.com");
    expect(next.company).toBe(footer.company);
    expect(footer.email).toBe("a@acme.com");
  });
});

describe("updatePlanFeature", () => {
  const plans: PricingPlan[] = [
    { name: "Basic", price: "10", features: ["A", "B"] },
    { name: "Pro", price: "20", features: ["C", "D"] },
  ];

  it("replaces only the targeted plan's targeted feature", () => {
    const next = updatePlanFeature(plans, 1, 0, "C+");
    expect(next[1].features).toEqual(["C+", "D"]);
    expect(next[0]).toEqual(plans[0]);
  });

  it("does not mutate the original plans or feature arrays", () => {
    updatePlanFeature(plans, 0, 1, "B+");
    expect(plans[0].features).toEqual(["A", "B"]);
  });

  it("leaves other plans referentially unchanged", () => {
    const next = updatePlanFeature(plans, 0, 0, "A+");
    expect(next[1]).toBe(plans[1]);
  });
});
