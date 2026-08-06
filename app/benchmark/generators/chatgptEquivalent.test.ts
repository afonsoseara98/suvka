import { describe, it, expect } from "vitest";
import { generateChatGptEquivalent } from "./chatgptEquivalent";
import type { ChatCompletionClient } from "@/app/ai/generateLandingPage";

const MINIMAL_LLM_JSON = JSON.stringify({
  sections: [{ type: "hero", variant: "centered" }],
  hero: { badge: "B", title: "T", highlightWord: "T", subtitle: "S", primaryCTA: "Go", secondaryCTA: "Learn", imageStyle: "dashboard", stats: [] },
  footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
});

function fakeClient(content: string | null = MINIMAL_LLM_JSON): ChatCompletionClient {
  return { chat: { completions: { create: async () => ({ choices: [{ message: { content } }] }) } } };
}

describe("generateChatGptEquivalent", () => {
  it("produces a GenerationRecord sourced 'chatgpt', using the shared generic prompt only", async () => {
    const record = await generateChatGptEquivalent("dentista", "A family dental clinic.", fakeClient());

    expect(record.source).toBe("chatgpt");
    expect(record.businessId).toBe("dentista");
    expect(record.model).toBe("gpt-4.1-mini");
  });

  it("never sends Noctra-specific pipeline data - no BUSINESS INTELLIGENCE/STRATEGY DNA sections", async () => {
    const record = await generateChatGptEquivalent("dentista", "A family dental clinic.", fakeClient());
    expect(record.promptUsed).not.toContain("BUSINESS INTELLIGENCE");
    expect(record.promptUsed).not.toContain("STRATEGY DNA");
    expect(record.promptUsed).toContain("A family dental clinic.");
  });

  it("normalizes the model's raw sections (prominence/rhythm filled, its own type/variant kept)", async () => {
    const record = await generateChatGptEquivalent("dentista", "A family dental clinic.", fakeClient());
    expect(record.landingPage.sections).toEqual([
      { type: "hero", variant: "centered", prominence: "standard", rhythm: "standard" },
    ]);
  });

  it("throws when the model returns empty content", async () => {
    await expect(generateChatGptEquivalent("dentista", "A family dental clinic.", fakeClient(null))).rejects.toThrow(
      "Empty response from model."
    );
  });
});
