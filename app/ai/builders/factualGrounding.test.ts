import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { groundLandingPage, dropEmptySections } from "./factualGrounding";
import { BENCHMARK_BUSINESSES } from "@/app/benchmark/businesses";
import type { LandingPage } from "@/app/types/landing";

function page(overrides: Partial<LandingPage> = {}): LandingPage {
  return {
    dna: {},
    sections: [],
    site: { seo: {}, branding: {}, images: {} },
    hero: { badge: "", title: "", highlightWord: "", subtitle: "", primaryCTA: "", secondaryCTA: "", imageStyle: "website", imagePrompt: "", stats: [] },
    stats: [],
    features: [],
    benefits: [],
    testimonials: [],
    pricing: [],
    faq: [],
    footer: { company: "", email: "", copyright: "" },
    ...overrides,
  } as unknown as LandingPage;
}

describe("factual grounding", () => {
  it("removes a statistic the person never gave us", () => {
    const { landing, report } = groundLandingPage(
      page({ stats: [{ value: "98%", label: "Success Rate on Treatments" }] } as Partial<LandingPage>),
      "A family dental clinic offering check-ups and cosmetic dentistry."
    );

    expect(landing.stats).toEqual([]);
    expect(report.statsRemoved).toBe(1);
  });

  it("keeps a number the person actually stated", () => {
    // The point is not to strip every figure - it is to strip every UNVERIFIED figure. A
    // business that says it has been open since 1974 may say so on its own website.
    const { landing } = groundLandingPage(
      page({ stats: [{ value: "1974", label: "Baking since" }] } as Partial<LandingPage>),
      "A family-run bakery in Porto, open every morning since 1974."
    );

    expect(landing.stats).toHaveLength(1);
  });

  it("removes a slogan dressed as a metric", () => {
    const { landing } = groundLandingPage(
      page({ stats: [{ value: "Award", label: "Winning service" }] } as Partial<LandingPage>),
      "A neighbourhood barbershop."
    );
    expect(landing.stats).toEqual([]);
  });

  it("removes every invented testimonial", () => {
    // Named reviews from people who do not exist are prohibited outright in the EU under
    // the Omnibus Directive - this is not a quality judgement.
    const { landing, report } = groundLandingPage(
      page({ testimonials: [{ name: "Rebecca L.", company: "Mother of 3", text: "Life-changing!" }] } as Partial<LandingPage>),
      "A family dental clinic."
    );

    expect(landing.testimonials).toEqual([]);
    expect(report.testimonialsRemoved).toBe(1);
  });

  it("removes invented FAQ entries", () => {
    const { landing } = groundLandingPage(
      page({ faq: [{ question: "What is your cancellation policy?", answer: "24 hours." }] } as Partial<LandingPage>),
      "A yoga studio."
    );
    expect(landing.faq).toEqual([]);
  });

  it("drops a section once nothing truthful is left in it", () => {
    const grounded = dropEmptySections(
      page({
        stats: [],
        testimonials: [],
        features: [{ title: "Real", description: "d", icon: "*" }],
        sections: [
          { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
          { type: "stats", variant: "cards", prominence: "standard", rhythm: "standard" },
          { type: "testimonials", variant: "cards", prominence: "standard", rhythm: "standard" },
          { type: "features", variant: "grid", prominence: "primary", rhythm: "standard" },
          { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
        ],
      } as unknown as Partial<LandingPage>)
    );

    expect(grounded.sections.map((s) => s.type)).toEqual(["hero", "features", "footer"]);
  });
});

// THE REGRESSION THIS EXISTS FOR
//
// Replays the stored output of real generations - the ones that produced "98% Success Rate
// on Treatments" for a dental clinic and "95% Cases Resolved Successfully" for a law firm -
// through the grounding filter, and asserts none of it survives.
describe("real generations that shipped unverifiable claims", () => {
  const dir = path.join(process.cwd(), "benchmark-results");
  const available = fs.existsSync(dir);

  it.runIf(available)("strips every ungrounded claim from every stored generation", () => {
    let inspected = 0;
    let survivingClaims = 0;

    for (const business of BENCHMARK_BUSINESSES) {
      const file = path.join(dir, `${business.id}.json`);
      if (!fs.existsSync(file)) continue;

      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { generations?: { source: string; landingPage: LandingPage }[] };
      const record = parsed.generations?.find((g) => g.source === "suvka");
      if (!record) continue;

      inspected++;
      const { landing } = groundLandingPage(record.landingPage, business.prompt);

      survivingClaims += (landing.stats ?? []).length;
      survivingClaims += (landing.hero?.stats ?? []).length;
      survivingClaims += (landing.testimonials ?? []).length;
      survivingClaims += (landing.faq ?? []).length;
    }

    expect(inspected).toBeGreaterThan(10);
    // None of the 20 briefs contains a verifiable figure, so nothing may survive.
    expect(survivingClaims).toBe(0);
  });
});
