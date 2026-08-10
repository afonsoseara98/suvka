"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useSession } from "next-auth/react";
import Landing from "@/app/components/Landing";
import { fromLandingPage } from "@/app/editor/pageState";
import { BENCHMARK_BUSINESSES } from "./businesses";
import { BENCHMARK_CRITERIA, BENCHMARK_SOURCES, type BenchmarkCriterion, type BenchmarkSource, type GenerationRecord } from "./types";
import type { BenchmarkReport } from "./scoring";

const CRITERION_LABELS: Record<BenchmarkCriterion, string> = {
  primeiraImpressao: "Primeira Impressão (3s)",
  clarezaProposta: "Clareza da Proposta de Valor",
  credibilidade: "Credibilidade",
  confiancaTransmitida: "Confiança Transmitida",
  desejoContinuarLer: "Desejo de Continuar a Ler",
  qualidadeVisual: "Qualidade Visual",
  estruturaNarrativa: "Estrutura Narrativa",
  diferenciacao: "Diferenciação",
  qualidadeOferta: "Qualidade da Oferta",
  probabilidadeConversao: "Probabilidade de Conversão",
  seo: "SEO",
  consistenciaMarca: "Consistência da Marca",
};

const SOURCE_LABELS: Record<BenchmarkSource, string> = {
  noctra: "Noctra",
  chatgpt: "ChatGPT (prompt excelente)",
  claude: "Claude (prompt excelente)",
  gemini: "Gemini (prompt excelente)",
};

const REVIEW_LABELS = ["A", "B", "C", "D"] as const;

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Functional, not polished - an internal research tool, same precedent as the sign-in
// form built during the persistence-layer pass. Nothing here ever calls a real LLM
// itself; it only triggers /api/benchmark/generate, which does, and only when a person
// clicks the button.
export default function BenchmarkPage() {
  // AN INTERNAL TOOL SHOULD NOT HAVE A PUBLIC ADDRESS
  //
  // The four benchmark APIs behind this all require a session, so nothing leaked to a
  // stranger - but "a session" is any restaurant owner who signed up, and this page is our
  // own competitive scoring against ChatGPT, Claude and Gemini. A customer stumbling into
  // it is a bad afternoon that costs nothing to prevent.
  //
  // NODE_ENV is inlined at build time, so in a production bundle this is an unconditional
  // 404. The dev preview routes next door already do exactly this.
  if (process.env.NODE_ENV === "production") notFound();

  const { status } = useSession();
  const [tab, setTab] = useState<"setup" | "review" | "report">("setup");

  if (status === "loading") {
    return <main className="min-h-screen bg-black p-12 text-white">Loading...</main>;
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-black p-12 text-white">
        <p>
          Sign in required. Go to <Link className="underline" href="/">the homepage</Link> to sign in first.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-12 text-white">
      <h1 className="text-3xl font-bold">Noctra Benchmark v1</h1>
      <p className="mt-2 text-zinc-400">
        Noctra vs. um prompt excelente ao ChatGPT vs. Claude vs. Gemini, para os mesmos 20 negócios.
      </p>

      <div className="mt-8 flex gap-2 border-b border-zinc-800">
        {(["setup", "review", "report"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? "border-b-2 border-white font-semibold" : "text-zinc-500"}`}
          >
            {t === "setup" ? "1. Gerar" : t === "review" ? "2. Avaliar (blind)" : "3. Relatório"}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "setup" && <SetupTab />}
        {tab === "review" && <ReviewTab />}
        {tab === "report" && <ReportTab />}
      </div>
    </main>
  );
}

function SetupTab() {
  const [status, setStatus] = useState<Record<string, "idle" | "generating" | "done" | "error">>({});

  async function generate(businessId: string) {
    setStatus((s) => ({ ...s, [businessId]: "generating" }));
    try {
      const response = await fetch("/api/benchmark/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      setStatus((s) => ({ ...s, [businessId]: response.ok ? "done" : "error" }));
    } catch {
      setStatus((s) => ({ ...s, [businessId]: "error" }));
    }
  }

  return (
    <div className="space-y-2">
      {BENCHMARK_BUSINESSES.map((business) => (
        <div key={business.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
          <div>
            <div className="font-semibold">{business.label}</div>
            <div className="text-sm text-zinc-500">{business.prompt}</div>
          </div>
          <button
            onClick={() => generate(business.id)}
            disabled={status[business.id] === "generating"}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {status[business.id] === "generating"
              ? "A gerar (Noctra + ChatGPT + Claude + Gemini)..."
              : status[business.id] === "done"
                ? "Gerado ✓"
                : status[business.id] === "error"
                  ? "Erro - tentar de novo"
                  : "Gerar"}
          </button>
        </div>
      ))}
    </div>
  );
}

function ReviewTab() {
  const [businessId, setBusinessId] = useState<string>(BENCHMARK_BUSINESSES[0].id);

  return (
    <div>
      <select
        value={businessId}
        onChange={(e) => setBusinessId(e.target.value)}
        className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
      >
        {BENCHMARK_BUSINESSES.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>

      {/* key={businessId} remounts this whole subtree on business change, so its local
          scoring/reveal state resets for free - no imperative setState-in-effect reset
          needed. */}
      <BusinessReview key={businessId} businessId={businessId} />
    </div>
  );
}

function BusinessReview({ businessId }: { businessId: string }) {
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/benchmark/generations?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => setGenerations(data.generations ?? []));
  }, [businessId]);

  // Shuffled once per load, not on every render - position never leaks identity
  // (source is only shown after scores are submitted for this business).
  const shuffled = useMemo(
    () => shuffle(generations).map((record, index) => ({ label: REVIEW_LABELS[index], record })),
    [generations]
  );

  function setScore(label: string, criterion: BenchmarkCriterion, value: number) {
    setScores((s) => ({ ...s, [`${label}-${criterion}`]: value }));
  }

  async function submit() {
    setSubmitting(true);
    const items = shuffled.flatMap(({ label, record }) =>
      BENCHMARK_CRITERIA.map((criterion) => ({
        businessId,
        source: record.source,
        criterion,
        score: scores[`${label}-${criterion}`] ?? 0,
      }))
    );

    await fetch("/api/benchmark/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });

    setSubmitting(false);
    setRevealed(true);
  }

  return (
    <>
      {shuffled.length === 0 && <p className="mt-4 text-zinc-500">Ainda não há gerações para este negócio.</p>}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">
        {shuffled.map(({ label, record }) => (
          <div key={label} className="rounded-2xl border border-zinc-800">
            <div className="border-b border-zinc-800 px-4 py-3 font-bold">
              Geração {label}
              {revealed && <span className="ml-2 font-normal text-zinc-400">({SOURCE_LABELS[record.source]})</span>}
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {/* The one caller the card was designed for: twenty specimens side by side,
                  where a border is what separates one from the next. */}
              <Landing state={fromLandingPage(record.landingPage)} framed />
            </div>

            <div className="space-y-2 border-t border-zinc-800 p-4">
              {BENCHMARK_CRITERIA.map((criterion) => (
                <div key={criterion} className="flex items-center justify-between text-sm">
                  <label htmlFor={`${label}-${criterion}`}>{CRITERION_LABELS[criterion]}</label>
                  <input
                    id={`${label}-${criterion}`}
                    type="number"
                    min={0}
                    max={10}
                    value={scores[`${label}-${criterion}`] ?? ""}
                    onChange={(e) => setScore(label, criterion, Number(e.target.value))}
                    className="w-16 rounded border border-zinc-800 bg-black px-2 py-1 text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {shuffled.length > 0 && !revealed && (
        <button
          onClick={submit}
          disabled={submitting}
          className="mt-6 rounded-lg bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
        >
          {submitting ? "A guardar..." : "Submeter pontuações"}
        </button>
      )}
    </>
  );
}

function ReportTab() {
  const [report, setReport] = useState<BenchmarkReport | null>(null);

  useEffect(() => {
    fetch("/api/benchmark/report")
      .then((r) => r.json())
      .then(setReport);
  }, []);

  if (!report) return <p className="text-zinc-500">A carregar...</p>;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-bold">Média geral por fonte</h2>
        <p className="mt-1 text-sm text-zinc-500">
          &ldquo;Ponderada&rdquo; pesa mais probabilidade de conversão, primeira impressão e clareza da proposta de
          valor - ver docs/noctra-benchmark-audit-v1.md para os pesos exatos por critério.
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500">
              <th className="py-2">Fonte</th>
              <th className="py-2 text-right">Média simples</th>
              <th className="py-2 text-right">Média ponderada</th>
            </tr>
          </thead>
          <tbody>
            {report.overall.map((o) => (
              <tr key={o.source} className="border-b border-zinc-800">
                <td className="py-2">{SOURCE_LABELS[o.source]}</td>
                <td className="py-2 text-right font-mono">{o.overallAverage?.toFixed(2) ?? "—"}</td>
                <td className="py-2 text-right font-mono font-semibold">{o.weightedAverage?.toFixed(2) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-xl font-bold">Por critério</h2>
        <div className="overflow-x-auto">
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="py-2">Critério</th>
                {BENCHMARK_SOURCES.map((source) => (
                  <th key={source} className="py-2 text-right">
                    {SOURCE_LABELS[source]}
                  </th>
                ))}
                <th className="py-2 text-right">Vencedor</th>
              </tr>
            </thead>
            <tbody>
              {report.perCriterion.map((c) => (
                <tr key={c.criterion} className="border-b border-zinc-800">
                  <td className="py-2">{CRITERION_LABELS[c.criterion]}</td>
                  {BENCHMARK_SOURCES.map((source) => (
                    <td
                      key={source}
                      className={`py-2 text-right font-mono ${c.winner === source ? "text-emerald-400" : ""}`}
                    >
                      {c.averages[source]?.toFixed(2) ?? "—"}
                    </td>
                  ))}
                  <td className="py-2 text-right">{c.winner ? SOURCE_LABELS[c.winner] : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Onde o Noctra perde - recomendações</h2>
        {report.noctraLosses.length === 0 ? (
          <p className="mt-2 text-emerald-400">Noctra ganha ou empata em todos os critérios com dados.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {report.noctraLosses.map((loss) => (
              <li key={loss.criterion} className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <div className="font-semibold">
                  {CRITERION_LABELS[loss.criterion]}: {SOURCE_LABELS[loss.winner]} ganha ({loss.winnerAverage.toFixed(2)} vs.{" "}
                  {loss.noctraAverage?.toFixed(2) ?? "—"})
                </div>
                <div className="mt-1 text-sm text-zinc-400">{loss.recommendation}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
