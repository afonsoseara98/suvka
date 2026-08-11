import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { LandingPage, Section, SectionType, SiteData, HeroData, FooterData } from "@/app/types/landing";

const EMPTY_SITE: SiteData = {
  seo: { title: "", description: "", keywords: [], ogTitle: "", ogDescription: "" },
  branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
  images: { heroPrompt: "", ogImagePrompt: "" },
};

const EMPTY_HERO: HeroData = {
  badge: "",
  title: "",
  highlightWord: "",
  subtitle: "",
  primaryCTA: "",
  secondaryCTA: "",
  imageStyle: "abstract",
  imagePrompt: "",
  stats: [],
};

const EMPTY_FOOTER: FooterData = { company: "", email: "", copyright: "" };

// Both the ChatGPT-equivalent and Claude-equivalent arms are asked for the same JSON
// schema Suvka's own SCHEMA_PROMPT uses (see genericPrompt.ts) - but neither has a
// StrategyDNA/LayoutIntelligence pipeline behind it, so their raw output needs
// normalizing before it can render through the exact same Landing/SectionRenderer
// components Suvka's own output does:
//   - dna: neutralStrategyDna() (app/ai/testFixtures.ts) - a fixed, neutral theme
//     baseline for every non-Suvka arm, so the comparison measures what each arm
//     actually wrote (copy, structure, section choices), not "did it have a design DNA
//     system," which only Suvka has by construction.
//   - prominence/rhythm: always "standard" - concepts neither arm has any way to
//     reason about (Suvka's own SCHEMA_PROMPT doesn't ask the LLM for these either;
//     they're always pipeline-computed and applied after generation - see
//     app/ai/generateLandingPage.ts).
export function normalizeGenericOutput(raw: Record<string, unknown>): LandingPage {
  const rawSections = Array.isArray(raw.sections) ? (raw.sections as Record<string, unknown>[]) : [];

  const sections: Section[] = rawSections
    .filter((s) => typeof s.type === "string")
    .map((s) => ({
      type: s.type as SectionType,
      variant: typeof s.variant === "string" ? s.variant : "default",
      prominence: "standard",
      rhythm: "standard",
    }));

  return {
    dna: neutralStrategyDna(),
    site: (raw.site as SiteData | undefined) ?? EMPTY_SITE,
    sections,
    hero: (raw.hero as HeroData | undefined) ?? EMPTY_HERO,
    stats: (raw.stats as LandingPage["stats"] | undefined) ?? [],
    features: (raw.features as LandingPage["features"] | undefined) ?? [],
    benefits: (raw.benefits as LandingPage["benefits"] | undefined) ?? [],
    testimonials: (raw.testimonials as LandingPage["testimonials"] | undefined) ?? [],
    pricing: (raw.pricing as LandingPage["pricing"] | undefined) ?? [],
    faq: (raw.faq as LandingPage["faq"] | undefined) ?? [],
    footer: (raw.footer as FooterData | undefined) ?? EMPTY_FOOTER,
  };
}
