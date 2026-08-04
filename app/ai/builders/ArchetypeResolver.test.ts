import { describe, it, expect } from "vitest";
import { resolveArchetype } from "./ArchetypeResolver";
import { buildBusinessProfile } from "./BusinessProfileBuilder";
import { buildBusinessIntelligence } from "./BusinessIntelligence";
import { neutralBusinessIntelligence as neutralBi } from "../testFixtures";
import type { BusinessProfile } from "../types";
import type { PageArchetype } from "../types/archetype";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";

const ALL_ARCHETYPES: PageArchetype[] = [
  "authority",
  "luxury",
  "local_business",
  "lead_generation",
  "personal_brand",
  "product_showcase",
  "booking",
  "portfolio",
  "hospitality",
];

// One representative, deliberately bland (no strategic-dimension lexicon hits) prompt
// per industry - this exercises resolveArchetype end-to-end through the real
// BusinessProfileBuilder + BusinessIntelligence pipeline pieces, the same path
// PipelineBuilder.ts uses, rather than a synthetic double that could quietly drift from
// what production actually computes.
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

function resolveFor(prompt: string): { archetype: PageArchetype; profile: BusinessProfile; bi: BusinessIntelligenceProfile } {
  const profile = buildBusinessProfile(prompt);
  const bi = buildBusinessIntelligence(prompt, profile);
  return { archetype: resolveArchetype(profile, bi), profile, bi };
}

describe("ArchetypeResolver (Narrative Engine) - full archetype reachability", () => {
  // A declared PageArchetype that no industry ever resolves to is dead composition -
  // SectionPlanner.ts defines a section order/variant set for it that never runs. This
  // guards the invariant directly rather than trusting the fingerprints to stay complete
  // by inspection.
  it("reaches every declared PageArchetype from at least one industry's bland-prompt default", () => {
    const reached = new Set(Object.values(BLAND_PROMPT_BY_INDUSTRY).map((prompt) => resolveFor(prompt).archetype));

    const unreachable = ALL_ARCHETYPES.filter((archetype) => !reached.has(archetype));

    expect(unreachable).toEqual([]);
  });

  it("resolves every industry to one of the declared PageArchetype values", () => {
    for (const prompt of Object.values(BLAND_PROMPT_BY_INDUSTRY)) {
      expect(ALL_ARCHETYPES).toContain(resolveFor(prompt).archetype);
    }
  });

  it("is deterministic - identical inputs always resolve to the same archetype", () => {
    const a = resolveFor(BLAND_PROMPT_BY_INDUSTRY.law);
    const b = resolveFor(BLAND_PROMPT_BY_INDUSTRY.law);
    expect(a.archetype).toBe(b.archetype);
  });

  // Pinned expectations for the bland/default case of every industry - not because
  // these particular archetypes are the only valid answer (the whole point of the
  // rewrite is that a distinctive prompt can move the outcome), but because a silent,
  // unexplained change here for the *neutral* case would mean the fingerprints drifted
  // away from the compositional reasoning they're supposed to encode.
  it.each([
    ["startup", "lead_generation"],
    ["agency", "portfolio"],
    ["medical", "booking"],
    ["restaurant", "hospitality"],
    ["fitness", "local_business"],
    ["law", "authority"],
    ["real_estate", "luxury"],
    ["ecommerce", "product_showcase"],
    ["education", "personal_brand"],
    ["generic", "local_business"],
  ] as const)("resolves a bland %s prompt to %s", (industry, expected) => {
    expect(resolveFor(BLAND_PROMPT_BY_INDUSTRY[industry]).archetype).toBe(expected);
  });
});

describe("ArchetypeResolver (Narrative Engine) - signal-driven, not industry-driven", () => {
  it("resolves a distinctive law firm prompt away from the industry's own bland default", () => {
    // Same industry as BLAND_PROMPT_BY_INDUSTRY.law, but written to score dramatically
    // low on decisionComplexity/trustDifficulty/authorityRequirement instead - the old
    // industry-keyed table could never have produced anything but "authority" here.
    const casualPrompt = "A simple, easy, one-click way to get quick legal help, guaranteed and risk-free";
    const { archetype } = resolveFor(casualPrompt);
    expect(archetype).not.toBe("authority");
  });

  it("never consults industry directly - two different industries with the same BusinessIntelligenceProfile resolve identically", () => {
    const bi = buildBusinessIntelligence("A dental clinic for families", buildBusinessProfile("A dental clinic for families"));
    const asMedical: BusinessProfile = { ...buildBusinessProfile("A dental clinic for families"), industry: "medical" };
    const asGeneric: BusinessProfile = { ...asMedical, industry: "generic" };

    expect(resolveArchetype(asMedical, bi)).toBe(resolveArchetype(asGeneric, bi));
  });
});

describe("ArchetypeResolver (Narrative Engine) - goal bias", () => {
  function profile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
    return {
      industry: "generic",
      businessModel: "business",
      primaryGoal: "generate_leads",
      audience: "General audience",
      tone: "modern",
      priceLevel: "medium",
      ...overrides,
    };
  }

  it("tips a genuinely close call toward the goal-associated archetype", () => {
    // local_business's fingerprint is the neutral center, so a fully neutral bi is
    // already its best match without any bias - book_consultation's booking bias should
    // still be able to overtake it once the signals are close enough to both.
    const bi = neutralBi({ decisionComplexity: 0.5, riskPerception: 0.55, trustDifficulty: 0.5 });
    expect(resolveArchetype(profile({ primaryGoal: "book_consultation" }), bi)).toBe("booking");
  });

  it("does not override a decisive fingerprint match belonging to a different archetype", () => {
    // Overwhelmingly hospitality-shaped (visual, emotional, trivial decision) - a
    // book_consultation goal bias of 0.1 cannot plausibly close a gap this large.
    const bi = neutralBi({
      visualImportance: 0.85,
      emotionalVsRational: 0.85,
      decisionComplexity: 0.1,
      pricePositioning: 0.5,
    });
    expect(resolveArchetype(profile({ primaryGoal: "book_consultation" }), bi)).toBe("hospitality");
  });
});
