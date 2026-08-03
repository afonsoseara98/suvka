import type { Theme, SectionRhythm } from "@/app/types/landing";

// Design System v2: a second, purely-rendering axis alongside ThemeConfig. ThemeConfig
// answers "what colors/gradients/typography" - this answers "how is space, structure and
// emphasis handled". Every field here is consumed by section components as Tailwind
// classes/flags, never by the pipeline - resolveArchetype/SectionPlanner/DesignPlanner/
// PromptBuilder/schema.ts are untouched. This exists because most archetypes currently
// share the same Section.variant (grid features, cards benefits) and, for 5 of 9
// archetypes, the same Theme too (DesignPlanner's "saas" default) - without a second
// differentiating axis, those pages would only ever differ by copy. Keyed by Theme
// (already reaching every component) rather than PageArchetype (never serialized onto
// LandingPage) so no new data has to flow through the pipeline.
export type SectionAlignment = "left" | "center";
export type CTALayout = "row" | "stacked";
export type DecorativeStyle = "glow" | "grid-lines" | "none";

export interface LayoutPersonality {
  sectionWidth: string;
  sectionSpacing: string;
  heroPadding: string;
  headerAlign: SectionAlignment;
  gridColumns: string;
  cardRadius: string;
  cardPadding: string;
  decorative: DecorativeStyle;
  ctaLayout: CTALayout;
}

export const layoutPersonalities: Record<Theme, LayoutPersonality> = {
  // Dense, centered, tech-marketing default - the template every other personality is
  // deliberately built to feel different from.
  startup: {
    sectionWidth: "max-w-7xl",
    sectionSpacing: "mt-28",
    heroPadding: "py-28",
    headerAlign: "center",
    gridColumns: "md:grid-cols-2 xl:grid-cols-3",
    cardRadius: "rounded-3xl",
    cardPadding: "p-8",
    decorative: "glow",
    ctaLayout: "row",
  },

  // Editorial and restrained: narrow column, the most vertical breathing room of any
  // personality, left-aligned headers (a marketing block centered on the page reads as
  // trying too hard; luxury copy reads like a magazine spread), no glow, a single CTA
  // is given more weight than a dashboard-style has this row layout.
  luxury: {
    // Every card grid in this codebase holds exactly 3 items (schema.ts fixes
    // features/benefits/testimonials/pricing at 3 each), so "md:grid-cols-2" would
    // strand a lone third card alone on its own row. A single column instead - full-
    // width, stacked cards - reads as a deliberate editorial layout, not a mistake,
    // and is the most different this grid can look from every other personality.
    sectionWidth: "max-w-4xl",
    sectionSpacing: "mt-40",
    heroPadding: "py-36",
    headerAlign: "left",
    gridColumns: "",
    cardRadius: "rounded-lg",
    cardPadding: "p-10",
    decorative: "none",
    ctaLayout: "stacked",
  },

  // Structured and confident: fixed 3-column grid (no responsive column growth - it
  // always looks deliberately composed, never like it just ran out of room), left-
  // aligned headers for a case-study feel, subtle grid-line texture instead of a blur.
  agency: {
    sectionWidth: "max-w-6xl",
    sectionSpacing: "mt-24",
    heroPadding: "py-24",
    headerAlign: "left",
    gridColumns: "md:grid-cols-3",
    cardRadius: "rounded-2xl",
    cardPadding: "p-8",
    decorative: "grid-lines",
    ctaLayout: "row",
  },

  // Clean and airy: no decoration at all, generous but not extreme spacing, narrower
  // column for readability - the calm, clinical opposite of fitness's intensity.
  medical: {
    sectionWidth: "max-w-5xl",
    sectionSpacing: "mt-32",
    heroPadding: "py-32",
    headerAlign: "center",
    gridColumns: "md:grid-cols-2 xl:grid-cols-3",
    cardRadius: "rounded-2xl",
    cardPadding: "p-8",
    decorative: "none",
    ctaLayout: "row",
  },

  // Warm and inviting: soft, rounded cards and a glow treatment (reused, not
  // reinvented) to keep the organic, welcoming feel.
  restaurant: {
    sectionWidth: "max-w-6xl",
    sectionSpacing: "mt-24",
    heroPadding: "py-24",
    headerAlign: "center",
    gridColumns: "md:grid-cols-2 xl:grid-cols-3",
    cardRadius: "rounded-3xl",
    cardPadding: "p-8",
    decorative: "glow",
    ctaLayout: "row",
  },

  // Bold and energetic: the tightest spacing and padding of any personality (intensity
  // over air), sharper/less-bubbly corners, a fixed 3-column grid for a dense, high-
  // energy wall of content.
  fitness: {
    sectionWidth: "max-w-7xl",
    sectionSpacing: "mt-20",
    heroPadding: "py-20",
    headerAlign: "center",
    gridColumns: "md:grid-cols-3",
    cardRadius: "rounded-xl",
    cardPadding: "p-6",
    decorative: "grid-lines",
    ctaLayout: "row",
  },
};

export function getLayoutPersonality(theme: Theme): LayoutPersonality {
  return layoutPersonalities[theme];
}

// Ordered so a theme's base sectionSpacing can be shifted up/down a couple of steps by
// LandingComposition's per-section `rhythm` - this is what turns "zonas densas / zonas
// vazias" into an actual rendered difference instead of a concept that only lives in
// the composition data. Every LayoutPersonality.sectionSpacing value above must be a
// member of this scale (guarded by LandingComposition.test.ts) - a dense/breather
// shift silently no-ops for any value that falls outside it.
const SPACING_SCALE = [
  "mt-8", "mt-12", "mt-16", "mt-20", "mt-24", "mt-28", "mt-32", "mt-36", "mt-40", "mt-44", "mt-48",
] as const;

const RHYTHM_SHIFT: Record<SectionRhythm, number> = {
  dense: -2,
  standard: 0,
  breather: 2,
};

export function resolveSectionSpacing(base: string, rhythm: SectionRhythm): string {
  const index = SPACING_SCALE.indexOf(base as (typeof SPACING_SCALE)[number]);

  if (index === -1) {
    return base;
  }

  const nextIndex = Math.min(SPACING_SCALE.length - 1, Math.max(0, index + RHYTHM_SHIFT[rhythm]));

  return SPACING_SCALE[nextIndex];
}
