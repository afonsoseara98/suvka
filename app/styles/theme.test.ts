import { describe, it, expect } from "vitest";
import { compileTheme } from "./theme";
import { compileLayout } from "./layout";
import { neutralStrategyDna } from "@/app/ai/testFixtures";

describe("compileTheme", () => {
  it("is deterministic - identical DNA always compiles to the same theme", () => {
    expect(compileTheme(neutralStrategyDna())).toEqual(compileTheme(neutralStrategyDna()));
  });

  it("produces a visibly different accent color for different colorTemperature values", () => {
    const cool = compileTheme(neutralStrategyDna({ colorTemperature: 0 }));
    const warm = compileTheme(neutralStrategyDna({ colorTemperature: 1 }));
    expect(cool.colors.accent).not.toBe(warm.colors.accent);
  });

  it("produces a lighter background for higher brightness", () => {
    const dark = compileTheme(neutralStrategyDna({ brightness: 0 }));
    const light = compileTheme(neutralStrategyDna({ brightness: 1 }));

    const lightnessOf = (hsl: string) => parseFloat(hsl.match(/,\s*(\d+)%\)$/)?.[1] ?? "0");
    expect(lightnessOf(light.colors.background)).toBeGreaterThan(lightnessOf(dark.colors.background));
  });

  it("produces a larger radius scale for higher roundedness", () => {
    const sharp = compileTheme(neutralStrategyDna({ roundedness: 0 }));
    const round = compileTheme(neutralStrategyDna({ roundedness: 1 }));
    expect(parseFloat(round.radius.lg)).toBeGreaterThan(parseFloat(sharp.radius.lg));
  });

  it("produces tighter spacing for higher density", () => {
    const spacious = compileTheme(neutralStrategyDna({ density: 0 }));
    const dense = compileTheme(neutralStrategyDna({ density: 1 }));
    expect(parseFloat(dense.spacing.lg)).toBeLessThan(parseFloat(spacious.spacing.lg));
  });

  it("produces a stronger shadow/glow for higher elevation", () => {
    const flat = compileTheme(neutralStrategyDna({ elevation: 0 }));
    const elevated = compileTheme(neutralStrategyDna({ elevation: 1 }));
    // Both encode blur radius as the second px value in "0 Xpx Ypx rgba(...)" - a
    // rough but real signal that elevation increases visual depth.
    const blurOf = (shadow: string) => parseFloat(shadow.split(" ")[2] ?? "0");
    expect(blurOf(elevated.shadow.lg)).toBeGreaterThan(blurOf(flat.shadow.lg));
  });

  it("scales hero/title font sizes with typeScale", () => {
    const restrained = compileTheme(neutralStrategyDna({ typeScale: 0 }));
    const dramatic = compileTheme(neutralStrategyDna({ typeScale: 1 }));
    expect(clampMax(dramatic.typography.hero.fontSize as string)).toBeGreaterThan(
      clampMax(restrained.typography.hero.fontSize as string)
    );
  });
});

// A generated page is read mostly on phones, by people who did not build it. Typography
// used to be a fixed rem value derived from the DNA, which meant a 5.5rem headline hit a
// 375px screen at full size and overflowed it. These assert the responsive contract that
// replaced it - and they live here rather than in a component test because happy-dom
// discards inline styles containing clamp() entirely, so the DOM cannot be asked.
describe("compileTheme - responsive typography", () => {
  const SCALES = [0, 0.25, 0.5, 0.75, 1];

  it("emits clamp() for hero, title and subtitle at every typeScale", () => {
    for (const typeScale of SCALES) {
      const theme = compileTheme(neutralStrategyDna({ typeScale }));
      expect(theme.typography.hero.fontSize as string).toMatch(/^clamp\(/);
      expect(theme.typography.title.fontSize as string).toMatch(/^clamp\(/);
      expect(theme.typography.subtitle.fontSize as string).toMatch(/^clamp\(/);
    }
  });

  it("never lets the mobile floor exceed the desktop ceiling", () => {
    for (const typeScale of SCALES) {
      const theme = compileTheme(neutralStrategyDna({ typeScale }));
      for (const token of [theme.typography.hero, theme.typography.title, theme.typography.subtitle]) {
        const value = token.fontSize as string;
        expect(clampMin(value)).toBeLessThanOrEqual(clampMax(value));
      }
    }
  });

  it("keeps the desktop ceiling at the size the DNA asked for", () => {
    // The clamp is additive: it constrains small viewports without shrinking the design
    // the DNA computed for a large one.
    const dramatic = compileTheme(neutralStrategyDna({ typeScale: 1 }));
    expect(clampMax(dramatic.typography.hero.fontSize as string)).toBeCloseTo(5.5, 2);
  });

  it("keeps the mobile floor small enough to fit a narrow screen", () => {
    // 2.6rem ~ 42px: a headline at that size still fits a 375px viewport across two or
    // three lines, which the previous fixed 5.5rem (88px) could not.
    const dramatic = compileTheme(neutralStrategyDna({ typeScale: 1 }));
    expect(clampMin(dramatic.typography.hero.fontSize as string)).toBeLessThanOrEqual(2.6);
  });

  it("gives the hero a line-height that survives wrapping", () => {
    // lineHeight 1 was fine for a single desktop line and cramped the moment a headline
    // wrapped to two lines on a phone.
    const theme = compileTheme(neutralStrategyDna({ typeScale: 1 }));
    expect(Number(theme.typography.hero.lineHeight)).toBeGreaterThan(1);
  });
});

// A published page is a frozen JSON snapshot (prisma/schema.prisma's Page.publishedState)
// written by whatever version of StrategyDNA existed the day it was published. The day a
// new axis is added, every existing snapshot is missing it - and lerp(a, b, undefined)
// produces NaN, which reaches the visitor as `clamp(NaNrem, NaNvw, NaNrem)` and silently
// unstyles the whole page. That exact string was found in real served HTML, which is why
// these assertions test malformed input rather than only well-formed DNA.
describe("compileTheme / compileLayout - malformed or outdated DNA", () => {
  const INCOMPLETE = [
    ["empty object", {}],
    ["missing typography axes", { colorTemperature: 0.5, saturation: 0.5 }],
    ["explicit undefined", { typeScale: undefined, density: undefined }],
    ["null values", { typeScale: null, density: null }],
    ["NaN values", { typeScale: NaN, density: NaN }],
    ["string that survived a JSON round trip", { typeScale: "0.8" }],
  ] as const;

  function everyCssValue(value: unknown, seen: string[] = []): string[] {
    if (typeof value === "string" || typeof value === "number") {
      seen.push(String(value));
    } else if (value && typeof value === "object") {
      for (const nested of Object.values(value)) everyCssValue(nested, seen);
    }
    return seen;
  }

  for (const [label, partial] of INCOMPLETE) {
    it(`never emits NaN from compileTheme for ${label}`, () => {
      const theme = compileTheme(partial as never);
      const offending = everyCssValue(theme).filter((v) => v.includes("NaN"));
      expect(offending).toEqual([]);
    });

    it(`never emits NaN from compileLayout for ${label}`, () => {
      const layout = compileLayout(partial as never);
      const offending = everyCssValue(layout).filter((v) => v.includes("NaN"));
      expect(offending).toEqual([]);
    });
  }

  it("still honours the axes that ARE present", () => {
    // Degrading gracefully must not mean ignoring real data: a snapshot missing some
    // fields should keep the styling of the fields it does have.
    const dark = compileTheme({ brightness: 0 } as never);
    const light = compileTheme({ brightness: 1 } as never);
    expect(dark.colors.background).not.toBe(light.colors.background);
  });
});

function clampParts(value: string): [number, number, number] {
  const inner = value.replace(/^clamp\(/, "").replace(/\)$/, "");
  const parts = inner.split(",").map((p) => parseFloat(p.trim()));
  return [parts[0], parts[1], parts[2]];
}

function clampMin(value: string): number {
  return clampParts(value)[0];
}

function clampMax(value: string): number {
  return clampParts(value)[2];
}
