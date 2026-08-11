import { buildPipeline } from "./builders/PipelineBuilder";
import { deriveVisualIntent } from "./builders/VisualIntelligence";
import { groundLandingPage, dropEmptySections } from "./builders/factualGrounding";
import { createImageProvider, resolveImageSafely, type ImageProvider } from "@/app/lib/images";
import type { LandingPage, SiteData } from "@/app/types/landing";
import type { BusinessProfile } from "./types";
import type { BusinessIntelligenceProfile } from "./types/businessIntelligence";
import type { CompositionSignals } from "./types/signals";

// Root-cause fix for a bug found live (not in a test): SCHEMA_PROMPT used to omit `site`
// entirely, so every real generation's JSON had no `site` field, and
// app/lib/projectService.ts's createProjectFromGeneration crashed reading
// `landing.site.branding` on every single save. schema.ts now asks for `site` (see its
// own regression test), which fixes this going forward - but the LLM's compliance with
// any schema field is never guaranteed (that's the whole reason dna/sections/imageStyle
// below are pipeline-overridden, not trusted from the raw response). This fallback is
// the same defense applied to the one field that isn't pipeline-computed: if a future
// response ever omits `site` again, generation degrades to an empty-but-valid site
// instead of taking down the save.
const EMPTY_SITE: SiteData = {
  seo: { title: "", description: "", keywords: [], ogTitle: "", ogDescription: "" },
  branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
  images: { heroPrompt: "", ogImagePrompt: "" },
};

// The one real OpenAI call this whole project makes - extracted out of
// app/api/generate/route.ts so app/benchmark/generators/suvka.ts can call the exact
// same code path a real user's generation goes through, instead of a second,
// independently-drifting copy of it. The LLM client is a narrow structural interface
// (not the concrete `OpenAI` class), so tests can pass a fake one - the real `OpenAI`
// client already satisfies this shape, nothing about route.ts's usage changes.
export interface ChatCompletionClient {
  chat: {
    completions: {
      create(params: {
        model: string;
        response_format: { type: "json_object" };
        messages: { role: "user"; content: string }[];
        max_completion_tokens: number;
      }): Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
}

// Benchmark Audit v1 finding: this call previously left the token budget unset (provider
// default) while the benchmark's Claude arm explicitly capped output at 4096 tokens - an
// unaudited asymmetry that could silently truncate one arm's JSON and not another's for
// reasons having nothing to do with generation quality. Every arm (this real call, and
// every benchmark generator) now requests the same explicit budget.
//
// Raised from 4096 to 8192 once real credentials surfaced a second asymmetry no amount
// of code review could have caught: Gemini 3.6 Flash (the model backing the benchmark's
// Gemini arm) spends part of its output budget on hidden "thinking" tokens before
// writing visible text - confirmed live at ~1300 thinking tokens for one landing page,
// and the model rejects `thinkingBudget: 0` (can't be disabled). At 4096 that overhead
// alone could exhaust the budget before any JSON was written, silently starving one arm
// for a reason having nothing to do with writing quality - the same category of bug as
// the original token-budget finding, just discovered by the live preflight rather than
// code review. 8192 was verified live to comfortably cover a real generation's thinking
// + JSON output with headroom; every arm gets the same doubled budget, preserving parity.
export const MAX_OUTPUT_TOKENS = 8192;

// businessIntelligence/signals are additive, not part of the LandingPage wire schema
// itself (app/types/landing.ts stays untouched) - same precedent as businessProfile,
// added this session so the client can build a Project (app/editor/project.ts) without
// a second round trip. Here for "Explain Why" (app/ai/builders/ExplainWhy.ts): both are
// already computed by buildPipeline() and were previously discarded once the prompt was
// built.
export interface GeneratedLandingPage extends LandingPage {
  businessProfile: BusinessProfile;
  businessIntelligence: BusinessIntelligenceProfile;
  signals: CompositionSignals;
  // The exact, fully-assembled prompt sent to the model - exposed so callers (the
  // Benchmark Framework's Suvka adapter in particular) can record "the prompt used,"
  // not just the raw business description that seeded it.
  finalPrompt: string;
}

export async function generateLandingPage(
  prompt: string,
  openai: ChatCompletionClient,
  // Injected, and defaulted to whatever the environment supports - which with no key
  // configured is NullImageProvider. Generation therefore never requires a third-party
  // image service to be reachable, and tests never touch one.
  images: ImageProvider = createImageProvider()
): Promise<GeneratedLandingPage> {
  // STEPS 1-4 (business profile, knowledge, design, prompt) live in buildPipeline()
  const pipeline = buildPipeline(prompt);

  // STEP 5
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: pipeline.finalPrompt }],
    max_completion_tokens: MAX_OUTPUT_TOKENS,
  });

  const content = response.choices[0].message.content;

  if (!content) {
    throw new Error("Empty response from model.");
  }

  const landingPage = JSON.parse(content) as Record<string, unknown>;

  if (!landingPage.site || typeof landingPage.site !== "object") {
    landingPage.site = EMPTY_SITE;
  }

  // Override, not merge: dna/imageStyle are replaced with the pipeline's own
  // deterministic values rather than left to whatever the LLM happened to pick.
  // landingPage.dna is now the full continuous StrategyDNA object - a direct
  // passthrough, not a lookup translating one vocabulary into another, since the
  // renderer compiles this object directly (see app/styles/theme.ts / layout.ts).
  landingPage.dna = pipeline.dna;

  if (landingPage.hero) {
    // What the hero SHOWS, decided from the business itself rather than from two abstract
    // DNA axes - see app/ai/builders/VisualIntelligence.ts for the measurement that made
    // this necessary (13 of 20 real businesses were being sent to a fake analytics
    // dashboard, including a wedding planner and a dentist).
    const visual = deriveVisualIntent(pipeline.businessProfile, pipeline.businessIntelligence, pipeline.dna);
    const image = await resolveImageSafely(images, visual);

    const hero = landingPage.hero as Record<string, unknown>;
    hero.visual = visual;
    hero.image = image;
    // Still overridden rather than trusted from the model's JSON. Only consulted when the
    // treatment is "software-scene", but kept populated so older renderers and stored
    // pages keep a valid value.
    hero.imageStyle = visual.scene;
  }

  landingPage.sections = pipeline.sections;

  // NOTHING THE PERSON DID NOT SAY.
  //
  // The schema used to instruct the model to "Generate exactly 3 hero stats", and with a
  // brief containing no numbers it complied: a dental clinic got "98% Success Rate on
  // Treatments", a law firm "95% Cases Resolved Successfully" and named reviews from
  // people who do not exist. Those are regulated professional claims and prohibited fake
  // reviews, published under a real business's name. See factualGrounding.ts.
  const grounded = groundLandingPage(landingPage as unknown as LandingPage, prompt);
  Object.assign(landingPage, dropEmptySections(grounded.landing) as unknown as Record<string, unknown>);
  landingPage.groundingReport = grounded.report;
  landingPage.businessProfile = pipeline.businessProfile;
  landingPage.businessIntelligence = pipeline.businessIntelligence;
  landingPage.signals = pipeline.signals;
  landingPage.finalPrompt = pipeline.finalPrompt;

  return landingPage as unknown as GeneratedLandingPage;
}
