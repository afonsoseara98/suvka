import { describe, it, expect } from "vitest";
import { generateGeminiEquivalent, type GeminiMessageClient } from "./geminiEquivalent";

const MINIMAL_JSON = JSON.stringify({
  sections: [{ type: "hero", variant: "centered" }],
  hero: { badge: "B", title: "T", highlightWord: "T", subtitle: "S", primaryCTA: "Go", secondaryCTA: "Learn", imageStyle: "dashboard", stats: [] },
  footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
});

function fakeClient(text: string | null = MINIMAL_JSON): GeminiMessageClient {
  return { models: { generateContent: async () => ({ text: text === null ? undefined : text }) } };
}

describe("generateGeminiEquivalent", () => {
  it("produces a GenerationRecord sourced 'gemini', using the shared generic prompt only", async () => {
    const record = await generateGeminiEquivalent("dentista", "A family dental clinic.", fakeClient());

    expect(record.source).toBe("gemini");
    expect(record.businessId).toBe("dentista");
    expect(record.model).toBe("gemini-3.6-flash");
  });

  it("uses the exact same shared prompt text the other equivalent arms receive", async () => {
    const record = await generateGeminiEquivalent("dentista", "A family dental clinic.", fakeClient());
    expect(record.promptUsed).not.toContain("BUSINESS INTELLIGENCE");
    expect(record.promptUsed).toContain("A family dental clinic.");
  });

  it("strips a markdown code fence if the model wraps its JSON in one", async () => {
    const fenced = "```json\n" + MINIMAL_JSON + "\n```";
    const record = await generateGeminiEquivalent("dentista", "A family dental clinic.", fakeClient(fenced));
    expect(record.landingPage.hero.title).toBe("T");
  });

  it("normalizes sections the same way as the other equivalent arms", async () => {
    const record = await generateGeminiEquivalent("dentista", "A family dental clinic.", fakeClient());
    expect(record.landingPage.sections).toEqual([
      { type: "hero", variant: "centered", prominence: "standard", rhythm: "standard" },
    ]);
  });

  it("throws when the model returns no text content", async () => {
    await expect(generateGeminiEquivalent("dentista", "A family dental clinic.", fakeClient(null))).rejects.toThrow(
      "Empty response from model."
    );
  });
});
