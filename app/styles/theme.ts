import type { StrategyDNA } from "@/app/ai/types/dna";
import { clamp01 } from "@/app/ai/utils/math";

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

// Blue (225) -> purple -> magenta -> red -> orange (30), deliberately going the "long
// way" around the hue wheel rather than the short way through green/yellow - every
// hand-authored palette this replaced (indigo, violet, gold, blue, orange, red) sat on
// this same arc, never in green/yellow territory, which reads as off-brand for a
// business accent color.
function hueFromTemperature(colorTemperature: number): number {
  return 225 + clamp01(colorTemperature) * 165;
}

export function compileTheme(dna: StrategyDNA): ThemeConfig {
  const hue = hueFromTemperature(dna.colorTemperature);
  const sat = clamp01(dna.saturation);
  const bright = clamp01(dna.brightness);
  const accent = clamp01(dna.accentIntensity);
  const elevation = clamp01(dna.elevation);
  const weight = 400 + Math.round(lerp(0, 500, dna.typeWeight) / 100) * 100;

  const accentColor = hsl(hue, lerp(40, 90, sat), lerp(45, 62, accent));
  const accentHoverColor = hsl(hue, lerp(45, 95, sat), lerp(55, 70, accent));

  // Background lightness is continuous across the full [3, 92] range, but text
  // lightness is deliberately NOT interpolated independently from the opposite fixed
  // endpoint (97 -> 8) - at a mid-range brightness (~0.5) that produced two similarly
  // mid-gray values with barely any contrast between them (a real bug found by
  // rendering an actual page, not a hypothetical). Instead, text lightness is derived
  // FROM the background's own lightness, always at least ~50 points away on the
  // lightness scale - background stays fully continuous, but legibility is guaranteed
  // at every point along that range, not just near the two extremes.
  const bgLightness = lerp(3, 92, bright);
  const isDarkBg = bgLightness < 50;
  const textLightness = clamp01((isDarkBg ? bgLightness + 55 : bgLightness - 55) / 100) * 100;
  const surfaceLightness = clamp01((isDarkBg ? bgLightness + 3 : bgLightness - 3) / 100) * 100;
  const cardLightness = clamp01((isDarkBg ? bgLightness + 6 : bgLightness - 6) / 100) * 100;
  const secondaryLightness = clamp01((isDarkBg ? textLightness - 25 : textLightness + 25) / 100) * 100;
  const borderLightness = clamp01((isDarkBg ? bgLightness + 12 : bgLightness - 12) / 100) * 100;

  return {
    colors: {
      background: hsl(hue, lerp(4, 12, sat), bgLightness),
      surface: hsl(hue, lerp(5, 14, sat), surfaceLightness),
      card: hsl(hue, lerp(6, 16, sat), cardLightness),

      primary: hsl(hue, 5, textLightness),
      secondary: hsl(hue, 8, secondaryLightness),

      border: hsl(hue, lerp(10, 30, sat), borderLightness),

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
      hero: `linear-gradient(135deg, ${accentColor}, ${hsl(hue + 35, lerp(40, 90, sat), lerp(55, 72, accent))})`,
      button: `linear-gradient(135deg, ${accentColor}, ${accentHoverColor})`,
      glow: `radial-gradient(circle, ${hsla(hue, lerp(40, 90, sat), lerp(45, 62, accent), 0.35)}, transparent)`,
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
      glow: `0 0 ${Math.round(lerp(20, 90, elevation))}px ${hsla(hue, lerp(40, 90, sat), lerp(45, 62, accent), 0.35)}`,
    },

    typography: {
      hero: {
        fontSize: `${lerp(2.5, 5.5, dna.typeScale).toFixed(2)}rem`,
        fontWeight: 700 + Math.round(lerp(0, 200, dna.typeWeight) / 100) * 100,
        letterSpacing: `${lerp(-0.01, -0.03, dna.typeScale).toFixed(3)}em`,
        lineHeight: 1,
      },
      title: {
        fontSize: `${lerp(1.875, 3, dna.typeScale).toFixed(2)}rem`,
        fontWeight: 600 + Math.round(lerp(0, 200, dna.typeWeight) / 100) * 100,
        letterSpacing: `${lerp(-0.005, -0.02, dna.typeScale).toFixed(3)}em`,
      },
      subtitle: {
        fontSize: `${lerp(1.125, 1.375, dna.typeScale).toFixed(3)}rem`,
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
