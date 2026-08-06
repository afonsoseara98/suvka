import type { StrategyDNA } from "@/app/ai/types/dna";
import { withDnaDefaults } from "@/app/ai/types/dna";
import { clamp01 } from "@/app/ai/utils/math";
import { selectAnchor, backgroundBandFor } from "./palettes";

// THEME COMPILER
//
// Used to be `Record<Theme, ThemeConfig>` - 6 hand-authored palettes, picked by a
// discrete Theme enum. There is no more picking: every value here is computed from
// StrategyDNA's continuous colorTemperature/saturation/brightness/accentIntensity/
// roundedness/elevation/density fields via HSL interpolation and lerp, so two
// businesses with even slightly different DNA get visibly different (not just
// differently-labeled) themes. compileTheme is the entire "renderer as compiler" - the
// component tree downstream is unchanged, it just now receives continuously-computed
// values instead of a lookup table's fixed entries.
export interface ThemeConfig {
  colors: {
    background: string;
    surface: string;
    card: string;

    primary: string;
    secondary: string;

    border: string;

    accent: string;
    accentHover: string;

    success: string;
    warning: string;
    danger: string;
  };

  gradients: {
    hero: string;
    button: string;
    glow: string;
  };

  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  shadow: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };

  typography: {
    hero: React.CSSProperties;
    title: React.CSSProperties;
    subtitle: React.CSSProperties;
    body: React.CSSProperties;
    button: React.CSSProperties;
  };

  animation: {
    fast: string;
    normal: string;
    slow: string;
  };
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * clamp01(t);
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(((h % 360) + 360) % 360)}, ${Math.round(clamp01(s / 100) * 100)}%, ${Math.round(clamp01(l / 100) * 100)}%)`;
}

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${Math.round(((h % 360) + 360) % 360)}, ${Math.round(clamp01(s / 100) * 100)}%, ${Math.round(clamp01(l / 100) * 100)}%, ${clamp01(a)})`;
}

// Was `hueFromTemperature = 225 + colorTemperature * 165`, a free sweep across the wheel.
// Measured over 20 real businesses it produced magenta 17 times, blue never, because the
// arc's midpoint is hue 307 and blended DNA scores cluster at the midpoint. Replaced by
// anchored ranges - see app/styles/palettes.ts for the measurement and the design study
// the replacements are drawn from.
function within([min, max]: readonly [number, number], t: number): number {
  return min + (max - min) * clamp01(t);
}

export function compileTheme(input: StrategyDNA): ThemeConfig {
  // Normalized first: a DNA that has been through storage (a published snapshot) may
  // predate a field this compiler now reads. See withDnaDefaults for why NaN, not
  // undefined, is the failure mode that actually reaches users.
  const dna = withDnaDefaults(input);

  // Which region of colour space this business occupies. Chosen by distance in DNA space,
  // never by industry - see selectAnchor.
  const anchor = selectAnchor(dna);
  const isDarkBg = anchor.mode === "dark";

  const sat = clamp01(dna.saturation);
  const bright = clamp01(dna.brightness);
  const accent = clamp01(dna.accentIntensity);
  const elevation = clamp01(dna.elevation);
  const weight = 400 + Math.round(lerp(0, 500, dna.typeWeight) / 100) * 100;

  // The DNA still drives every value below. What changed is that it now moves WITHIN a
  // range the anchor guarantees is coherent, instead of across the whole wheel. Two
  // businesses on the same anchor still differ in hue, saturation, contrast and depth -
  // they just can no longer differ into a bad palette.
  // Driven by emotionalIntensity, NOT colorTemperature. Temperature was already consumed
  // selecting the anchor, so reusing it here would collapse: every business that picked
  // the same anchor did so by having a similar temperature, and would then land on the
  // same accent within it. Modulating on an axis the selection did not use is what makes
  // two businesses on one anchor visibly different rather than the same page twice.
  const hue = within(anchor.accentHue, dna.emotionalIntensity);
  const neutralHue = anchor.neutralHue;

  const accentColor = hsl(hue, within(anchor.accentSat, sat), within(anchor.accentLight, accent));
  const accentHoverColor = hsl(
    hue,
    Math.min(100, within(anchor.accentSat, sat) + 6),
    within(anchor.accentLight, accent) + (isDarkBg ? 8 : 7)
  );

  // Bimodal, not continuous. A background is near-white or near-black; there is no such
  // thing as a 50%-lightness website, so this can no longer emit one. `brightness` still
  // matters - it modulates within the band, and it is weighted heavily in anchor
  // selection, so it is what decides light vs dark in the first place.
  const [bandMin, bandMax] = backgroundBandFor(anchor);
  const bgLightness = within([bandMin, bandMax], isDarkBg ? 1 - bright : bright);

  // Ink comes from the anchor's own range rather than being derived by offsetting the
  // background. The previous code computed text as background +/- 55 specifically to
  // rescue contrast at mid-brightness; with the background pinned to an extreme band, the
  // separation is structural and the patch is no longer needed.
  const textLightness = within(anchor.inkLight, 1 - Math.abs(bright - 0.5) * 0.6);
  const neutralSat = within(anchor.neutralSat, sat);

  const surfaceLightness = clamp01((isDarkBg ? bgLightness + 3.5 : bgLightness - 2.5) / 100) * 100;
  const cardLightness = clamp01((isDarkBg ? bgLightness + 6 : bgLightness - 4.5) / 100) * 100;
  const secondaryLightness = clamp01((isDarkBg ? textLightness - 28 : textLightness + 20) / 100) * 100;
  // Barely-there, matching the ~8-point delta every studied system uses (#E9E5E0 on
  // #FFFFFF). The old 12-point delta at mid-lightness read as a hard grey rule.
  const borderLightness = clamp01((isDarkBg ? bgLightness + 9 : bgLightness - 8) / 100) * 100;

  return {
    colors: {
      background: hsl(neutralHue, neutralSat, bgLightness),
      surface: hsl(neutralHue, neutralSat + 1, surfaceLightness),
      card: hsl(neutralHue, neutralSat + 2, cardLightness),

      // Tinted near-black / near-white, never neutral grey. Every system studied does
      // this: #0A2540 is a cool navy-black, #37352F a warm brown-black.
      primary: hsl(neutralHue, Math.min(30, neutralSat + 8), textLightness),
      secondary: hsl(neutralHue, Math.min(20, neutralSat + 4), secondaryLightness),

      border: hsl(neutralHue, Math.min(24, neutralSat + 3), borderLightness),

      accent: accentColor,
      accentHover: accentHoverColor,

      // Utility colors are conventional, not brand-personality-driven - success/warning/
      // danger stay recognizable regardless of the business's own DNA, with only a light
      // saturation nudge so they don't clash with a very muted or very vivid palette.
      success: hsl(142, lerp(35, 65, sat), 45),
      warning: hsl(38, lerp(50, 85, sat), 50),
      danger: hsl(0, lerp(45, 75, sat), 50),
    },

    gradients: {
      hero: `linear-gradient(135deg, ${accentColor}, ${hsl(hue + 22, Math.min(100, within(anchor.accentSat, sat) + 4), within(anchor.accentLight, accent) + 9)})`,
      button: `linear-gradient(135deg, ${accentColor}, ${accentHoverColor})`,
      glow: `radial-gradient(circle, ${hsla(hue, within(anchor.accentSat, sat), within(anchor.accentLight, accent), isDarkBg ? 0.3 : 0.16)}, transparent)`,
    },

    radius: {
      sm: `${Math.round(lerp(2, 10, dna.roundedness))}px`,
      md: `${Math.round(lerp(6, 20, dna.roundedness))}px`,
      lg: `${Math.round(lerp(10, 32, dna.roundedness))}px`,
      xl: `${Math.round(lerp(14, 44, dna.roundedness))}px`,
    },

    // Inverse of density: a denser page needs tighter spacing to still feel intentional
    // rather than merely cramped by accident.
    spacing: {
      xs: `${Math.round(lerp(6, 10, 1 - dna.density))}px`,
      sm: `${Math.round(lerp(10, 20, 1 - dna.density))}px`,
      md: `${Math.round(lerp(16, 32, 1 - dna.density))}px`,
      lg: `${Math.round(lerp(28, 64, 1 - dna.density))}px`,
      xl: `${Math.round(lerp(48, 100, 1 - dna.density))}px`,
    },

    shadow: {
      sm: `0 ${lerp(1, 4, elevation).toFixed(1)}px ${lerp(4, 12, elevation).toFixed(1)}px rgba(0,0,0,${lerp(0.06, 0.18, elevation).toFixed(2)})`,
      md: `0 ${lerp(6, 16, elevation).toFixed(1)}px ${lerp(20, 40, elevation).toFixed(1)}px rgba(0,0,0,${lerp(0.12, 0.28, elevation).toFixed(2)})`,
      lg: `0 ${lerp(16, 40, elevation).toFixed(1)}px ${lerp(50, 100, elevation).toFixed(1)}px rgba(0,0,0,${lerp(0.2, 0.4, elevation).toFixed(2)})`,
      glow: `0 0 ${Math.round(lerp(20, 90, elevation))}px ${hsla(hue, within(anchor.accentSat, sat), within(anchor.accentLight, accent), 0.3)}`,
    },

    // Every size below is a clamp(), not a fixed rem. A generated page is the artefact
    // strangers actually see, most of them on a phone - and a 5.5rem headline with
    // lineHeight 1 does not merely look wrong at 375px, it overflows the viewport.
    // Expressing the DNA-derived size as the UPPER bound of a viewport-relative range
    // keeps the desktop design exactly as it was while making the same value degrade
    // sensibly all the way down, without a single media query or component change.
    typography: {
      hero: {
        fontSize: `clamp(${lerp(1.9, 2.6, dna.typeScale).toFixed(2)}rem, ${lerp(6, 9, dna.typeScale).toFixed(1)}vw, ${lerp(2.5, 5.5, dna.typeScale).toFixed(2)}rem)`,
        fontWeight: 700 + Math.round(lerp(0, 200, dna.typeWeight) / 100) * 100,
        letterSpacing: `${lerp(-0.01, -0.03, dna.typeScale).toFixed(3)}em`,
        lineHeight: 1.05,
      },
      title: {
        fontSize: `clamp(${lerp(1.5, 1.9, dna.typeScale).toFixed(2)}rem, ${lerp(4, 5.5, dna.typeScale).toFixed(1)}vw, ${lerp(1.875, 3, dna.typeScale).toFixed(2)}rem)`,
        fontWeight: 600 + Math.round(lerp(0, 200, dna.typeWeight) / 100) * 100,
        letterSpacing: `${lerp(-0.005, -0.02, dna.typeScale).toFixed(3)}em`,
        lineHeight: 1.15,
      },
      subtitle: {
        fontSize: `clamp(1rem, 2.5vw, ${lerp(1.125, 1.375, dna.typeScale).toFixed(3)}rem)`,
        fontWeight: 400,
        lineHeight: 1.6,
      },
      body: {
        fontSize: "1rem",
        fontWeight: 400,
        lineHeight: 1.75,
      },
      button: {
        fontWeight: weight,
      },
    },

    // Motion intensity is not yet part of StrategyDNA - kept fixed rather than
    // continuous, tracked as remaining scope (see the final report).
    animation: {
      fast: "transition-all duration-200",
      normal: "transition-all duration-300",
      slow: "transition-all duration-500",
    },
  };
}
