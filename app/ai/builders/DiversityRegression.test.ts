import { describe, it, expect } from "vitest";
import { CORPUS, NEAR_DUPLICATE_PAIRS, fingerprintOf, runStressTest } from "./DiversityStressTest.test";

// DIVERSITY REGRESSION GUARD
//
// Unlike DiversityStressTest.test.ts (a portable data-collection harness meant to also
// run against old commits for a before/after comparison), this file is the permanent
// pass/fail gate: it encodes the numbers a real 100-prompt before/after run actually
// produced (see the diversity report) as floors/ceilings, so a future change that
// silently re-collapses the combinatorial space (the exact failure this whole engine
// exists to prevent - see LayoutIntelligence.ts/DesignFamily.ts/BusinessIntelligence.ts
// header comments) fails CI instead of shipping unnoticed.
//
// Thresholds are set with real headroom below/above the measured "after" values, not
// pinned to them exactly - this should catch a regression toward the "before" numbers,
// not fail on ordinary week-to-week tuning of a fit formula's weights.
describe("Diversity regression guard (thresholds derived from the before/after stress-test report)", () => {
  it("keeps design family well-distributed - no single family dominates more than 40% of generations", () => {
    const report = runStressTest();
    // Before this engine existed there was no design family concept at all (100% "n/a").
    // After: measured topShare was 0.17 across 8 families. 0.40 leaves real room for
    // legitimate signal-driven skew while still catching a collapse back toward one
    // dominant family.
    expect(report.designFamilyTopShare).toBeLessThan(0.4);
    expect(Object.keys(report.designFamilyDistribution).length).toBeGreaterThanOrEqual(5);
  });

  it("keeps hero variant reachable across all 3 variants, with no variant above 90% share", () => {
    const report = runStressTest();
    // Before: centered was 92% (functionally a near-monopoly). After: 70%. 0.90 catches
    // a regression back toward the old hard-threshold collapse without demanding an
    // artificially even 33/33/33 split "centered" legitimately shouldn't have.
    expect(report.heroVariantTopShare).toBeLessThan(0.9);
    expect(Object.keys(report.heroVariantDistribution).length).toBe(3);
  });

  it("keeps section-sequence collision well below the pre-diversity-engine baseline", () => {
    const report = runStressTest();
    // Before: 3 distinct sequences across 100 prompts (0.03). After: 20 (0.20). 0.10
    // is the regression floor - well above the old baseline, with headroom below the
    // measured "after" value for ordinary tuning.
    expect(report.sectionSequenceDistinctRate).toBeGreaterThan(0.1);
  });

  it("keeps full-fingerprint collisions rare - at least 80% of the corpus is fully unique", () => {
    const report = runStressTest();
    // Before: 0.05 (95% of pages were one of only 5 shapes). After: 1.0. 0.80 is a
    // generous floor - this is the single strongest signal of "does this look like one
    // generator's house style."
    expect(report.fullFingerprintDistinctRate).toBeGreaterThan(0.8);
  });

  it("keeps industry classification hit-rate above the pre-expansion baseline", () => {
    const report = runStressTest();
    // Before (9 industries): 0.35. After (14 industries + broadened lexicon): 0.59.
    expect(report.industryHitRate).toBeGreaterThan(0.45);
  });

  it("never lets two semantically-similar prompts collapse to an identical fingerprint", () => {
    // The core "consistent but visually distinct" claim, as a hard per-pair guarantee -
    // not just a corpus-wide average that could hide one pair silently collapsing.
    for (const [a, b] of NEAR_DUPLICATE_PAIRS) {
      const fa = fingerprintOf(a);
      const fb = fingerprintOf(b);
      expect(fa.industry).toBe(fb.industry); // consistent: same business read
      expect(
        fa.designFamily === fb.designFamily &&
          fa.heroVariant === fb.heroVariant &&
          fa.sectionSequence === fb.sectionSequence &&
          fa.variantSignature === fb.variantSignature
      ).toBe(false); // distinct: not a byte-identical page
    }
  });

  it("is deterministic - the full corpus produces the exact same report across two runs", () => {
    const withoutTimestamp = (report: ReturnType<typeof runStressTest>) => {
      const { generatedAt, ...rest } = report;
      void generatedAt;
      return rest;
    };
    expect(withoutTimestamp(runStressTest())).toEqual(withoutTimestamp(runStressTest()));
  });

  it("covers a meaningfully large, realistic corpus", () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(100);
  });
});
