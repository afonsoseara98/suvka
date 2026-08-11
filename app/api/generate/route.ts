import OpenAI from "openai";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { generateLandingPage } from "@/app/ai/generateLandingPage";
import { validatePrompt } from "@/app/lib/validatePrompt";
import { getGenerateRateLimiter } from "@/app/lib/rateLimit";

// This is the most expensive endpoint in the product: one real LLM call, ~3k tokens of
// prompt, up to 8k of output, every time. It used to be fully anonymous - the only
// protection was a per-IP rate limiter that (a) falls back to in-memory when Upstash
// isn't configured, so it counts nothing across serverless instances, and (b) is
// trivially bypassed by rotating IPs. Anyone with a script could bill the project's
// OpenAI account indefinitely. Sign-in is now required BEFORE any spend, and the rate
// limit key is the user id rather than a spoofable header, so the limit follows the
// account instead of the network path.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Sign in required." }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured.");

      return NextResponse.json(
        { success: false, message: "Server is not configured to generate pages right now." },
        { status: 500 }
      );
    }

    const rateLimiter = getGenerateRateLimiter();
    const { allowed, retryAfterSeconds } = await rateLimiter.check(session.user.id);

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

    const openai = new OpenAI({ apiKey });
    const generated = await generateLandingPage(validation.value, openai);

    // finalPrompt is server-side only (exposed to code that imports generateLandingPage
    // directly, e.g. the benchmark's Suvka adapter) - never shipped to the browser.
    // It's prompt-engineering detail, not something a client needs to render the page
    // or explain its own decisions (see app/ai/builders/ExplainWhy.ts, which works from
    // businessIntelligence/signals instead).
    const { finalPrompt, ...landingPage } = generated;
    void finalPrompt;

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
