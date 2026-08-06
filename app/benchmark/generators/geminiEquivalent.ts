import { MAX_OUTPUT_TOKENS } from "@/app/ai/generateLandingPage";
import { buildGenericPrompt } from "../genericPrompt";
import { normalizeGenericOutput } from "./shared";
import type { GenerationRecord } from "../types";

// Narrow structural interface (not the concrete @google/genai `GoogleGenAI` class) -
// same reasoning as ChatCompletionClient/AnthropicMessageClient: tests pass a fake
// client, the real `GoogleGenAI` instance's `.models.generateContent` already satisfies
// this shape unchanged (its response is a class with a `.text` getter, which structurally
// matches `{ text?: string }`).
export interface GeminiMessageClient {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config: { maxOutputTokens: number; responseMimeType: string };
    }): Promise<{ text?: string }>;
  };
}

// Comparably-tiered to gpt-4.1-mini/claude-haiku-4-5 - Google's "flash" line is the
// closest equivalent to the other two arms' small/fast tier (see Benchmark plan's
// "Model choice" note; same reasoning applied to the 4th arm added in Benchmark Audit
// v1: match tiers across every arm so the benchmark isolates the pipeline's
// contribution, not which provider's flagship happens to be strongest this month).
//
// gemini-2.5-flash (the original choice) turned out to be retired for new API keys as
// of the live preflight check - confirmed via a real models.list() call against this
// project's key, not guessed. gemini-3.6-flash is the current stable (non-preview)
// flash-tier model as of that same check.
const MODEL = "gemini-3.6-flash";

export async function generateGeminiEquivalent(
  businessId: string,
  businessDescription: string,
  gemini: GeminiMessageClient
): Promise<GenerationRecord> {
  const prompt = buildGenericPrompt(businessDescription);

  const response = await gemini.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { maxOutputTokens: MAX_OUTPUT_TOKENS, responseMimeType: "application/json" },
  });

  if (!response.text) {
    throw new Error("Empty response from model.");
  }

  // responseMimeType: "application/json" is a real JSON-mode (like OpenAI's
  // response_format), but stripping a stray markdown fence defensively costs nothing and
  // matches the same defense-in-depth already applied to the Claude arm, which has no
  // JSON-mode of its own to rely on.
  const trimmed = response.text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenceMatch ? fenceMatch[1] : trimmed;

  const landingPage = normalizeGenericOutput(JSON.parse(jsonText) as Record<string, unknown>);

  return {
    businessId,
    source: "gemini",
    promptUsed: prompt,
    model: MODEL,
    landingPage,
    createdAt: new Date().toISOString(),
  };
}
