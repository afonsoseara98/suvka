import { describe, it, expect } from "vitest";
import { fromLandingPage, toLandingPage, mergeDna } from "./pageState";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { LandingPage } from "@/app/types/landing";

function landingPage(overrides: Partial<LandingPage> = {}): LandingPage {
  return {
    dna: neutralStrategyDna(),
    site: {
      seo: { title: "T", description: "D", keywords: [], ogTitle: "", ogDescription: "" },
      branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    sections: [
      { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
      { type: "stats", variant: "inline", prominence: "standard", rhythm: "standard" },
      { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
    ],
    hero: {
      badge: "Trusted",
      title: "Title",
      highlightWord: "Title",
      subtitle: "Sub",
      primaryCTA: "Go",
      secondaryCTA: "Learn",
      imageStyle: "abstract",
      imagePrompt: "",
      stats: [],
    },
    stats: [{ value: "10", label: "Years" }],
    features: [{ title: "F", description: "D", icon: "x" }],
    benefits: [{ title: "B", description: "D", icon: "x" }],
    testimonials: [{ name: "N", company: "C", text: "T" }],
    pricing: [{ name: "Plan", price: "10", features: ["A"] }],
    faq: [{ question: "Q", answer: "A" }],
    footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
    ...overrides,
  };
}

describe("fromLandingPage", () => {
  it("produces one SectionInstance per Section, in the same order", () => {
    const state = fromLandingPage(landingPage());
    expect(state.sections.map((s) => s.type)).toEqual(["hero", "stats", "footer"]);
  });

  it("assigns stable, unique ids", () => {
    const state = fromLandingPage(landingPage());
    const ids = state.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(state.sections[0].id).toBe("hero-0");
    expect(state.sections[1].id).toBe("stats-1");
  });

  it("pulls each section's content from the matching type-keyed field", () => {
    const state = fromLandingPage(landingPage());
    expect(state.sections[0].content).toEqual(landingPage().hero);
    expect(state.sections[1].content).toEqual(landingPage().stats);
    expect(state.sections[2].content).toEqual(landingPage().footer);
  });

  it("carries variant/prominence/rhythm through into layout", () => {
    const state = fromLandingPage(landingPage());
    expect(state.sections[1].variant).toBe("inline");
    expect(state.sections[1].layout).toEqual({ prominence: "standard", rhythm: "standard" });
  });

  it("initializes every instance as visible, unlocked, version 0, createdBy template", () => {
    const state = fromLandingPage(landingPage());
    for (const s of state.sections) {
      expect(s.visibility).toBe("visible");
      expect(s.locked).toBe(false);
      expect(s.version).toBe(0);
      expect(s.metadata.createdBy).toBe("template");
      expect(s.themeOverrides).toEqual({});
    }
  });

  it("gives cta/logoCloud sections null content", () => {
    const state = fromLandingPage(
      landingPage({
        sections: [
          { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
          { type: "logoCloud", variant: "default", prominence: "standard", rhythm: "standard" },
          { type: "cta", variant: "default", prominence: "standard", rhythm: "standard" },
          { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
        ],
      })
    );
    expect(state.sections.find((s) => s.type === "logoCloud")?.content).toBeNull();
    expect(state.sections.find((s) => s.type === "cta")?.content).toBeNull();
  });

  it("carries dna and site through unchanged", () => {
    const lp = landingPage();
    const state = fromLandingPage(lp);
    expect(state.dna).toEqual(lp.dna);
    expect(state.site).toEqual(lp.site);
  });
});

describe("toLandingPage - round trip", () => {
  it("recovers the original content/sections after fromLandingPage -> toLandingPage", () => {
    // Every type with content must also appear in `sections` - toLandingPage only ever
    // walks `state.sections` (matching how the real pipeline always keeps them in sync).
    const lp = landingPage({
      sections: [
        { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
        { type: "stats", variant: "inline", prominence: "standard", rhythm: "standard" },
        { type: "features", variant: "grid", prominence: "primary", rhythm: "standard" },
        { type: "benefits", variant: "cards", prominence: "standard", rhythm: "standard" },
        { type: "testimonials", variant: "cards", prominence: "standard", rhythm: "standard" },
        { type: "pricing", variant: "simple", prominence: "standard", rhythm: "standard" },
        { type: "faq", variant: "accordion", prominence: "standard", rhythm: "standard" },
        { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
      ],
    });
    const roundTripped = toLandingPage(fromLandingPage(lp));
    expect(roundTripped).toEqual(lp);
  });

  it("keeps the LAST instance of a duplicated type for the flat field", () => {
    const state = fromLandingPage(landingPage());
    const duplicatedStats = {
      ...state.sections[1],
      id: "stats-extra",
      content: [{ value: "99", label: "Extra" }],
    };
    const withDuplicate = { ...state, sections: [...state.sections, duplicatedStats] };
    expect(toLandingPage(withDuplicate).stats).toEqual([{ value: "99", label: "Extra" }]);
  });
});

describe("mergeDna", () => {
  it("shallow-merges overrides on top of a base DNA", () => {
    const base = neutralStrategyDna({ saturation: 0.5, roundedness: 0.5 });
    const merged = mergeDna(base, { saturation: 0.9 });
    expect(merged.saturation).toBe(0.9);
    expect(merged.roundedness).toBe(0.5);
  });

  it("clamps every numeric field to [0, 1]", () => {
    const base = neutralStrategyDna();
    const merged = mergeDna(base, { saturation: 1.5, roundedness: -0.3 });
    expect(merged.saturation).toBe(1);
    expect(merged.roundedness).toBe(0);
  });

  it("leaves sectionWeight untouched when not part of the override", () => {
    const base = neutralStrategyDna();
    const merged = mergeDna(base, { saturation: 0.9 });
    expect(merged.sectionWeight).toEqual(base.sectionWeight);
  });

  it("returns the base unchanged when overrides is empty", () => {
    const base = neutralStrategyDna();
    expect(mergeDna(base, {})).toEqual(base);
  });
});
