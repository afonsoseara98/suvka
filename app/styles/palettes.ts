import type { StrategyDNA } from "@/app/ai/types/dna";
import { clamp01 } from "@/app/ai/utils/math";

// PALETTE ANCHORS
//
// Replaces free interpolation across all of colour space. See
// docs/suvka-proposal-color-architecture.md for the measurement that forced this:
// compiling the previous model over the 20 benchmark businesses produced a magenta accent
// for 17 of 20, blue for 0 of 20, and a background in the muddy 20-80% lightness band for
// 20 of 20.
//
// The cause was not tuning. `colorTemperature` and `brightness` are blended scores, so
// they regress to the middle - 17 of 20 landed between 0.44 and 0.64 - and the middle of
// both scales was the worst place on it: hue 307 is magenta, lightness 48% is mud. Design
// space is not convex. The midpoint between a good dark theme and a good light theme is
// not a mediocre theme, it is an unusable one.
//
// So interpolation now happens INSIDE a region known to be good, never across the whole
// space. What is emphatically NOT happening here is a return to industry lookup: anchors
// are selected by distance in DNA space and never see an industry label, so two businesses
// in the same industry can land on different anchors and two in different industries can
// share one.
//
// ---------------------------------------------------------------------------------
// WHERE THE NUMBERS COME FROM
//
// Every anchor below is grounded in a documented production system rather than invented.
// The four patterns that recur across all of them, and that the previous model violated:
//
// 1. BACKGROUNDS SIT AT THE EXTREMES. #FFFFFF (Vercel), #FAFAFB (Linear), #F6F9FC
//    (Stripe), #F7F6F3 (Notion) - or #08090A (Linear dark), #000000 (Vercel dark).
//    Nothing anywhere near the middle. Vercel documents choosing pure white/black
//    deliberately, to read "consequential" rather than "playful".
// 2. TEXT IS A TINTED NEAR-BLACK, NEVER PURE. #0A2540 (Stripe, cool navy-black),
//    #37352F (Notion, warm brown-black, chosen as "softer than pure black for extended
//    reading"), #1D1D1F (Apple). The tint carries the brand; the darkness carries the
//    legibility.
// 3. EXACTLY ONE SATURATED ACCENT. Vercel's rule is literally "never more than one
//    accent-color on page"; Stripe's is "never more than three accent tokens in section".
// 4. THAT ACCENT IS USUALLY BLUE OR INDIGO. #635BFF (Stripe), #5E6AD2 (Linear), #0070F3
//    (Vercel), #2EAADC (Notion), #0071E3 (Apple). Warm accents exist (Raycast's #FF6363)
//    but are the deliberate minority. The previous model could not reach blue at all.
//
// Sources: opendesigner.io's extraction of the Stripe/Linear/Vercel systems,
// colorpalettegenerator.ai's Notion palette, and each brand's published values.
// ---------------------------------------------------------------------------------

export type PaletteMode = "light" | "dark";

export interface PaletteAnchor {
  id: string;

  // Human-readable provenance. Kept in the code, not a commit message, because the next
  // person to widen a range needs to know which system it came from.
  source: string;

  mode: PaletteMode;

  // Where this anchor sits in DNA space. Selection is nearest-neighbour over these, so an
  // anchor is reachable by any business whose DNA lands near it - never by industry.
  signature: {
    colorTemperature: number;
    brightness: number;
    emotionalIntensity: number;
    credibilityRationalLean: number;
  };

  // Hue of the NEUTRALS - background, surface, border and ink. This is what makes
  // #37352F a warm brown-black and #0A2540 a cool navy-black rather than both being grey.
  neutralHue: number;
  // Saturation range for neutrals. Tiny by design: at 96% lightness even 20% saturation
  // reads as a tint, and it was 10-16% saturation at 48% lightness that produced mud.
  neutralSat: readonly [number, number];

  // Accent ranges. The DNA modulates inside these; it cannot leave them.
  accentHue: readonly [number, number];
  accentSat: readonly [number, number];
  accentLight: readonly [number, number];

  // Lightness of the ink (primary text). Bounded well away from the background band, so
  // contrast is a property of the anchor rather than something patched afterwards.
  inkLight: readonly [number, number];
}

// Backgrounds live in one of two narrow bands and nowhere else. This is the single most
// consequential change: the compiler is now incapable of emitting a mid-lightness page.
const LIGHT_BG: readonly [number, number] = [95, 99];
const DARK_BG: readonly [number, number] = [4, 9];

// THE GRID, AND WHY IT IS A GRID
//
// The first attempt placed these eight signatures by intuition across five axes. Measured
// over the 20 businesses it sent 8 of 20 to a single anchor, because that anchor's
// signature happened to sit nearest the centroid - the same "everyone gets one palette"
// failure, reproduced through a new mechanism.
//
// So the placement is now empirical. Measuring the stretched distribution of each axis
// across the corpus:
//
//   colorTemperature          0.05 .. 1.00   (p25 0.31, median 0.47, p75 0.56)  <- spreads
//   brightness                0.21 .. 1.00   (p25 0.40, median 0.44, p75 0.71)  <- spreads
//   emotionalIntensity        0.34 .. 1.00   (median 0.34, p75 0.50)            <- clustered
//   credibilityRationalLean   0.34 .. 1.00   (median 0.34, p75 0.64)            <- clustered
//   decorationDensity         0.00 .. 0.66   (0.00 at the 75th percentile)      <- constant
//
// Only two axes actually separate real businesses. decorationDensity is dead - three
// quarters of the corpus sits on exactly 0.00 - so selecting on it added noise and no
// signal, and it has been dropped. The two clustered axes are kept at low weight, where
// they break ties between adjacent anchors without dominating.
//
// The eight anchors therefore lay out as a 4x2 grid over (colorTemperature, brightness),
// spanning the observed range rather than the theoretical unit cube. colorTemperature
// drives the NEUTRAL warmth - cool blue-grey through to warm cream, which is a real
// temperature - and each anchor's accent is then drawn from the studied system it is
// named for.
export const PALETTE_ANCHORS: readonly PaletteAnchor[] = [
  // --- coolest column ---------------------------------------------------------------
  {
    id: "ink",
    source: "Vercel / Framer - pure #FFFFFF ground, #0070F3 accent, maximum contrast",
    mode: "light",
    signature: { colorTemperature: 0.2, brightness: 0.72, emotionalIntensity: 0.36, credibilityRationalLean: 0.66 },
    neutralHue: 215,
    neutralSat: [0, 7],
    accentHue: [206, 218],
    accentSat: [82, 96],
    accentLight: [42, 52],
    inkLight: [8, 14],
  },
  {
    id: "obsidian",
    source: "Vercel dark - pure #000000 ground, single blue accent, maximum contrast",
    mode: "dark",
    signature: { colorTemperature: 0.2, brightness: 0.1, emotionalIntensity: 0.4, credibilityRationalLean: 0.7 },
    neutralHue: 210,
    neutralSat: [0, 6],
    accentHue: [204, 216],
    accentSat: [86, 98],
    accentLight: [48, 58],
    inkLight: [94, 99],
  },

  // --- cool / indigo column ---------------------------------------------------------
  {
    id: "trust",
    source: "Stripe - #0A2540 navy ink, #635BFF blurple accent, #F6F9FC cool surface",
    mode: "light",
    signature: { colorTemperature: 0.4, brightness: 0.72, emotionalIntensity: 0.38, credibilityRationalLean: 0.5 },
    neutralHue: 213,
    neutralSat: [6, 18],
    accentHue: [238, 252],
    accentSat: [72, 92],
    accentLight: [56, 66],
    inkLight: [13, 20],
  },
  {
    id: "graphite",
    source: "Linear - #08090A ground, #5E6AD2 indigo accent, near-zero chroma surfaces",
    mode: "dark",
    signature: { colorTemperature: 0.4, brightness: 0.1, emotionalIntensity: 0.42, credibilityRationalLean: 0.54 },
    neutralHue: 222,
    neutralSat: [4, 12],
    accentHue: [228, 244],
    accentSat: [56, 76],
    accentLight: [58, 68],
    inkLight: [93, 98],
  },

  // --- warm-neutral column ----------------------------------------------------------
  {
    id: "paper",
    source: "Notion - #F7F6F3 warm off-white, #37352F warm ink, restrained #2EAADC accent",
    mode: "light",
    signature: { colorTemperature: 0.58, brightness: 0.74, emotionalIntensity: 0.5, credibilityRationalLean: 0.4 },
    neutralHue: 40,
    neutralSat: [5, 14],
    accentHue: [188, 202],
    accentSat: [56, 74],
    accentLight: [38, 48],
    inkLight: [15, 22],
  },
  {
    id: "forest",
    source: "Deep-neutral dark with emerald accent - the dark counterpart to a warm ground",
    mode: "dark",
    signature: { colorTemperature: 0.58, brightness: 0.1, emotionalIntensity: 0.54, credibilityRationalLean: 0.44 },
    neutralHue: 45,
    neutralSat: [3, 10],
    accentHue: [150, 166],
    accentSat: [48, 68],
    accentLight: [46, 56],
    inkLight: [93, 98],
  },

  // --- warmest column ---------------------------------------------------------------
  {
    id: "terracotta",
    source: "Warm-neutral hospitality convention - cream ground, deep warm ink, clay accent",
    mode: "light",
    signature: { colorTemperature: 0.8, brightness: 0.7, emotionalIntensity: 0.66, credibilityRationalLean: 0.3 },
    neutralHue: 28,
    neutralSat: [8, 20],
    accentHue: [14, 28],
    accentSat: [62, 82],
    accentLight: [40, 50],
    inkLight: [14, 21],
  },
  {
    id: "midnight",
    source: "Raycast / Arc - warm near-black ground, #FF6363 coral accent",
    mode: "dark",
    signature: { colorTemperature: 0.8, brightness: 0.1, emotionalIntensity: 0.7, credibilityRationalLean: 0.34 },
    neutralHue: 16,
    neutralSat: [4, 13],
    accentHue: [2, 16],
    accentSat: [76, 94],
    accentLight: [56, 66],
    inkLight: [93, 98],
  },
];

export function backgroundBandFor(anchor: PaletteAnchor): readonly [number, number] {
  return anchor.mode === "light" ? LIGHT_BG : DARK_BG;
}

// SELECTION
//
// Nearest neighbour, but on STRETCHED axes. This is load-bearing, and skipping it would
// have reproduced the exact failure this whole module exists to fix.
//
// The DNA's colour-relevant axes are blended scores and cluster hard around 0.5 - measured,
// 17 of 20 businesses fell inside 0.44-0.64. Nearest-neighbour on raw values would send
// almost every business to whichever anchor happens to sit closest to the centroid, which
// is the same "everyone gets one palette" defect wearing a different mechanism.
//
// The differences the analysers produce are real, just compressed. Stretching about the
// midpoint makes ordinary mid-range variation decisive without inventing signal: a
// business at 0.44 and one at 0.64 stay in the same order and the same relation, they
// simply stop being neighbours.
const STRETCH = 3.2;

function stretch(value: number): number {
  return clamp01(0.5 + (clamp01(value) - 0.5) * STRETCH);
}

// brightness carries more weight than the rest because it decides light vs dark, which is
// the most visible single choice on the page and the one a business owner has the
// strongest instinct about.
// Weighted by how much each axis actually separates businesses (see the grid comment
// above). colorTemperature and brightness do the work; the other two only break ties
// between vertically or horizontally adjacent anchors.
const AXIS_WEIGHTS = {
  colorTemperature: 1.5,
  brightness: 1.7,
  emotionalIntensity: 0.3,
  credibilityRationalLean: 0.3,
} as const;

export function selectAnchor(dna: StrategyDNA): PaletteAnchor {
  let best = PALETTE_ANCHORS[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const anchor of PALETTE_ANCHORS) {
    let distance = 0;
    for (const axis of Object.keys(AXIS_WEIGHTS) as (keyof typeof AXIS_WEIGHTS)[]) {
      const delta = stretch(dna[axis]) - anchor.signature[axis];
      distance += AXIS_WEIGHTS[axis] * delta * delta;
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      best = anchor;
    }
  }

  return best;
}
