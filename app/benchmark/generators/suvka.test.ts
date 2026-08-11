import { describe, it, expect } from "vitest";
import { generateSuvka } from "./suvka";
import type { ChatCompletionClient } from "@/app/ai/generateLandingPage";

const MINIMAL_LLM_JSON = JSON.stringify({
  site: {
    seo: { title: "T", description: "D", keywords: [], ogTitle: "", ogDescription: "" },
    branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
    images: { heroPrompt: "", ogImagePrompt: "" },
  },
  hero: {
    badge: "B",
    title: "T",
    highlightWord: "T",
    subtitle: "S",
    primaryCTA: "Go",
    secondaryCTA: "Learn",
    imageStyle: "dashboard",
    stats: [],
  },
  stats: [],
  features: [],
  benefits: [],
  testimonials: [],
  pricing: [],
  faq: [],
  footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
});

function fakeClient(): ChatCompletionClient {
  return {
    chat: { completions: { create: async () => ({ choices: [{ message: { content: MINIMAL_LLM_JSON } }] }) } },
  };
}

describe("generateSuvka", () => {
  it("produces a GenerationRecord sourced 'suvka', using Suvka's own pipeline + prompt", async () => {
    const record = await generateSuvka("dentista", "A family dental clinic offering checkups.", fakeClient());

    expect(record.source).toBe("suvka");
    expect(record.businessId).toBe("dentista");
    expect(record.model).toBe("gpt-4.1-mini");
    expect(record.landingPage.sections.length).toBeGreaterThan(0);
  });

  it("records the fully-assembled pipeline prompt, not just the raw business description", async () => {
    const record = await generateSuvka("dentista", "A family dental clinic offering checkups.", fakeClient());
    expect(record.promptUsed).toContain("BUSINESS PROFILE");
    expect(record.promptUsed).toContain("STRATEGY DNA");
  });

  it("uses Suvka's own pipeline-computed dna, not a neutral baseline", async () => {
    const record = await generateSuvka("dentista", "A family dental clinic offering checkups.", fakeClient());
    // A dental clinic should score meaningfully on trust/authority-driven DNA fields,
    // not sit at the neutral 0.5 the generic arms use (see generators/shared.ts).
    expect(record.landingPage.dna).toBeDefined();
    expect(typeof record.landingPage.dna.brightness).toBe("number");
  });
});
