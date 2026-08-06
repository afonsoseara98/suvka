import { describe, it, expect } from "vitest";
import { resolveKnowledge } from "./KnowledgeResolver";
import type { Industry } from "../types";

// Regression coverage for Signal Trace Audit v1 finding #2: 10 of 15 industries used to
// silently receive startupKnowledge (SaaS-flavored content - "AI automation", "Trusted
// by 10,000+ businesses") via a `default` fallback. Every industry now has its own
// dedicated BusinessKnowledge, and resolveKnowledge's signature is `Industry`, not
// `string`, so this switch is exhaustive at compile time - a 16th Industry added
// without a matching case is a type error, not a silent fallback.
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
  "beauty",
  "home_services",
  "consulting",
  "automotive",
  "events",
  "generic",
];

describe("resolveKnowledge", () => {
  it("returns knowledge whose own .industry field matches the requested industry, for every Industry", () => {
    for (const industry of ALL_INDUSTRIES) {
      expect(resolveKnowledge(industry).industry).toBe(industry);
    }
  });

  it("never returns startup's knowledge for a non-startup industry", () => {
    for (const industry of ALL_INDUSTRIES) {
      if (industry === "startup") continue;
      const knowledge = resolveKnowledge(industry);
      expect(knowledge.commonFeatures).not.toContain("AI automation");
      expect(knowledge.trustSignals).not.toContain("Trusted by 10,000+ businesses");
    }
  });

  it("gives every industry a non-empty, distinct set of keywords", () => {
    const keywordSets = ALL_INDUSTRIES.map((industry) => resolveKnowledge(industry).keywords.join("|"));
    for (const keywords of keywordSets) {
      expect(keywords.length).toBeGreaterThan(0);
    }
    expect(new Set(keywordSets).size).toBe(ALL_INDUSTRIES.length);
  });

  it("gives generic industry-agnostic knowledge, not a stand-in for any real vertical", () => {
    const generic = resolveKnowledge("generic");
    expect(generic.keywords).not.toContain("SaaS");
    expect(generic.heroStyle.toLowerCase()).not.toMatch(/dashboard|clinic|salon|restaurant/);
  });
});
