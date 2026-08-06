import { describe, it, expect } from "vitest";
import { buildPrompt } from "./PromptBuilder";
import { resolveKnowledge } from "./KnowledgeResolver";
import { neutralBusinessIntelligence, neutralCompositionSignals, neutralStrategyDna } from "../testFixtures";
import type { BusinessProfile } from "../types";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { Section } from "@/app/types/landing";

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

const PSYCHOLOGY: PsychologyProfile = {
  pains: ["A pain"],
  desires: ["A desire"],
  objections: ["An objection"],
  trustFactors: ["A trust factor"],
  emotionalTriggers: ["A trigger"],
};

const OFFER: OfferStrategy = {
  primaryCTA: "Get Started",
  valueProposition: "A value proposition",
  offerFraming: "An offer framing",
  riskReductionAngle: "A risk reduction angle",
};

const SECTIONS: Section[] = [
  { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
  { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
];

function prompt(signalsOverrides: Partial<Parameters<typeof neutralCompositionSignals>[0]> = {}) {
  return buildPrompt(
    "A test business",
    profile(),
    resolveKnowledge("generic"),
    PSYCHOLOGY,
    OFFER,
    SECTIONS,
    neutralBusinessIntelligence(),
    neutralStrategyDna(),
    "minimal",
    neutralCompositionSignals(signalsOverrides)
  );
}

describe("buildPrompt - COMPOSITION SIGNALS section (Signal Trace Audit v1, finding #4)", () => {
  it("includes a COMPOSITION SIGNALS section in the final prompt", () => {
    expect(prompt()).toContain("COMPOSITION SIGNALS");
  });

  it("the section reflects a HIGH urgency signal with its directive text", () => {
    const text = prompt({ urgency: 0.9 });
    expect(text).toMatch(/urgency: high - make every CTA immediate/);
  });

  it("the section reflects a LOW urgency signal with its directive text", () => {
    const text = prompt({ urgency: 0.1 });
    expect(text).toMatch(/urgency: low - frame the CTA as a low-pressure/);
  });

  it("changing a signal changes the prompt text - it is genuinely wired, not a static block", () => {
    const low = prompt({ socialProofNeed: 0.1 });
    const high = prompt({ socialProofNeed: 0.9 });
    expect(low).not.toBe(high);
    expect(high).toMatch(/socialProofNeed: high/);
    expect(low).toMatch(/socialProofNeed: low/);
  });

  it("appears after PSYCHOLOGY & OFFER STRATEGY and before STRATEGY DNA", () => {
    const text = prompt();
    const psychologyIndex = text.indexOf("PSYCHOLOGY & OFFER STRATEGY");
    const signalsIndex = text.indexOf("COMPOSITION SIGNALS");
    const dnaIndex = text.indexOf("STRATEGY DNA");
    expect(psychologyIndex).toBeLessThan(signalsIndex);
    expect(signalsIndex).toBeLessThan(dnaIndex);
  });
});

describe("buildPrompt - overall structure (baseline coverage - no test existed for this function before)", () => {
  it("includes every top-level section header", () => {
    const text = prompt();
    for (const header of [
      "BUSINESS PROFILE",
      "BUSINESS INTELLIGENCE",
      "PSYCHOLOGY & OFFER STRATEGY",
      "COMPOSITION SIGNALS",
      "STRATEGY DNA",
      "INDUSTRY KNOWLEDGE",
      "PAGE STRUCTURE",
      "USER REQUEST",
    ]) {
      expect(text).toContain(header);
    }
  });

  it("ends with the raw user prompt", () => {
    const text = buildPrompt(
      "Describe my bakery business",
      profile(),
      resolveKnowledge("generic"),
      PSYCHOLOGY,
      OFFER,
      SECTIONS,
      neutralBusinessIntelligence(),
      neutralStrategyDna(),
      "minimal",
      neutralCompositionSignals()
    );
    expect(text.trimEnd().endsWith("Describe my bakery business")).toBe(true);
  });

  it("includes the PAGE STRUCTURE instruction listing every section, in order", () => {
    const text = prompt();
    expect(text).toContain("hero (variant: centered, emphasis: primary)");
    expect(text).toContain("footer (variant: simple, emphasis: compact)");
  });
});
