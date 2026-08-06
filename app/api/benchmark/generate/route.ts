import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BENCHMARK_BUSINESSES } from "@/app/benchmark/businesses";
import { generateNoctra } from "@/app/benchmark/generators/noctra";
import { generateChatGptEquivalent } from "@/app/benchmark/generators/chatgptEquivalent";
import { generateClaudeEquivalent } from "@/app/benchmark/generators/claudeEquivalent";
import { generateGeminiEquivalent } from "@/app/benchmark/generators/geminiEquivalent";
import { benchmarkStore } from "@/app/benchmark/storeInstance";

// Triggers the one real generation this whole framework exists to evaluate: the same
// business brief through Noctra's own pipeline, a well-prompted ChatGPT-equivalent
// call, a well-prompted Claude-equivalent call, and (added in Benchmark Audit v1) a
// well-prompted Gemini-equivalent call (see Benchmark Framework plan §A3). This route
// is fully wired but was never invoked during development - every real LLM call in this
// project (this one included) requires the user's explicit authorization before the
// first real run.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openaiKey || !anthropicKey || !geminiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "OPENAI_API_KEY, ANTHROPIC_API_KEY and GEMINI_API_KEY must all be configured to run the benchmark.",
      },
      { status: 500 }
    );
  }

  const body = await request.json();
  const business = BENCHMARK_BUSINESSES.find((b) => b.id === body?.businessId);

  if (!business) {
    return NextResponse.json({ success: false, message: "Unknown business id." }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const gemini = new GoogleGenAI({ apiKey: geminiKey });

    const [noctra, chatgpt, claude, geminiResult] = await Promise.all([
      generateNoctra(business.id, business.prompt, openai),
      generateChatGptEquivalent(business.id, business.prompt, openai),
      generateClaudeEquivalent(business.id, business.prompt, anthropic),
      generateGeminiEquivalent(business.id, business.prompt, gemini),
    ]);

    await Promise.all([
      benchmarkStore.saveGeneration(noctra),
      benchmarkStore.saveGeneration(chatgpt),
      benchmarkStore.saveGeneration(claude),
      benchmarkStore.saveGeneration(geminiResult),
    ]);

    return NextResponse.json({ noctra, chatgpt, claude, gemini: geminiResult });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Something went wrong while running the benchmark for this business." },
      { status: 500 }
    );
  }
}
