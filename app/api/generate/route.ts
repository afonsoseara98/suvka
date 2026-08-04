import OpenAI from "openai";
import { NextResponse } from "next/server";

import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";
import { validatePrompt } from "@/app/lib/validatePrompt";
import { getGenerateRateLimiter } from "@/app/lib/rateLimit";

import type { HeroImageStyle } from "@/app/types/landing";

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

// hero.imageStyle is the one place a real generative asset concept (which illustration
// to render inside the hero scene) has to stay a discrete choice - "0.6 of a dashboard
// illustration" isn't a renderable thing. Still fully DNA-derived (heroImageryProminence/
// complexity), never left to the LLM's own guess, which is why this still overrides
// whatever the model put in its JSON rather than trusting it.
function imageStyleFor(heroImageryProminence: number, complexity: number): HeroImageStyle {
  if (heroImageryProminence >= 0.65) return complexity >= 0.55 ? "product" : "abstract";
  if (complexity >= 0.6) return "analytics";
  if (complexity >= 0.4) return "dashboard";
  return "website";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured.");

      return NextResponse.json(
        { success: false, message: "Server is not configured to generate pages right now." },
        { status: 500 }
      );
    }

    const rateLimiter = getGenerateRateLimiter();
    const clientKey = getClientKey(request);
    const { allowed, retryAfterSeconds } = await rateLimiter.check(clientKey);

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const validation = validatePrompt(body?.prompt);

    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
    }

    const prompt = validation.value;

    // STEPS 1-4 (business profile, knowledge, design, prompt) live in buildPipeline()
    const pipeline = buildPipeline(prompt);

    const openai = new OpenAI({ apiKey });

    // STEP 5
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "user",
          content: pipeline.finalPrompt,
        },
      ],
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("Empty response from model.");
    }

    const landingPage = JSON.parse(content);

    // Override, not merge: dna/imageStyle are replaced with the pipeline's own
    // deterministic values rather than left to whatever the LLM happened to pick.
    // landingPage.dna is now the full continuous StrategyDNA object - a direct
    // passthrough, not a lookup translating one vocabulary into another, since the
    // renderer compiles this object directly (see app/styles/theme.ts / layout.ts).
    landingPage.dna = pipeline.dna;

    if (landingPage.hero) {
      landingPage.hero.imageStyle = imageStyleFor(pipeline.dna.heroImageryProminence, pipeline.dna.complexity);
    }

    landingPage.sections = pipeline.sections;

    return NextResponse.json(landingPage);

  } catch (error: unknown) {

    // Logged in full server-side; the client only ever gets a generic message so
    // internal details (stack traces, upstream API error bodies) never leak in the
    // response.
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while generating the page. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}