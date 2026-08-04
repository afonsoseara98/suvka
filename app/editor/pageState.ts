import type {
  LandingPage,
  Section,
  SectionType,
  SectionProminence,
  SectionRhythm,
  HeroData,
  StatsItem,
  FeatureItem,
  Testimonial,
  PricingPlan,
  FAQItem,
  FooterData,
  SiteData,
} from "@/app/types/landing";
import type { StrategyDNA } from "@/app/ai/types/dna";
import { clamp01 } from "@/app/ai/utils/math";

// PAGE STATE
//
// The canonical, editable model of one landing page. LandingPage (app/types/landing.ts)
// stays exactly as it is - it's the LLM-facing wire schema (what /api/generate returns)
// and app/ai/* (the whole generation pipeline) never needs to know PageState exists.
// PageState is a richer model built ON TOP of that output via fromLandingPage(), for
// everything that comes after generation: editing, undo/redo, AI-driven changes,
// eventually collaboration.
//
// The one decision everything else here follows from: content lives PER SECTION
// INSTANCE, not per type. LandingPage assumes at most one section of each type
// (landing.stats, landing.features, ... - one array per type, "toggle a type on/off in
// a fixed slot"). A real editor needs to insert, duplicate and freely reorder sections,
// including two of the same type with different content (two `testimonials` blocks
// making different points) - which a type-keyed model can never express. SectionInstance
// is fully self-contained (id, type, variant, own content, own layout, own theme
// override, visibility, lock state, authorship, version) so every operation in
// operations.ts only ever needs a `sectionId` to know exactly what it's touching.

export type SectionContent =
  | HeroData
  | StatsItem[]
  | FeatureItem[] // features and benefits share this shape today
  | Testimonial[]
  | PricingPlan[]
  | FAQItem[]
  | FooterData
  | null; // "cta" and "logoCloud" have no content of their own today (see SectionRenderer.tsx)

export type CreatedBy = "ai" | "user" | "template";

export interface SectionMetadata {
  createdBy: CreatedBy;
  createdAt: number;
  updatedAt: number;
  label?: string;
}

export interface SectionLayout {
  prominence: SectionProminence;
  rhythm: SectionRhythm;
}

// Concrete, fully-typed fields rather than an open/generic metadata bag - matching this
// codebase's own convention (StrategyDNA, BusinessIntelligenceProfile: both concrete
// interfaces that have grown fields over time as ordinary, low-risk TS changes, most
// recently BusinessIntelligence.ts's INDUSTRY_PRIOR gaining 5 new industries). Extending
// this foundation later means adding a field to an interface, not redesigning one.
export interface SectionInstance {
  id: string;
  type: SectionType;
  variant: string;
  content: SectionContent;
  layout: SectionLayout;
  // Layered on top of PageState.dna at render time (see mergeDna) - {} means "inherit
  // the page theme exactly." Lets one section (e.g. a CTA banner) diverge visually
  // without a full page-level ChangeTheme.
  themeOverrides: Partial<StrategyDNA>;
  // A string union (not a raw boolean), matching SectionProminence/SectionRhythm/
  // HeroVariant's existing convention in this codebase.
  visibility: "visible" | "hidden";
  locked: boolean;
  metadata: SectionMetadata;
  // Bumped by applyOperation every time a mutating operation is successfully applied to
  // THIS instance specifically - a cheap per-section "has this changed" check,
  // independent of replaying the whole PageHistory log.
  version: number;
}

export interface PageState {
  id: string;
  dna: StrategyDNA;
  site: SiteData;
  sections: readonly SectionInstance[];
}

// Content-by-type extraction from a LandingPage - the inverse of what SectionRenderer
// used to look up directly (landing.stats, landing.features, ...). Centralized here so
// fromLandingPage/toLandingPage are the only two places that know this mapping exists.
function contentFor(landing: LandingPage, type: SectionType): SectionContent {
  switch (type) {
    case "hero":
      return landing.hero;
    case "stats":
      return landing.stats;
    case "features":
      return landing.features;
    case "benefits":
      return landing.benefits;
    case "testimonials":
      return landing.testimonials;
    case "pricing":
      return landing.pricing;
    case "faq":
      return landing.faq;
    case "footer":
      return landing.footer;
    case "logoCloud":
    case "cta":
      return null;
  }
}

export function fromLandingPage(landing: LandingPage, now: number = Date.now()): PageState {
  const sections: SectionInstance[] = landing.sections.map((section, index) => ({
    id: `${section.type}-${index}`,
    type: section.type,
    variant: section.variant,
    content: contentFor(landing, section.type),
    layout: { prominence: section.prominence, rhythm: section.rhythm },
    themeOverrides: {},
    visibility: "visible",
    locked: false,
    metadata: { createdBy: "template", createdAt: now, updatedAt: now },
    version: 0,
  }));

  return {
    id: `page-${now}`,
    dna: landing.dna,
    site: landing.site,
    sections,
  };
}

// Inverse of fromLandingPage - for anything still expecting the old flat shape (tests,
// potential future prompt-building reuse). Never used by the renderer, which consumes
// PageState directly. Lossy by construction where it has to be: if a type now has more
// than one instance (only possible via operations.ts, never via fromLandingPage), the
// LAST instance of that type wins for the flat field, and hidden sections are included
// (toLandingPage doesn't know about "visible" - that's a render-time concern).
export function toLandingPage(state: PageState): LandingPage {
  const byType = new Map<SectionType, SectionInstance>();
  for (const instance of state.sections) {
    byType.set(instance.type, instance);
  }

  const heroContent = (byType.get("hero")?.content as HeroData | undefined) ?? EMPTY_HERO;

  return {
    dna: state.dna,
    site: state.site,
    sections: state.sections.map(
      (instance): Section => ({
        type: instance.type,
        variant: instance.variant,
        prominence: instance.layout.prominence,
        rhythm: instance.layout.rhythm,
      })
    ),
    hero: heroContent,
    stats: (byType.get("stats")?.content as StatsItem[] | undefined) ?? [],
    features: (byType.get("features")?.content as FeatureItem[] | undefined) ?? [],
    benefits: (byType.get("benefits")?.content as FeatureItem[] | undefined) ?? [],
    testimonials: (byType.get("testimonials")?.content as Testimonial[] | undefined) ?? [],
    pricing: (byType.get("pricing")?.content as PricingPlan[] | undefined) ?? [],
    faq: (byType.get("faq")?.content as FAQItem[] | undefined) ?? [],
    footer: (byType.get("footer")?.content as FooterData | undefined) ?? EMPTY_FOOTER,
  };
}

// Exported for the one other caller that needs a safe fallback: SectionRenderer.tsx's
// "cta" case looks up the page's hero instance by type (a plain array find, since it's
// the one documented case where a section reads a sibling's content) and needs a
// well-typed empty value for the - in a well-formed PageState, never actually reached -
// case where no hero instance exists.
export const EMPTY_HERO: HeroData = {
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

// Shallow-merges a partial DNA override on top of a base DNA, clamping every numeric
// field to [0, 1] - reused by both ChangeTheme (page-level) and per-section
// themeOverrides (SectionRenderer.tsx) so a section's effective theme and a full page
// re-theme go through identical, tested merge semantics. sectionWeight is the one
// non-numeric field (a Record<GatedRole, number>); an override replaces it wholesale
// rather than merging per-role, which is the simplest correct rule for a field no
// caller overrides today.
export function mergeDna(base: StrategyDNA, overrides: Partial<StrategyDNA>): StrategyDNA {
  const merged: StrategyDNA = { ...base, ...overrides };

  for (const key of Object.keys(merged) as (keyof StrategyDNA)[]) {
    if (key === "sectionWeight") continue;
    const value = merged[key];
    if (typeof value === "number") {
      (merged[key] as number) = clamp01(value);
    }
  }

  return merged;
}
