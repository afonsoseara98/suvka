import { MAX_OUTPUT_TOKENS, type ChatCompletionClient } from "@/app/ai/generateLandingPage";
import { buildGenericPrompt } from "../genericPrompt";
import { normalizeGenericOutput } from "./shared";
import type { GenerationRecord } from "../types";

// Same model tier as Suvka's own call (gpt-4.1-mini) - confirmed with the user
// specifically so this benchmark isolates the pipeline's contribution, not which
// provider currently has the strongest flagship model (see Benchmark plan's "Model
// choice" note).
const MODEL = "gpt-4.1-mini";

export async function generateChatGptEquivalent(
  businessId: string,
  businessDescription: string,
  openai: ChatCompletionClient
): Promise<GenerationRecord> {
  const prompt = buildGenericPrompt(businessDescription);

  const response = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: MAX_OUTPUT_TOKENS,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Empty response from model.");
  }

  const landingPage = normalizeGenericOutput(JSON.parse(content) as Record<string, unknown>);

  return {
    businessId,
    source: "chatgpt",
    promptUsed: prompt,
    model: MODEL,
    landingPage,
    createdAt: new Date().toISOString(),
  };
}
