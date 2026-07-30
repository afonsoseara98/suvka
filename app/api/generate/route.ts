import OpenAI from "openai";
import { NextResponse } from "next/server";

import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    // STEPS 1-4 (business profile, knowledge, design, prompt) live in buildPipeline()
    const pipeline = buildPipeline(prompt);

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

    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}