# Noctra Benchmark Audit v1

**Role:** independent-investigator review of the Benchmark Framework, run before any
real API call was made. **Goal:** find bias, methodological weaknesses, or any
unintended advantage given to Noctra, fix what's fixable in code, and disclose what
isn't - so the eventual report can be shown to investors without a credible claim that
the test was rigged in Noctra's favor.

**Scope reviewed:** `app/benchmark/businesses.ts`, `genericPrompt.ts`,
`generators/{noctra,chatgptEquivalent,claudeEquivalent,geminiEquivalent,shared}.ts`,
`app/ai/generateLandingPage.ts`, `app/ai/testFixtures.ts` (`neutralStrategyDna`),
`app/components/renderers/SectionRenderer.tsx` and every `*_VARIANTS` fallback,
`scoring.ts`, `app/api/benchmark/*/route.ts`, `app/benchmark/page.tsx`.

**No code changed the actual comparison being made.** Every fix below either closes an
unaudited technical asymmetry (token budget) or a drift risk (duplicated literal lists)
- none of it touches which arm "wins" on the merits of what it writes or designs.

---

## Findings and outcomes

### 1. Token-budget asymmetry between arms — FIXED

The Claude arm explicitly capped generation at `max_tokens: 4096`. Noctra's own call and
the ChatGPT-equivalent arm set no token budget at all, relying on whatever OpenAI's
default happens to be for `gpt-4.1-mini` - unaudited, and not necessarily equal to 4096.
If that default were meaningfully lower, one or two arms could silently truncate a large
landing page's JSON (a parse failure or a missing section) for a reason that has nothing
to do with writing or design quality, and everything to do with an unexamined default.

**Fix:** `app/ai/generateLandingPage.ts` now exports `MAX_OUTPUT_TOKENS = 4096`, a single
constant every arm imports and passes explicitly - Noctra's real call
(`generateLandingPage.ts`, which the benchmark's Noctra adapter also calls, by design),
the ChatGPT-equivalent arm, the Claude arm, and the new Gemini arm. This is a production
fix, not a benchmark-only shim: it protects real user generations from the same silent
truncation risk, and it had to be, because the benchmark's Noctra arm calls the real
production function rather than a second copy of it - patching only a benchmark-local
copy would have reintroduced the "two copies drift" problem this session has hit before.

### 2. `BenchmarkSource` had three independent hardcoded copies — FIXED

`scoring.ts`'s `SOURCES` array, `app/api/benchmark/score/route.ts`'s `isValidScore`
literal check, and `app/benchmark/page.tsx`'s shuffle-label array (`["A","B","C"]`, fixed
at length 3) each spelled out the list of sources independently of the
`BenchmarkSource` type. Adding a fourth source without touching all three would have
silently broken things in different ways for each - `isValidScore` would 400 every
Gemini score submission, `page.tsx` would drop the fourth generation's label
(`undefined`), and neither failure looks like "the benchmark forgot a wire," it looks
like "the tool is broken" or worse, quietly wrong.

**Fix:** `app/benchmark/types.ts` now exports `BENCHMARK_SOURCES` as the single source of
truth (`BenchmarkSource` is derived from it via `(typeof BENCHMARK_SOURCES)[number]`).
`scoring.ts`, the score route, and the report table in `page.tsx` all read from it.

### 3. Business-brief register — REVIEWED, NO ISSUE FOUND

Checked whether the 20 business descriptions (`businesses.ts`) are written in a way that
specifically plays to Noctra's own `BusinessProfileBuilder`/`BusinessIntelligence`
extraction (e.g. front-loading keywords those modules key off of) rather than reading as
a real person's brief. They don't: each is one plain sentence, same register as the
Diversity Engine's stress-test corpus, no industry-jargon stuffing. A savvy marketer
typing a business description into ChatGPT would write something very close to these.

### 4. Rendering baseline for non-Noctra arms — REVIEWED, NO ISSUE FOUND

`generators/shared.ts` renders every non-Noctra arm through `neutralStrategyDna()`
(`app/ai/testFixtures.ts`) - checked its actual values: every continuous field sits at
exactly `0.5`, the true midpoint, not a deliberately-bad strawman baseline. Also checked
every section component's variant fallback (`Features`, `Benefits`, `Testimonials`,
`Stats`, `FAQ`, `Pricing`, `Hero`) - an unrecognized or "default" variant string from a
non-Noctra arm's JSON degrades gracefully to that section's own default component
(`FeaturesGrid`, `HeroSplitLayout`, etc.), never to a blank or broken render.

**Disclosed, not fixed (correctly, by design):** Noctra's own arm renders through its
*actual* computed `StrategyDNA`, not the neutral baseline. This is the one deliberate,
intentional asymmetry in the whole framework - Noctra's Design Engine is part of the
product being tested, and the other arms have no equivalent system to render through.
Already documented in `generators/shared.ts`'s comments and the original Benchmark plan;
restated here so it's explicit in one audit-facing place: **qualidadeVisual,
estruturaNarrativa, and consistenciaMarca scores are not "copy vs. copy" comparisons on
the non-Noctra arms - they also measure whether having a design system at all is worth
having one.** That's the question the benchmark exists to answer, not a bias to remove.

### 5. Sampling and rater bias — DISCLOSED, NOT FIXABLE IN CODE

Two limitations are structural to a v1 tool run by one person, not fixable by changing
code:

- **Single rater, no inter-rater reliability.** Every score in this benchmark comes from
  one person's blind judgment. There's no second grader to compute agreement against.
  Blinding (source hidden until submission) controls for *identity bias* but not for
  *idiosyncratic taste* - a different grader could score differently on genuinely
  subjective criteria (`desejoContinuarLer`, `credibilidade`).
- **Single generation per (business, source) pair.** `store.ts`'s `upsertGeneration`
  keeps exactly one generation per source per business - there's no re-roll, so a single
  unlucky (or lucky) generation stands in for that arm's whole capability on that
  business. No confidence interval is computable from n=1.

**Recommendation for the report itself:** state both limitations explicitly next to the
overall numbers, rather than presenting a single average as a precise measurement. This
is honest framing, not a weakness to hide - a founder-run single-pass blind benchmark is
still far more evidence than zero benchmarks, it just isn't a peer-reviewed trial.

### 6. Model-tier parity across all four arms — CONFIRMED, EXTENDED

Already established for the original three arms (`gpt-4.1-mini` for Noctra + the
ChatGPT-equivalent arm, `claude-haiku-4-5-20251001` for the Claude arm - confirmed with
the user specifically to isolate the pipeline's contribution, not provider flagship
strength). The new Gemini arm follows the same rule: Google's comparably-tiered
"fast/small" model, not their flagship. See `generators/geminiEquivalent.ts`'s header
comment.

### 9. Gemini's hidden "thinking" tokens vs. a fixed shared budget — FOUND LIVE, FIXED

Not something static code review could catch - only surfaced once real credentials were
in place and a live preflight call was run before committing to the full 20-business
spend (exactly the safeguard this preflight step exists for):

- The originally chosen model, `gemini-2.5-flash`, turned out to be retired for new API
  keys (`404 ... no longer available to new users`) - confirmed live, not guessed.
  Replaced with `gemini-3.6-flash`, confirmed via a real `models.list()` call to be the
  current stable (non-preview) flash-tier model on this account.
- `gemini-3.6-flash` spends part of its output-token budget on hidden "thinking" tokens
  before writing any visible text, and rejects `thinkingConfig.thinkingBudget: 0`
  (extended reasoning can't be disabled on this model). Measured live at ~1300 thinking
  tokens for one realistic landing-page generation. Against the then-current 4096-token
  shared budget, that overhead alone could exhaust the budget before any JSON was
  written - silently starving the Gemini arm for a reason having nothing to do with
  writing quality, the same category of unfairness as finding #1, just invisible to
  static review because it depends on a specific model's live runtime behavior.

**Fix:** `MAX_OUTPUT_TOKENS` raised from 4096 to 8192 for every arm (not just Gemini) -
verified live to comfortably cover a real generation's thinking + JSON output with
headroom. Every arm still gets the exact same budget; parity is preserved, just at a
number that's actually large enough for all four models to complete the task.

### 7. Sampling parameters (temperature, etc.) — REVIEWED, NO FIX NEEDED

None of the four arms set an explicit `temperature`. Checked whether this is an
asymmetry: it isn't - it's applied identically (every arm relies on its provider's
default) rather than hand-tuned per arm, which is itself a defensible, symmetric choice
("no arm's sampling was hand-tuned to look better") and was left as-is rather than
introducing a new behavior change to production generation for benchmark-rigor reasons
alone.

### 8. Blind-review order and reveal timing — REVIEWED, NO ISSUE FOUND

`page.tsx`'s `shuffled` list is computed once per business load (`useMemo` keyed on
`generations`), not re-shuffled per criterion or per render, and `record.source` is never
rendered until `revealed` is true (set only after `submit()`'s POST resolves). No timing
or ordering channel leaks source identity before scoring is submitted.

---

## Weighted scoring — new in this audit

The original 12 criteria (headline, clareza, copy, persuasão, cta, storytelling, prova
social, diferenciação, layout, confiança, qualidade visual, coerência) were largely
writing-mechanics criteria. Replaced with a set scoped around what actually predicts
whether a page converts a visitor, per the user's explicit list:

| Criterion | Weight | Why |
|---|---|---|
| Primeira Impressão (3s) | 1.5 | The whole page is wasted if this fails |
| Clareza da Proposta de Valor | 1.5 | Core comprehension - can't persuade what isn't understood |
| Probabilidade de Conversão | 1.5 | The actual target metric of the product |
| Credibilidade | 1.2 | Directly gates willingness to proceed |
| Confiança Transmitida | 1.2 | Same, from the emotional side |
| Qualidade da Oferta | 1.2 | The offer itself, independent of how it's written |
| Desejo de Continuar a Ler | 1.0 | Engagement, one step removed from conversion |
| Qualidade Visual | 1.0 | Necessary but not sufficient on its own |
| Estrutura Narrativa | 1.0 | Composition quality |
| Diferenciação | 1.0 | Matters more in crowded categories than others |
| Consistência da Marca | 0.8 | Real, but a smaller lever than the above |
| SEO | 0.5 | The criterion a blind visual review is worst-equipped to judge fairly |

`scoring.ts`'s `buildReport()` now reports both an unweighted `overallAverage` (every
criterion counts equally) and a `weightedAverage` using this table, so a report reader
can see both "how did it do on average" and "how did it do on what actually matters" -
and audit the weights themselves, since they're a fixed, disclosed lookup, not tuned
after seeing results.

## Fourth arm added: Gemini

`app/benchmark/generators/geminiEquivalent.ts` (model `gemini-3.6-flash`, via
`@google/genai`) - same generic prompt, same JSON schema, same `normalizeGenericOutput`
path, same explicit `MAX_OUTPUT_TOKENS` budget as every other arm. `GEMINI_API_KEY` is
now a third required env var for `/api/benchmark/generate` alongside `OPENAI_API_KEY`
and `ANTHROPIC_API_KEY`. See finding #9 for why the model choice and shared token budget
both changed after the live preflight, not before.

---

## Verdict

No finding required withholding the benchmark or redesigning its core methodology - the
two concrete bugs (#1 token budget, #2 hardcoded source lists) are fixed; the disclosed
items (#3-#8) are either confirmed non-issues or structural limitations of a v1,
single-rater tool that belong in the report's framing, not in the code. **The framework
is ready for the first real run**, pending the standing authorization requirements:
`ANTHROPIC_API_KEY` and `GEMINI_API_KEY` in `.env.local`, and explicit go-ahead for
~80 real paid generations (20 businesses × 4 sources).
