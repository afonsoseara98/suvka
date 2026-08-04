import { describe, it, expect } from "vitest";
import { compileLayout, resolveSectionSpacing } from "./layout";
import { neutralStrategyDna } from "@/app/ai/testFixtures";

describe("compileLayout", () => {
  it("is deterministic - identical DNA always compiles to the same layout", () => {
    expect(compileLayout(neutralStrategyDna())).toEqual(compileLayout(neutralStrategyDna()));
  });

  it("produces a narrower section width for lower contentWidth", () => {
    const narrow = compileLayout(neutralStrategyDna({ contentWidth: 0 }));
    const wide = compileLayout(neutralStrategyDna({ contentWidth: 1 }));
    expect(narrow.sectionWidthPx).toBeLessThan(wide.sectionWidthPx);
  });

  it("produces tighter section spacing and hero padding for higher density", () => {
    const spacious = compileLayout(neutralStrategyDna({ density: 0 }));
    const dense = compileLayout(neutralStrategyDna({ density: 1 }));
    expect(dense.sectionSpacingPx).toBeLessThan(spacious.sectionSpacingPx);
    expect(dense.heroPaddingPx).toBeLessThan(spacious.heroPaddingPx);
  });

  it("switches header alignment and CTA layout at the narrow-content threshold", () => {
    const narrow = compileLayout(neutralStrategyDna({ contentWidth: 0.1 }));
    const wide = compileLayout(neutralStrategyDna({ contentWidth: 0.9 }));
    expect(narrow.headerAlign).toBe("left");
    expect(narrow.ctaLayout).toBe("stacked");
    expect(wide.headerAlign).toBe("center");
    expect(wide.ctaLayout).toBe("row");
  });

  it("suppresses decoration entirely below the decorationDensity floor", () => {
    expect(compileLayout(neutralStrategyDna({ decorationDensity: 0.05 })).decorative).toBe("none");
  });

  it("picks glow for a warm palette and grid-lines for a cool one, once decoration is present", () => {
    const warm = compileLayout(neutralStrategyDna({ decorationDensity: 0.5, colorTemperature: 0.9 }));
    const cool = compileLayout(neutralStrategyDna({ decorationDensity: 0.5, colorTemperature: 0.1 }));
    expect(warm.decorative).toBe("glow");
    expect(cool.decorative).toBe("grid-lines");
  });

  it("passes decorationDensity through continuously as decorationOpacity", () => {
    expect(compileLayout(neutralStrategyDna({ decorationDensity: 0.73 })).decorationOpacity).toBe(0.73);
  });
});

describe("resolveSectionSpacing", () => {
  it("shifts spacing up for breather and down for dense, relative to standard", () => {
    expect(resolveSectionSpacing(100, "breather")).toBeGreaterThan(resolveSectionSpacing(100, "standard"));
    expect(resolveSectionSpacing(100, "dense")).toBeLessThan(resolveSectionSpacing(100, "standard"));
  });

  it("never goes below a 32px floor", () => {
    expect(resolveSectionSpacing(40, "dense")).toBeGreaterThanOrEqual(32);
  });
});
