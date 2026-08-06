import { describe, it, expect } from "vitest";
import { calibrateSignal, deriveGain, CALIBRATED_DIMENSIONS } from "./signalCalibration";
import { buildBusinessProfile } from "./BusinessProfileBuilder";
import { buildBusinessIntelligence } from "./BusinessIntelligence";
import { BENCHMARK_BUSINESSES } from "@/app/benchmark/businesses";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";

describe("calibrateSignal", () => {
  it("is monotone - amplification can never reorder two businesses", () => {
    // The whole safety argument rests on this. Amplifying a correct ranking sharpens it;
    // if the transform could invert a pair, it would be manufacturing wrong answers.
    for (const dimension of CALIBRATED_DIMENSIONS as (keyof BusinessIntelligenceProfile)[]) {
      let previous = -Infinity;
      for (let raw = 0; raw <= 1.0001; raw += 0.02) {
        const value = calibrateSignal(dimension, raw);
        expect(value, `${dimension} at ${raw.toFixed(2)}`).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    }
  });

  it("never leaves the unit range", () => {
    for (const dimension of CALIBRATED_DIMENSIONS as (keyof BusinessIntelligenceProfile)[]) {
      for (const raw of [-5, 0, 0.5, 1, 5]) {
        const value = calibrateSignal(dimension, raw);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("leaves a business sitting at the calibration centre where it was", () => {
    // Expansion happens around the observed centre rather than around 0.5, so absolute
    // thresholds downstream keep their meaning for a mid-range business; only distance
    // from the centre grows.
    const centred = calibrateSignal("pricePositioning", 0.479);
    expect(centred).toBeCloseTo(0.479, 2);
  });

  it("passes an uncalibrated dimension through untouched", () => {
    expect(calibrateSignal("marketPosition" as keyof BusinessIntelligenceProfile, 0.3)).toBeCloseTo(0.3, 5);
  });

  it("caps amplification so a near-constant axis is not turned into noise", () => {
    // An axis with sd 0.037 would need a gain near 5 to hit the target. Past a point the
    // transform is only magnifying the last decimal of a lexicon hit, so it stops at 3 -
    // the honest fix for an axis with three distinct values is more resolution upstream.
    expect(deriveGain(0.001)).toBe(3);
    expect(deriveGain(0.18)).toBeCloseTo(1, 5);
    expect(deriveGain(0.09)).toBeCloseTo(2, 5);
  });
});

// The measured justification for this file existing, asserted so it cannot silently rot.
// Before calibration: mean sd 0.101, three axes below 0.06 (purchaseUrgency 0.037,
// buyerSophistication 0.048, pricePositioning 0.058) - differences too small for any
// downstream threshold to act on.
describe("business intelligence spread across the real corpus", () => {
  const rows = BENCHMARK_BUSINESSES.map((business) =>
    buildBusinessIntelligence(business.prompt, buildBusinessProfile(business.prompt))
  );

  function spreadOf(dimension: keyof BusinessIntelligenceProfile): number {
    const values = rows.map((r) => r[dimension] as number);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  }

  it("has no dead axis - every dimension can separate two businesses", () => {
    for (const dimension of CALIBRATED_DIMENSIONS as (keyof BusinessIntelligenceProfile)[]) {
      expect(spreadOf(dimension), `${dimension} is too flat to act on`).toBeGreaterThan(0.06);
    }
  });

  it("keeps the rankings a person would agree with", () => {
    // A sample of app/scripts/audit-ordering.ts, in the suite so a regression fails CI
    // rather than waiting to be noticed in a contact sheet.
    const by = (id: string) => rows[BENCHMARK_BUSINESSES.findIndex((b) => b.id === id)];

    expect(by("canalizador").purchaseUrgency).toBeGreaterThan(by("arquitetura").purchaseUrgency);
    expect(by("advogado").authorityRequirement).toBeGreaterThan(by("restaurante").authorityRequirement);
    expect(by("wedding-planner").emotionalVsRational).toBeGreaterThan(by("saas").emotionalVsRational);
    expect(by("imobiliaria").decisionComplexity).toBeGreaterThan(by("barbeiro").decisionComplexity);
    expect(by("fotografo").visualImportance).toBeGreaterThan(by("canalizador").visualImportance);
    expect(by("psicologo").trustDifficulty).toBeGreaterThan(by("ecommerce").trustDifficulty);
  });
});
