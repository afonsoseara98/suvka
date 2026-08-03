import OpenAI from "openai";
import { NextResponse } from "next/server";

import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";
import { validatePrompt } from "@/app/lib/validatePrompt";
import { getGenerateRateLimiter } from "@/app/lib/rateLimit";

import type { DesignStyle, HeroVariant } from "@/app/types/design";
import type { Theme, HeroImageStyle } from "@/app/types/landing";

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

// DesignSystem.style/heroVariant are already computed by DesignPlanner.ts for every
// request but were previously discarded before the response was sent - the LLM chose
// `theme`/`hero.imageStyle` on its own instead, which is why every Stage 5 baseline
// business came back with the same "startup" theme regardless of industry. These two
// tables translate DesignSystem's vocabulary into the response schema's vocabulary
// (the two type files predate this wiring and never used the same literal unions).
// Pure lookup, no inference: given the same DesignSystem, the output is always the same.
const STYLE_TO_THEME: Record<DesignStyle, Theme> = {
  saas: "startup",
  agency: "agency",
  luxury: "luxury",
  corporate: "agency", // DesignPlanner.ts never produces this today; closest available Theme
  medical: "medical",
  restaurant: "restaurant",
  fitness: "fitness",
};

const HERO_VARIANT_TO_IMAGE_STYLE: Record<HeroVariant, HeroImageStyle> = {
  dashboard: "dashboard",
  image: "website",
  product: "product",
  phone: "phone", // DesignPlanner.ts never produces this today
  minimal: "abstract", // produced by DesignPlanner.ts for real_estate (style: "luxury")
};

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

    // Override, not merge: theme/imageStyle are replaced with the pipeline's own
    // deterministic values rather than left to whatever the LLM happened to pick.
    landingPage.theme = STYLE_TO_THEME[pipeline.design.style];

    if (landingPage.hero) {
      landingPage.hero.imageStyle = HERO_VARIANT_TO_IMAGE_STYLE[pipeline.design.heroVariant];
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