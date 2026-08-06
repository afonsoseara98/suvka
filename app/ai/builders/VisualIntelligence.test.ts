import { describe, it, expect } from "vitest";
import { deriveVisualIntent } from "./VisualIntelligence";
import { neutralBusinessIntelligence, neutralStrategyDna } from "../testFixtures";
import type { BusinessProfile, Industry } from "../types";

const ALL_INDUSTRIES: readonly Industry[] = [
  "startup",
  "agency",
  "medical",
  "restaurant",
  "fitness",
  "law",
  "real_estate",
  "ecommerce",
  "education",
  "beauty",
  "home_services",
  "consulting",
  "automotive",
  "events",
  "generic",
];

function profile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    industry: "generic",
    businessModel: "services",
    primaryGoal: "generate_leads",
    audience: "small business owners",
    tone: "professional",
    priceLevel: "medium",
    ...overrides,
  } as BusinessProfile;
}

describe("deriveVisualIntent", () => {
  it("produces a usable intent for every industry", () => {
    for (const industry of ALL_INDUSTRIES) {
      const intent = deriveVisualIntent(profile({ industry }), neutralBusinessIntelligence(), neutralStrategyDna());

      expect(intent.subject.length, industry).toBeGreaterThan(0);
      expect(intent.alt.length, industry).toBeGreaterThan(0);
      expect(intent.alternateSubjects.length, industry).toBeGreaterThan(0);
    }
  });

  it("never offers the same alternate subject twice", () => {
    // The provider walks this list in order; a duplicate is a wasted network round trip
    // against a query that already missed.
    for (const industry of ALL_INDUSTRIES) {
      const { alternateSubjects } = deriveVisualIntent(
        profile({ industry }),
        neutralBusinessIntelligence(),
        neutralStrategyDna()
      );
      expect(new Set(alternateSubjects).size, industry).toBe(alternateSubjects.length);
    }
  });
});

// THE REGRESSION THIS MODULE EXISTS FOR
//
// Measured against the 20 real businesses in the benchmark corpus, the previous
// imageStyleFor(heroImageryProminence, complexity) sent 13 of 20 to a fake analytics
// dashboard and 19 of 20 to one of two fake software mockups - a wedding planner, a
// dentist, a photographer and a barber all rendered a SaaS screenshot. These assertions
// exist so that can never silently come back.
describe("deriveVisualIntent - no non-software business is sent to a software mockup", () => {
  const NON_SOFTWARE = ALL_INDUSTRIES.filter((industry) => industry !== "startup");

  it("asks for a photograph for every non-software industry, at every DNA extreme", () => {
    // The old function keyed on exactly these two axes, so sweeping them is what proves
    // the decision no longer depends on them.
    for (const industry of NON_SOFTWARE) {
      for (const heroImageryProminence of [0, 0.5, 1]) {
        for (const complexity of [0, 0.5, 1]) {
          const intent = deriveVisualIntent(
            profile({ industry }),
            neutralBusinessIntelligence(),
            neutralStrategyDna({ heroImageryProminence, complexity })
          );
          expect(intent.treatment, `${industry} @ ${heroImageryProminence}/${complexity}`).toBe("photo");
        }
      }
    }
  });

  it("still gives a software product a software scene", () => {
    // The hero scenes were never wrong for the business they were built for - deleting
    // them would have been a different bug.
    const intent = deriveVisualIntent(profile({ industry: "startup" }), neutralBusinessIntelligence(), neutralStrategyDna());
    expect(intent.treatment).toBe("software-scene");
  });

  it("preserves the original scene choice for software products", () => {
    // Same thresholds as the function this replaced, so a SaaS page renders the mockup it
    // always rendered.
    const cases = [
      { dna: { heroImageryProminence: 0.7, complexity: 0.6 }, expected: "product" },
      { dna: { heroImageryProminence: 0.7, complexity: 0.2 }, expected: "abstract" },
      { dna: { heroImageryProminence: 0.2, complexity: 0.7 }, expected: "analytics" },
      { dna: { heroImageryProminence: 0.2, complexity: 0.45 }, expected: "dashboard" },
      { dna: { heroImageryProminence: 0.2, complexity: 0.1 }, expected: "website" },
    ] as const;

    for (const { dna, expected } of cases) {
      const intent = deriveVisualIntent(
        profile({ industry: "startup" }),
        neutralBusinessIntelligence(),
        neutralStrategyDna(dna)
      );
      expect(intent.scene, JSON.stringify(dna)).toBe(expected);
    }
  });

  it("asks for a subject that names what the business actually does", () => {
    // The concrete failures from the measured run, asserted by name.
    const expectations: ReadonlyArray<readonly [Industry, string]> = [
      ["restaurant", "restaurant"],
      ["events", "celebration"],
      ["medical", "clinic"],
      ["beauty", "salon"],
      ["home_services", "home"],
      ["real_estate", "living room"],
      ["fitness", "gym"],
      ["automotive", "garage"],
    ];

    for (const [industry, expectedWord] of expectations) {
      const intent = deriveVisualIntent(profile({ industry }), neutralBusinessIntelligence(), neutralStrategyDna());
      expect(intent.subject.toLowerCase(), industry).toContain(expectedWord);
    }
  });
});

describe("deriveVisualIntent - continuous modifiers", () => {
  it("asks for a different picture for a premium and a budget business in the same industry", () => {
    // "Luxury Wedding Photographer" and "Budget Wedding Photographer" share an industry
    // and must not share a photograph - this is the part that stays DNA-derived rather
    // than looked up.
    const premium = deriveVisualIntent(
      profile({ industry: "events" }),
      neutralBusinessIntelligence({ pricePositioning: 0.95 }),
      neutralStrategyDna()
    );
    const budget = deriveVisualIntent(
      profile({ industry: "events" }),
      neutralBusinessIntelligence({ pricePositioning: 0.05 }),
      neutralStrategyDna()
    );

    expect(premium.subject).not.toBe(budget.subject);
  });

  it("leaves the subject unqualified in the middle of the price range", () => {
    const mid = deriveVisualIntent(
      profile({ industry: "events" }),
      neutralBusinessIntelligence({ pricePositioning: 0.5 }),
      neutralStrategyDna()
    );
    expect(mid.subject).toBe(mid.alternateSubjects[0]);
  });

  it("falls back to the unqualified scene before jumping to a generic one", () => {
    const intent = deriveVisualIntent(
      profile({ industry: "restaurant" }),
      neutralBusinessIntelligence({ pricePositioning: 0.95 }),
      neutralStrategyDna()
    );
    expect(intent.subject).not.toBe(intent.alternateSubjects[0]);
    expect(intent.subject).toContain(intent.alternateSubjects[0]);
  });

  it("orients the image to the hero layout the DNA already chose", () => {
    const split = deriveVisualIntent(profile(), neutralBusinessIntelligence(), neutralStrategyDna({ heroSplitLean: 1 }));
    const centered = deriveVisualIntent(profile(), neutralBusinessIntelligence(), neutralStrategyDna({ heroSplitLean: 0 }));

    expect(split.orientation).toBe("square");
    expect(centered.orientation).toBe("landscape");
  });

  it("is deterministic - the same business always asks for the same picture", () => {
    const once = deriveVisualIntent(profile({ industry: "beauty" }), neutralBusinessIntelligence(), neutralStrategyDna());
    const twice = deriveVisualIntent(profile({ industry: "beauty" }), neutralBusinessIntelligence(), neutralStrategyDna());
    expect(once).toEqual(twice);
  });
});
