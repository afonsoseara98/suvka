import type { LandingPage } from "@/app/types/landing";

// The single source of truth for "which sources exist" - scoring.ts, the review UI
// (app/benchmark/page.tsx), and the score API route (app/api/benchmark/score/route.ts)
// all derive from this instead of each keeping their own literal list. Benchmark Audit
// v1 flagged the three independent copies that existed before this as a drift risk
// (adding "gemini" to the type without updating a hardcoded check elsewhere would have
// silently 400'd every Gemini score submission) - the exact "two copies drift" failure
// mode this session has hit before (schema.ts, applyOperation).
export const BENCHMARK_SOURCES = ["noctra", "chatgpt", "claude", "gemini"] as const;
export type BenchmarkSource = (typeof BENCHMARK_SOURCES)[number];

// Benchmark Audit v1: replaced the original 12 (headline/clareza/copy/...) with a
// criteria set scoped around what actually predicts whether a landing page converts -
// first impression, message clarity, trust signals, narrative structure, and the
// business outcome itself (probabilidadeConversao) - rather than surface writing
// mechanics alone. See docs/noctra-benchmark-audit-v1.md.
export const BENCHMARK_CRITERIA = [
  "primeiraImpressao",
  "clarezaProposta",
  "credibilidade",
  "confiancaTransmitida",
  "desejoContinuarLer",
  "qualidadeVisual",
  "estruturaNarrativa",
  "diferenciacao",
  "qualidadeOferta",
  "probabilidadeConversao",
  "seo",
  "consistenciaMarca",
] as const;

export type BenchmarkCriterion = (typeof BENCHMARK_CRITERIA)[number];

// Not every criterion should move the overall score equally - probabilidadeConversao
// (the actual business outcome) and the two "does the page even work" criteria
// (primeiraImpressao, clarezaProposta) are weighted highest; seo is weighted lowest
// because it's the one criterion a blind visual/textual review is least equipped to
// judge fairly (real SEO quality depends on live meta tags/site structure a rendered
// preview doesn't fully expose). Weights are a fixed, disclosed lookup - not
// data-driven - so a report reader can audit exactly how "overall" was computed.
export const CRITERION_WEIGHTS: Record<BenchmarkCriterion, number> = {
  primeiraImpressao: 1.5,
  clarezaProposta: 1.5,
  credibilidade: 1.2,
  confiancaTransmitida: 1.2,
  desejoContinuarLer: 1,
  qualidadeVisual: 1,
  estruturaNarrativa: 1,
  diferenciacao: 1,
  qualidadeOferta: 1.2,
  probabilidadeConversao: 1.5,
  seo: 0.5,
  consistenciaMarca: 0.8,
};

// One generation for one (business, source) pair. `landingPage` is always in the same
// shape regardless of source - see app/benchmark/generators/*.ts and
// docs/ (Benchmark plan) §A4: ChatGPT/Claude output is asked for the same JSON schema
// Noctra's SCHEMA_PROMPT uses, specifically so every arm renders through the exact same
// Landing/SectionRenderer components with no source-specific render logic.
export interface GenerationRecord {
  businessId: string;
  source: BenchmarkSource;
  promptUsed: string;
  model: string;
  landingPage: LandingPage;
  createdAt: string;
}

export interface ScoreRecord {
  businessId: string;
  source: BenchmarkSource;
  criterion: BenchmarkCriterion;
  score: number;
  scoredAt: string;
}
