import { describe, it, expect } from "vitest";
import { PALETTE_ANCHORS, selectAnchor, backgroundBandFor } from "./palettes";
import { compileTheme } from "./theme";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import { BENCHMARK_BUSINESSES } from "@/app/benchmark/businesses";
import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";

function parseHsl(value: string) {
  const m = value.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) throw new Error(`not an hsl() value: ${value}`);
  return { h: +m[1], s: +m[2], l: +m[3] };
}

// WCAG relative luminance, so contrast is measured rather than asserted by eye.
function luminance(h: number, s: number, l: number): number {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const lin = (v: number) => {
    const u = v + m;
    return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const A = parseHsl(a);
  const B = parseHsl(b);
  const la = luminance(A.h, A.s, A.l);
  const lb = luminance(B.h, B.s, B.l);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe("palette anchors", () => {
  it("every anchor declares a coherent, non-empty range on every axis", () => {
    for (const anchor of PALETTE_ANCHORS) {
      for (const [label, range] of [
        ["accentHue", anchor.accentHue],
        ["accentSat", anchor.accentSat],
        ["accentLight", anchor.accentLight],
        ["neutralSat", anchor.neutralSat],
        ["inkLight", anchor.inkLight],
      ] as const) {
        expect(range[0], `${anchor.id}.${label}`).toBeLessThan(range[1]);
      }
    }
  });

  it("records where each anchor's values came from", () => {
    // The provenance is the whole basis for these numbers not being invented. A future
    // anchor added without a source is a regression in method, not just documentation.
    for (const anchor of PALETTE_ANCHORS) {
      expect(anchor.source.length, anchor.id).toBeGreaterThan(20);
    }
  });

  it("is deterministic - the same DNA always selects the same anchor", () => {
    const dna = neutralStrategyDna({ colorTemperature: 0.61, brightness: 0.44 });
    expect(selectAnchor(dna).id).toBe(selectAnchor(dna).id);
  });

  it("selects on DNA alone - nothing here can see an industry", () => {
    // Two DNAs that differ only in temperature must be able to reach different anchors,
    // which is what makes this a continuous selection rather than a category lookup.
    const cool = selectAnchor(neutralStrategyDna({ colorTemperature: 0.05, brightness: 0.9 }));
    const warm = selectAnchor(neutralStrategyDna({ colorTemperature: 0.95, brightness: 0.9 }));
    expect(cool.id).not.toBe(warm.id);
  });

  it("routes bright DNA to a light anchor and dark DNA to a dark one", () => {
    expect(selectAnchor(neutralStrategyDna({ brightness: 0.95 })).mode).toBe("light");
    expect(selectAnchor(neutralStrategyDna({ brightness: 0.02 })).mode).toBe("dark");
  });
});

// THE DEFECT THIS REPLACED
//
// The previous model interpolated hue and lightness freely across all of colour space.
// Compiled over these same 20 businesses it produced: a magenta accent 17 times, blue 0
// times, and a background in the muddy 20-80% lightness band 20 times out of 20. A family
// law firm rendered lilac with a fluorescent pink call-to-action.
describe("compiled themes across the real 20-business corpus", () => {
  const compiled = BENCHMARK_BUSINESSES.map((business) => {
    const pipeline = buildPipeline(business.prompt);
    return { id: business.id, anchor: selectAnchor(pipeline.dna), theme: compileTheme(pipeline.dna) };
  });

  it("never emits a mid-lightness background", () => {
    // The single most consequential guarantee: real sites are near-white or near-black,
    // and the compiler is now structurally incapable of producing anything between.
    for (const { id, theme } of compiled) {
      const { l } = parseHsl(theme.colors.background);
      const atAnExtreme = l <= 20 || l >= 80;
      expect(atAnExtreme, `${id} background lightness was ${l}%`).toBe(true);
    }
  });

  it("keeps every background inside its anchor's declared band", () => {
    for (const { id, anchor, theme } of compiled) {
      const [min, max] = backgroundBandFor(anchor);
      const { l } = parseHsl(theme.colors.background);
      expect(l, `${id}`).toBeGreaterThanOrEqual(min - 1);
      expect(l, `${id}`).toBeLessThanOrEqual(max + 1);
    }
  });

  it("meets WCAG AA for headings and body text on every business", () => {
    // Contrast used to be rescued by a forced +/-55 lightness offset applied after the
    // fact. It is now structural: ink and background come from bands that cannot overlap.
    for (const { id, theme } of compiled) {
      expect(contrast(theme.colors.background, theme.colors.primary), `${id} heading`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.colors.background, theme.colors.secondary), `${id} body`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("does not send the whole corpus to one palette", () => {
    // The failure being guarded is not "magenta" specifically - it is the shape of the
    // failure: a blended DNA score regressing to the middle and every business landing on
    // whatever sits there. Two earlier revisions of this grid did exactly that, at 8/20.
    const used = new Set(compiled.map((c) => c.anchor.id));
    expect(used.size).toBeGreaterThanOrEqual(4);

    const counts = [...used].map((anchorId) => compiled.filter((c) => c.anchor.id === anchorId).length);
    expect(Math.max(...counts)).toBeLessThanOrEqual(compiled.length / 2);
  });

  it("produces both light and dark pages, weighted towards light", () => {
    // Light is the neutral default for a local business; dark is a deliberate choice. An
    // earlier revision put the light/dark boundary above the observed median and sent 12
    // of 20 to dark pages.
    const dark = compiled.filter((c) => c.anchor.mode === "dark").length;
    expect(dark).toBeGreaterThan(0);
    expect(dark).toBeLessThan(compiled.length / 2);
  });

  it("can reach blue, which the previous model could not", () => {
    const hues = compiled.map((c) => parseHsl(c.theme.colors.accent).h);
    expect(hues.some((h) => h >= 195 && h <= 250)).toBe(true);
  });
});
