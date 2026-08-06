import { generateLandingPage, type ChatCompletionClient } from "@/app/ai/generateLandingPage";
import type { GenerationRecord } from "../types";

const MODEL = "gpt-4.1-mini";

// Calls the exact same code path a real user's generation goes through
// (app/ai/generateLandingPage.ts, also used by app/api/generate/route.ts) - never a
// second, independently-drifting copy of Noctra's own pipeline+prompt+call.
export async function generateNoctra(
  businessId: string,
  prompt: string,
  openai: ChatCompletionClient
): Promise<GenerationRecord> {
  const generated = await generateLandingPage(prompt, openai);
  const { finalPrompt, businessProfile, businessIntelligence, signals, ...landingPage } = generated;
  void businessProfile;
  void businessIntelligence;
  void signals;

  return {
    businessId,
    source: "noctra",
    // The actual, fully-assembled prompt Noctra sent - not just the raw business
    // description, which is already recorded in app/benchmark/businesses.ts. This is
    // the real research value: what did the pipeline add on top of the same brief?
    promptUsed: finalPrompt,
    model: MODEL,
    landingPage,
    createdAt: new Date().toISOString(),
  };
}
