import { SCHEMA_PROMPT } from "@/app/ai/prompts/schema";

// The ONE prompt both the ChatGPT-equivalent and Claude-equivalent arms receive -
// deliberately the same text for both (see Benchmark plan §A3), a genuinely good
// prompt a savvy marketer would write, not a strawman. It reuses Noctra's own
// SCHEMA_PROMPT verbatim (the same one PromptBuilder.ts sends, post the Signal Trace
// Audit v1 stats field-name fix) so every arm's output can be parsed and rendered
// through the exact same Landing/SectionRenderer components - the benchmark measures
// what the PIPELINE contributes beyond one well-crafted prompt, not who happens to
// produce parseable JSON.
export function buildGenericPrompt(businessDescription: string): string {
  return [
    "You are an expert conversion copywriter and landing page designer.",
    "",
    "Write a complete, persuasive, high-converting landing page for the following business:",
    "",
    businessDescription,
    "",
    "Think carefully about who the target audience is, what their pain points and",
    "objections are, what would make them trust this specific business, and what would",
    "convince them to take action. Write premium, specific copy tailored to this exact",
    "business - never generic filler that could apply to any company.",
    "",
    SCHEMA_PROMPT,
  ].join("\n");
}
