import { describe, it, expect } from "vitest";
import { generateLandingPage, type ChatCompletionClient } from "./generateLandingPage";

function fakeClient(content: string | null): ChatCompletionClient {
  return {
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { content } }] }),
      },
    },
  };
}

const MINIMAL_LLM_JSON = JSON.stringify({
  site: {
    seo: { title: "T", description: "D", keywords: [], ogTitle: "", ogDescription: "" },
    branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
    images: { heroPrompt: "", ogImagePrompt: "" },
  },
  hero: {
    badge: "B",
    title: "T",
    highlightWord: "T",
    subtitle: "S",
    primaryCTA: "Go",
    secondaryCTA: "Learn",
    imageStyle: "dashboard",
    stats: [],
  },
  stats: [],
  features: [],
  benefits: [],
  testimonials: [],
  pricing: [],
  faq: [],
  footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
});

describe("generateLandingPage", () => {
  it("calls the pipeline's finalPrompt through the given client and merges pipeline overrides", async () => {
    const result = await generateLandingPage("A dentist offering checkups", fakeClient(MINIMAL_LLM_JSON));

    expect(result.hero.title).toBe("T");
    expect(result.dna).toBeDefined();
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.hero.imageStyle).toBeDefined();
  });

  it("attaches businessProfile, businessIntelligence and signals to the result", async () => {
    const result = await generateLandingPage("A dentist offering checkups", fakeClient(MINIMAL_LLM_JSON));

    expect(result.businessProfile.industry).toBe("medical");
    expect(result.businessIntelligence).toBeDefined();
    expect(result.signals).toBeDefined();
  });

  // Regression test for a bug found live (not caught by any test before this): a real
  // model response missing `site` used to reach app/lib/projectService.ts's
  // createProjectFromGeneration, which crashed reading `landing.site.branding` on every
  // single save. SCHEMA_PROMPT now asks for `site` (see schema.test.ts), but the LLM's
  // compliance is never guaranteed - this is the defense-in-depth half of the fix.
  it("falls back to an empty (not undefined) site when the model's response omits it", async () => {
    const withoutSite = JSON.stringify({
      hero: {
        badge: "B",
        title: "T",
        highlightWord: "T",
        subtitle: "S",
        primaryCTA: "Go",
        secondaryCTA: "Learn",
        imageStyle: "dashboard",
        stats: [],
      },
      stats: [],
      features: [],
      benefits: [],
      testimonials: [],
      pricing: [],
      faq: [],
      footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
    });

    const result = await generateLandingPage("A dentist offering checkups", fakeClient(withoutSite));

    expect(result.site).toBeDefined();
    expect(result.site.seo).toBeDefined();
    expect(result.site.branding).toBeDefined();
    expect(result.site.images).toBeDefined();
  });

  it("throws when the model returns empty content", async () => {
    await expect(generateLandingPage("A dentist offering checkups", fakeClient(null))).rejects.toThrow(
      "Empty response from model."
    );
  });

  it("sends the pipeline's own finalPrompt as the message content, not the raw user prompt", async () => {
    let sentContent = "";
    const client: ChatCompletionClient = {
      chat: {
        completions: {
          create: async (params) => {
            sentContent = params.messages[0].content;
            return { choices: [{ message: { content: MINIMAL_LLM_JSON } }] };
          },
        },
      },
    };

    await generateLandingPage("A dentist offering checkups", client);
    expect(sentContent).toContain("BUSINESS PROFILE");
    expect(sentContent).toContain("A dentist offering checkups");
  });
});
