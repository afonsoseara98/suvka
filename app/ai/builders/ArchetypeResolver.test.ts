import { describe, it, expect } from "vitest";
import { resolveArchetype } from "./ArchetypeResolver";
import type { BusinessProfile, Industry } from "../types";
import type { PageArchetype } from "../types/archetype";

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

function profileFor(industry: Industry): BusinessProfile {
  return {
    industry,
    businessModel: "",
    primaryGoal: "generate_leads",
    audience: "",
    tone: "modern",
    priceLevel: "medium",
  };
}

describe("ArchetypeResolver - full archetype reachability", () => {
  // A declared PageArchetype that no industry ever resolves to is dead composition -
  // SectionPlanner.ts defines a section order/variant set for it that never runs. This
  // guards the invariant directly rather than trusting the mapping table to stay
  // complete by inspection.
  it("reaches every declared PageArchetype from at least one industry", () => {
    const reached = new Set(
      ALL_INDUSTRIES.map((industry) => resolveArchetype(profileFor(industry)))
    );

    const unreachable = ALL_ARCHETYPES.filter((archetype) => !reached.has(archetype));

    expect(unreachable).toEqual([]);
  });

  it("resolves every industry to one of the declared PageArchetype values", () => {
    for (const industry of ALL_INDUSTRIES) {
      expect(ALL_ARCHETYPES).toContain(resolveArchetype(profileFor(industry)));
    }
  });
});
