import { describe, it, expect } from "vitest";
import { compileLayout, resolveSectionSpacing, responsivePx, responsiveSectionSpacing } from "./layout";
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

// Spacing has the same problem typography had: the DNA-derived px value was written
// straight into the style attribute, so a phone got the same 144px hero padding as a
// 27" monitor and most of a small screen was consumed before any content appeared.
describe("responsivePx / responsiveSectionSpacing", () => {
  it("emits a clamp whose ceiling is the value the DNA asked for", () => {
    expect(responsivePx(144)).toMatch(/^clamp\(/);
    expect(responsivePx(144)).toContain("144px");
  });

  it("floors small screens well below the desktop value", () => {
    const [min, , max] = clampParts(responsivePx(144));
    expect(min).toBeLessThan(max);
    expect(min).toBeLessThanOrEqual(64);
  });

  it("never produces a floor above the ceiling, at any input", () => {
    for (const px of [24, 32, 48, 80, 100, 144, 200]) {
      const [min, , max] = clampParts(responsivePx(px));
      expect(min).toBeLessThanOrEqual(max);
    }
  });

  it("keeps a usable minimum so sections never collide on mobile", () => {
    expect(clampParts(responsivePx(32))[0]).toBeGreaterThanOrEqual(24);
  });

  // This is the assertion the SectionRenderer rhythm test used to make against the DOM,
  // moved to where the value is a real string rather than one happy-dom throws away.
  it("preserves the rhythm ordering through the responsive wrapper", () => {
    const dense = clampParts(responsiveSectionSpacing(100, "dense"))[2];
    const standard = clampParts(responsiveSectionSpacing(100, "standard"))[2];
    const breather = clampParts(responsiveSectionSpacing(100, "breather"))[2];

    expect(dense).toBeLessThan(standard);
    expect(standard).toBeLessThan(breather);
  });

  it("produces different values for different rhythms, not one collapsed value", () => {
    expect(responsiveSectionSpacing(100, "dense")).not.toBe(responsiveSectionSpacing(100, "breather"));
  });
});

function clampParts(value: string): [number, number, number] {
  const inner = value.replace(/^clamp\(/, "").replace(/\)$/, "");
  const parts = inner.split(",").map((p) => parseFloat(p.trim()));
  return [parts[0], parts[1], parts[2]];
}
