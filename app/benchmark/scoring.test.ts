import { describe, it, expect } from "vitest";
import { average, buildReport } from "./scoring";
import { BENCHMARK_CRITERIA } from "./types";
import type { ScoreRecord } from "./types";

function score(overrides: Partial<ScoreRecord> = {}): ScoreRecord {
  return {
    businessId: "advogado",
    source: "suvka",
    criterion: "clarezaProposta",
    score: 8,
    scoredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("average", () => {
  it("returns null for an empty list", () => {
    expect(average([])).toBeNull();
  });

  it("computes the arithmetic mean", () => {
    expect(average([6, 8, 10])).toBe(8);
  });
});

describe("buildReport", () => {
  it("returns null averages and no winner for a criterion with no scores at all", () => {
    const report = buildReport([]);
    const criterion = report.perCriterion.find((c) => c.criterion === "clarezaProposta")!;
    expect(criterion.averages).toEqual({ suvka: null, chatgpt: null, claude: null, gemini: null });
    expect(criterion.winner).toBeNull();
  });

  it("computes per-source, per-criterion averages across multiple businesses", () => {
    const scores: ScoreRecord[] = [
      score({ businessId: "advogado", source: "suvka", criterion: "clarezaProposta", score: 8 }),
      score({ businessId: "dentista", source: "suvka", criterion: "clarezaProposta", score: 6 }),
      score({ businessId: "advogado", source: "chatgpt", criterion: "clarezaProposta", score: 5 }),
    ];
    const report = buildReport(scores);
    const criterion = report.perCriterion.find((c) => c.criterion === "clarezaProposta")!;
    expect(criterion.averages.suvka).toBe(7);
    expect(criterion.averages.chatgpt).toBe(5);
    expect(criterion.averages.claude).toBeNull();
    expect(criterion.averages.gemini).toBeNull();
  });

  it("picks the strict winner among all four sources for a criterion", () => {
    const scores: ScoreRecord[] = [
      score({ source: "suvka", criterion: "probabilidadeConversao", score: 9 }),
      score({ source: "chatgpt", criterion: "probabilidadeConversao", score: 5 }),
      score({ source: "claude", criterion: "probabilidadeConversao", score: 4 }),
      score({ source: "gemini", criterion: "probabilidadeConversao", score: 6 }),
    ];
    const report = buildReport(scores);
    expect(report.perCriterion.find((c) => c.criterion === "probabilidadeConversao")!.winner).toBe("suvka");
  });

  it("lets a fourth source (gemini) win a criterion", () => {
    const scores: ScoreRecord[] = [
      score({ source: "suvka", criterion: "seo", score: 4 }),
      score({ source: "chatgpt", criterion: "seo", score: 5 }),
      score({ source: "claude", criterion: "seo", score: 6 }),
      score({ source: "gemini", criterion: "seo", score: 9 }),
    ];
    const report = buildReport(scores);
    expect(report.perCriterion.find((c) => c.criterion === "seo")!.winner).toBe("gemini");
  });

  it("reports no winner (null) on an exact tie", () => {
    const scores: ScoreRecord[] = [
      score({ source: "suvka", criterion: "estruturaNarrativa", score: 7 }),
      score({ source: "chatgpt", criterion: "estruturaNarrativa", score: 7 }),
    ];
    const report = buildReport(scores);
    expect(report.perCriterion.find((c) => c.criterion === "estruturaNarrativa")!.winner).toBeNull();
  });

  it("computes unweighted overall averages per source across all criteria", () => {
    const scores: ScoreRecord[] = [
      score({ source: "suvka", criterion: "clarezaProposta", score: 10 }),
      score({ source: "suvka", criterion: "probabilidadeConversao", score: 6 }),
    ];
    const report = buildReport(scores);
    expect(report.overall.find((o) => o.source === "suvka")!.overallAverage).toBe(8);
  });

  it("computes a weighted overall average that favors high-weight criteria", () => {
    // seo (weight 0.5) scores low, probabilidadeConversao (weight 1.5) scores high -
    // the weighted average should land above the unweighted one.
    const scores: ScoreRecord[] = [
      score({ source: "suvka", criterion: "seo", score: 2 }),
      score({ source: "suvka", criterion: "probabilidadeConversao", score: 10 }),
    ];
    const report = buildReport(scores);
    const suvka = report.overall.find((o) => o.source === "suvka")!;
    expect(suvka.overallAverage).toBe(6);
    expect(suvka.weightedAverage).toBeCloseTo((2 * 0.5 + 10 * 1.5) / (0.5 + 1.5), 5);
    expect(suvka.weightedAverage!).toBeGreaterThan(suvka.overallAverage!);
  });

  it("flags every criterion Suvka does not strictly win as a loss, with a recommendation", () => {
    const scores: ScoreRecord[] = [
      score({ source: "suvka", criterion: "qualidadeVisual", score: 4 }),
      score({ source: "chatgpt", criterion: "qualidadeVisual", score: 8 }),
    ];
    const report = buildReport(scores);
    expect(report.suvkaLosses).toHaveLength(1);
    expect(report.suvkaLosses[0]).toMatchObject({
      criterion: "qualidadeVisual",
      winner: "chatgpt",
      suvkaAverage: 4,
      winnerAverage: 8,
    });
    expect(report.suvkaLosses[0].recommendation).toContain("VisualEngine");
  });

  it("does not flag a criterion Suvka wins, or a criterion with no data, as a loss", () => {
    const scores: ScoreRecord[] = [
      score({ source: "suvka", criterion: "clarezaProposta", score: 9 }),
      score({ source: "chatgpt", criterion: "clarezaProposta", score: 3 }),
    ];
    const report = buildReport(scores);
    expect(report.suvkaLosses.find((l) => l.criterion === "clarezaProposta")).toBeUndefined();
    expect(report.suvkaLosses.find((l) => l.criterion === "credibilidade")).toBeUndefined();
  });

  it("does not flag a tie as a loss", () => {
    const scores: ScoreRecord[] = [
      score({ source: "suvka", criterion: "confiancaTransmitida", score: 7 }),
      score({ source: "chatgpt", criterion: "confiancaTransmitida", score: 7 }),
    ];
    const report = buildReport(scores);
    expect(report.suvkaLosses.find((l) => l.criterion === "confiancaTransmitida")).toBeUndefined();
  });

  it("gives every one of the 12 criteria a distinct, non-empty recommendation", () => {
    const recommendations = new Set<string>();
    for (const criterion of BENCHMARK_CRITERIA) {
      const report = buildReport([
        score({ source: "suvka", criterion, score: 1 }),
        score({ source: "chatgpt", criterion, score: 9 }),
      ]);
      const loss = report.suvkaLosses.find((l) => l.criterion === criterion)!;
      expect(loss.recommendation.length).toBeGreaterThan(0);
      recommendations.add(loss.recommendation);
    }
    expect(recommendations.size).toBe(BENCHMARK_CRITERIA.length);
  });
});
