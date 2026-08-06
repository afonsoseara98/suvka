import type { SectionRhythm } from "@/app/types/landing";
import type { StrategyDNA } from "@/app/ai/types/dna";
import { withDnaDefaults } from "@/app/ai/types/dna";
import { clamp01 } from "@/app/ai/utils/math";

// LAYOUT COMPILER
//
// Used to be `Record<Theme, LayoutPersonality>` - 6 hand-authored spacing/structure
// personalities, picked by a discrete Theme enum. Now computed continuously from
// StrategyDNA's density/contentWidth fields. cardRadius/cardPadding were removed
// entirely rather than kept as a parallel scale - they were always answering the exact
// same question ThemeConfig.radius/spacing (compiled in theme.ts from the same
// roundedness/density DNA) already answers, so components now read those directly
// instead of maintaining two overlapping continuous scales that could drift apart.
//
// Two genuinely structural choices remain, both still DNA-derived, neither an
// industry/archetype lookup:
// - `decorative`: WHICH decorative technique (glow vs grid-lines) - two different
//   rendering approaches that can't be blended into one continuous parameter without a
//   much deeper generative-graphics system. Chosen from colorTemperature (warm -> glow,
//   cool -> grid-lines); intensity is `decorationOpacity`, fully continuous.
// - `headerAlign` / `ctaLayout`: text-align and flex-direction are inherently binary
//   CSS properties, not interpolable - derived from contentWidth via threshold.
export type SectionAlignment = "left" | "center";
export type CTALayout = "row" | "stacked";
export type DecorativeStyle = "glow" | "grid-lines" | "none";

export interface LayoutPersonality {
  sectionWidthPx: number;
  sectionSpacingPx: number;
  heroPaddingPx: number;
  headerAlign: SectionAlignment;
  gridColumns: string;
  decorative: DecorativeStyle;
  decorationOpacity: number;
  ctaLayout: CTALayout;
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * clamp01(t);
}

export function compileLayout(input: StrategyDNA): LayoutPersonality {
  // Same normalization as compileTheme - see withDnaDefaults.
  const dna = withDnaDefaults(input);
  const width = clamp01(dna.contentWidth);
  const density = clamp01(dna.density);

  return {
    sectionWidthPx: Math.round(lerp(720, 1280, width)),
    sectionSpacingPx: Math.round(lerp(160, 80, density)),
    heroPaddingPx: Math.round(lerp(144, 80, density)),
    headerAlign: width <= 0.4 ? "left" : "center",
    // Grid column count is a genuinely discrete DOM fact (2 columns or 3, nothing in
    // between) - kept as a small Tailwind responsive fragment since viewport-based
    // breakpoints are a different concern from the business's own DNA and Tailwind's
    // responsive utilities are the right tool for that, not something the DNA should
    // encode. width<=0.4 (the narrow/editorial case) drops to a single column, matching
    // every card grid in this codebase holding exactly 3 items (a 2-column grid would
    // strand a lone third card).
    gridColumns: width <= 0.4 ? "" : density >= 0.55 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3",
    decorative: dna.decorationDensity <= 0.12 ? "none" : dna.colorTemperature >= 0.5 ? "glow" : "grid-lines",
    decorationOpacity: clamp01(dna.decorationDensity),
    ctaLayout: width <= 0.4 ? "stacked" : "row",
  };
}

const RHYTHM_SHIFT_PX: Record<SectionRhythm, number> = {
  dense: -32,
  standard: 0,
  breather: 32,
};

export function resolveSectionSpacing(basePx: number, rhythm: SectionRhythm): number {
  return Math.max(32, basePx + RHYTHM_SHIFT_PX[rhythm]);
}

// The DNA-derived px value is the DESKTOP figure. Emitting it raw meant a phone got the
// same 144px hero padding and 160px section gaps as a 27" monitor, which wastes most of
// a small screen before any content appears. clamp() keeps that figure as the ceiling
// and lets the spacing collapse proportionally on narrow viewports - CSS-only, so no
// component needs a breakpoint and the desktop rendering is byte-identical.
export function responsivePx(px: number): string {
  const min = Math.max(24, Math.round(px * 0.35));
  const preferred = (px / 1440) * 100;
  return `clamp(${min}px, ${preferred.toFixed(2)}vw, ${px}px)`;
}

export function responsiveSectionSpacing(basePx: number, rhythm: SectionRhythm): string {
  return responsivePx(resolveSectionSpacing(basePx, rhythm));
}
