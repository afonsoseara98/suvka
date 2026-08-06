import { MAX_OUTPUT_TOKENS } from "@/app/ai/generateLandingPage";
import { buildGenericPrompt } from "../genericPrompt";
import { normalizeGenericOutput } from "./shared";
import type { GenerationRecord } from "../types";

// Narrow structural interface (not the concrete Anthropic SDK class) - same reasoning
// as ChatCompletionClient in app/ai/generateLandingPage.ts: tests pass a fake client,
// the real Anthropic client satisfies this shape unchanged.
export interface AnthropicMessageClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: { role: "user"; content: string }[];
    }): Promise<{ content: { type: string; text?: string }[] }>;
  };
}

// The closest Anthropic tier to gpt-4.1-mini - confirmed with the user (see Benchmark
// plan's "Model choice" note): comparably-tiered models across every arm, so the
// benchmark measures the pipeline's contribution, not which provider's flagship model
// happens to be strongest this month.
const MODEL = "claude-haiku-4-5-20251001";

// Anthropic has no strict JSON-mode equivalent to OpenAI's response_format - the prompt
// itself (genericPrompt.ts, reusing SCHEMA_PROMPT's "Return ONLY valid JSON... Never use
// markdown... Never use code blocks" rules) is the only guarantee. This strips a
// markdown code fence defensively in case the model wraps its output in one anyway.
function extractJsonText(content: { type: string; text?: string }[]): string {
  const textBlock = content.find((block) => block.type === "text" && typeof block.text === "string");

  if (!textBlock?.text) {
    throw new Error("Empty response from model.");
  }

  const trimmed = textBlock.text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

export async function generateClaudeEquivalent(
  businessId: string,
  businessDescription: string,
  anthropic: AnthropicMessageClient
): Promise<GenerationRecord> {
  const prompt = buildGenericPrompt(businessDescription);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const jsonText = extractJsonText(response.content);
  const landingPage = normalizeGenericOutput(JSON.parse(jsonText) as Record<string, unknown>);

  return {
    businessId,
    source: "claude",
    promptUsed: prompt,
    model: MODEL,
    landingPage,
    createdAt: new Date().toISOString(),
  };
}
