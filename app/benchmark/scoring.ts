import {
  BENCHMARK_CRITERIA,
  BENCHMARK_SOURCES,
  CRITERION_WEIGHTS,
  type BenchmarkCriterion,
  type BenchmarkSource,
  type ScoreRecord,
} from "./types";

export interface CriterionAverage {
  criterion: BenchmarkCriterion;
  averages: Record<BenchmarkSource, number | null>;
  // The source with the strictly highest average for this criterion - null if there's
  // no data yet, or a tie (a tie is not a loss for Suvka, so it's never reported as one).
  winner: BenchmarkSource | null;
}

export interface SourceAverage {
  source: BenchmarkSource;
  // Unweighted mean across every scored criterion - every criterion counts equally.
  overallAverage: number | null;
  // CRITERION_WEIGHTS-weighted mean - probabilidadeConversao/primeiraImpressao/
  // clarezaProposta count more than seo. This is the number that should actually decide
  // "who won," per Benchmark Audit v1 - a page can look fine on every minor criterion
  // and still lose on the ones that predict real conversion.
  weightedAverage: number | null;
}

export interface SuvkaLoss {
  criterion: BenchmarkCriterion;
  winner: BenchmarkSource;
  suvkaAverage: number | null;
  winnerAverage: number;
  recommendation: string;
}

export interface BenchmarkReport {
  perCriterion: CriterionAverage[];
  overall: SourceAverage[];
  // Every criterion where Suvka is NOT the (strict) winner, paired with a recommendation
  // pointing at the module most likely responsible - mirrors the user's own examples
  // ("perder em headline -> voltar ao PromptBuilder").
  suvkaLosses: SuvkaLoss[];
}

// One module pointer per criterion - deliberately a flat, fixed lookup (not itself
// data-driven) so a human reading a report always gets the same, predictable next step
// for a given weak criterion. Rewritten alongside the Benchmark Audit v1 criteria
// replacement - each entry now points at the module actually responsible for that
// specific outcome, not a renamed copy of the old criterion's recommendation.
const RECOMMENDATIONS: Record<BenchmarkCriterion, string> = {
  primeiraImpressao:
    "Revisitar Hero.tsx/HeroSplitLayout.tsx e a StrategyDNA (heroImageryProminence/heroSplitLean) - os primeiros 3 segundos são inteiramente uma decisão de layout+copy do hero.",
  clarezaProposta:
    "Revisitar PromptBuilder.ts/system.ts - a clareza da proposta de valor pode precisar de instruções mais diretas sobre o que a headline+subtítulo devem comunicar.",
  credibilidade: "Revisitar TrustEngine.ts/PsychologyAnalyzer.ts (trustFactors) e authorityEmphasis na StrategyDNA.",
  confiancaTransmitida: "Revisitar TrustEngine.ts - trustNeed/objectionPressure decidem quanta prova é mostrada antes do pedido.",
  desejoContinuarLer:
    "Revisitar OfferBuilder.ts/PsychologyAnalyzer.ts - o desejo de continuar a ler nasce de pains/desires bem escolhidos e de uma progressão de secções que gera curiosidade.",
  qualidadeVisual: "Revisitar VisualEngine.ts/DesignFamily.ts - a qualidade visual depende da StrategyDNA computada.",
  estruturaNarrativa:
    "Revisitar LayoutIntelligence.ts (ordem e prominence das secções) - a estrutura narrativa é uma decisão de composição, não só de copy.",
  diferenciacao: "Revisitar BusinessIntelligence.ts - diferenciação vem de um perfil de negócio mais específico, não genérico.",
  qualidadeOferta: "Revisitar OfferBuilder.ts - a formulação da oferta (framing, garantias, riskReductionAngle) decide esta pontuação.",
  probabilidadeConversao:
    "Revisitar CTAEngine.ts/PricingEngine.ts e ctaCountFor - esta é a métrica-alvo do produto; uma perda aqui é a mais prioritária de todas.",
  seo: "Revisitar SiteData/SEOData no PromptBuilder.ts - title/description/keywords específicos ao negócio, não genéricos.",
  consistenciaMarca: "Revisitar DesignFamily.ts/VisualEngine.ts - tom, cor e voz devem manter-se coerentes secção a secção.",
};

export function average(scores: readonly number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function weightedAverage(scoresByCriterion: ReadonlyMap<BenchmarkCriterion, number>): number | null {
  if (scoresByCriterion.size === 0) return null;
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [criterion, score] of scoresByCriterion) {
    const weight = CRITERION_WEIGHTS[criterion];
    weightedSum += score * weight;
    weightTotal += weight;
  }
  return weightTotal === 0 ? null : weightedSum / weightTotal;
}

function scoresFor(scores: readonly ScoreRecord[], source: BenchmarkSource, criterion?: BenchmarkCriterion): number[] {
  return scores
    .filter((s) => s.source === source && (criterion === undefined || s.criterion === criterion))
    .map((s) => s.score);
}

// One average per criterion per source (not per individual score) - a business with two
// scores for the same (source, criterion) shouldn't let that criterion double-count
// relative to one with a single score.
function criterionAveragesFor(scores: readonly ScoreRecord[], source: BenchmarkSource): Map<BenchmarkCriterion, number> {
  const map = new Map<BenchmarkCriterion, number>();
  for (const criterion of BENCHMARK_CRITERIA) {
    const avg = average(scoresFor(scores, source, criterion));
    if (avg !== null) map.set(criterion, avg);
  }
  return map;
}

function pickWinner(averages: Record<BenchmarkSource, number | null>): BenchmarkSource | null {
  const entries = BENCHMARK_SOURCES.map((source) => [source, averages[source]] as const).filter(
    (entry): entry is [BenchmarkSource, number] => entry[1] !== null
  );

  if (entries.length === 0) return null;

  const max = Math.max(...entries.map(([, value]) => value));
  const winners = entries.filter(([, value]) => value === max);

  return winners.length === 1 ? winners[0][0] : null;
}

export function buildReport(scores: readonly ScoreRecord[]): BenchmarkReport {
  const perCriterion: CriterionAverage[] = BENCHMARK_CRITERIA.map((criterion) => {
    const averages = Object.fromEntries(
      BENCHMARK_SOURCES.map((source) => [source, average(scoresFor(scores, source, criterion))])
    ) as Record<BenchmarkSource, number | null>;

    return { criterion, averages, winner: pickWinner(averages) };
  });

  const overall: SourceAverage[] = BENCHMARK_SOURCES.map((source) => {
    const perCriterionAverages = criterionAveragesFor(scores, source);
    return {
      source,
      overallAverage: average(scoresFor(scores, source)),
      weightedAverage: weightedAverage(perCriterionAverages),
    };
  });

  const suvkaLosses: SuvkaLoss[] = perCriterion
    .filter((c) => c.winner !== null && c.winner !== "suvka")
    .map((c) => ({
      criterion: c.criterion,
      winner: c.winner as BenchmarkSource,
      suvkaAverage: c.averages.suvka,
      winnerAverage: c.averages[c.winner as BenchmarkSource] as number,
      recommendation: RECOMMENDATIONS[c.criterion],
    }));

  return { perCriterion, overall, suvkaLosses };
}
