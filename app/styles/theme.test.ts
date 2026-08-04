import { describe, it, expect } from "vitest";
import { compileTheme } from "./theme";
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
    expect(parseFloat(dramatic.typography.hero.fontSize as string)).toBeGreaterThan(
      parseFloat(restrained.typography.hero.fontSize as string)
    );
  });
});
