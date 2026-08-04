# Diversity Engine — Before/After Report

Generated from a 100-prompt, no-API stress test (`app/ai/builders/DiversityStressTest.test.ts`).
`buildPipeline()` never calls OpenAI — it only produces the structured Landing JSON shape
(design family, hero variant, section order/variants), so every number below comes from
pure, deterministic function calls, not live generations.

**Before** = commit `5cc253c` ("Replace every categorical rendering decision with a
continuous StrategyDNA"), the last commit before the diversity engine (design seed,
design families, phase-order variants) existed.
**After** = current tree, including this session's fixes.

## Root causes fixed

1. **Phase-order collapse** — only 4 narrative orderings existed. A large share of
   plain-worded prompts land on near-identical `CompositionSignals` (no distinguishing
   lexicon hits), and with only 4 buckets that cluster produced one single section
   sequence for ~40% of all pages. Added `valueFirst`/`contextHeavy` (6 total) —
   `LayoutIntelligence.ts`.
2. **Hero variant unreachable states** — `heroVariantFor` used hard thresholds on
   `heroSplitLean`, which clusters tightly around 0.45–0.55 for most realistic
   businesses. `"minimal"` never fired across 100 samples; `"split"` fired for ~11%.
   Rewritten as a fit-scored, seeded weighted pick — `LayoutIntelligence.ts`.
3. **Upstream signal convergence in BusinessIntelligence** — the deepest cause behind
   both of the above: most primary BI dimensions default to `NEUTRAL` (0.45) unless a
   prompt happens to hit one of a narrow, marketing-copy-flavored keyword list
   (`"luxury"`, `"bespoke"`, `"white-glove"`...) or the industry classifier (9
   industries, narrow keyword lists, falls to `"generic"` otherwise). Real users don't
   write that way. Fixed at the source in `BusinessIntelligence.ts`/
   `BusinessProfileBuilder.ts` (details below) rather than only patching the downstream
   symptoms in (1) and (2).

## Additional diversity-engine work this session

- **Broadened `LEXICON`** in `BusinessIntelligence.ts` — every primary dimension gained
  natural, everyday synonyms (e.g. pricePositioning: `"top-tier"`, `"handcrafted"`,
  `"wallet-friendly"`, `"bargain"`; decisionComplexity: `"onboarding"`, `"plug and
  play"`; riskPerception: `"no obligation"`, `"high-stakes"`...) so a plain prompt with
  no rare marketing words still diverges from NEUTRAL.
- **5 new industries** (`beauty`, `home_services`, `consulting`, `automotive`, `events`)
  added to `BusinessProfileBuilder.ts` + `BusinessIntelligence.ts`'s `INDUSTRY_PRIOR` —
  everyday small-business categories (salons, plumbers, consultants, mechanics, event
  planners) that previously always fell to `"generic"` no matter how they were phrased.
- **Fixed a known classification bug**: "A digital marketing agency helping restaurant
  owners increase online orders" scored a 5–5 tie between `agency` and `restaurant` and
  lost on tie-break order. Added `"agency"` as its own primary keyword (was previously
  only multi-word phrases like `"marketing agency"`) — now a clean 10–5 win. The test
  that documented this as a known limitation is un-skipped and passing.
- **Extended the combinatorial space further**: `benefits` had exactly one variant per
  prominence bucket (zero diversity, ever). Added a `minimal` numbered two-column
  treatment (`Benefits.tsx`) alongside `cards`, family-weighted the same way
  `stats`/`faq` already were.
- **Fixed a real runtime bug found along the way**: `FAQ.tsx`'s new accordion state
  (`useState`) had no `"use client"` directive, which crashes any Server Component route
  that renders it (`Error: ... useState ... only available in Client Components`).

## Before/after numbers (100-prompt corpus, identical corpus both runs)

| Metric | Before | After |
|---|---|---|
| Industry classification hit-rate (non-generic) | 35% | 59% |
| Design family concept | *(didn't exist)* | 8 families, top family = 17% share |
| Hero variant distribution | `centered` 92%, `split` 8%, `minimal` **0%** | `centered` 70%, `split` 20%, `minimal` 10% — **all 3 reachable** |
| Distinct section sequences / 100 prompts | 3 | 20 |
| Distinct full fingerprints / 100 prompts (family + hero + sequence + every section's variant) | 5 | **100** |
| Near-duplicate pairs producing an identical page (10 pairs tested) | **10 / 10** | **0 / 10** |

The single clearest number: 10 pairs of near-identical prompts ("a personal trainer
helping busy professionals get in shape" vs. "...get in shape and build strength")
produced **byte-identical structural fingerprints in every case, before**. After: **zero**
of the 10 pairs collide, while all 10 still land in the same industry (the consistency
half of the claim).

## Concrete example: consistent but distinct

Three pairs, `after` state, in full:

**"We run a small bakery downtown..."** (both classify `generic` — no bakery vertical was
added; deliberately, see Known Limitations)
| | Prompt A | Prompt B (+"for weddings") |
|---|---|---|
| Design family | editorial | corporate |
| Hero | centered | minimal |
| Sections | hero→testimonials→features(alternating)→benefits(minimal)→stats(cards)→pricing→faq(accordion)→footer | hero(minimal)→faq(twoColumn)→features(grid)→benefits(minimal)→stats(inline)→testimonials→pricing→footer |

**"A SaaS tool that helps small teams track their projects..."** (both classify `startup`)
| | Prompt A | Prompt B (+"and deadlines") |
|---|---|---|
| Design family | highEndAgency | bold |
| Hero | centered | split |
| Sections | hero→testimonials→features(alternating)→benefits(cards)→stats→pricing(simple)→faq(twoColumn)→footer | hero(split)→features(alternating)→benefits(cards)→stats→testimonials(spotlight)→pricing(comparison)→faq(accordion)→footer |

**"An independent real estate agent..."** (both classify `real_estate`)
| | Prompt A | Prompt B (+"their first") |
|---|---|---|
| Design family | bold | editorial |
| Hero | centered | centered |
| Sections | hero→testimonials(spotlight)→features(bento)→benefits(minimal)→stats(inline)→pricing(comparison)→faq(accordion)→cta→footer | hero→features(alternating)→benefits(cards)→stats(inline)→pricing(simple)→testimonials(spotlight)→faq(twoColumn)→cta→footer |

Same read of the business (industry, and in every case a coherent, signal-appropriate
page); genuinely different pages.

## Regression tests added

`app/ai/builders/DiversityRegression.test.ts` — a permanent CI gate (not just the
one-off report) asserting, over the same 100-prompt corpus:
- design family top-share < 40% (measured: 17%)
- hero variant top-share < 90%, all 3 variants reachable (measured: 70%, 3/3)
- section-sequence distinct-rate > 10% (measured: 20%; baseline was 3%)
- full-fingerprint distinct-rate > 80% (measured: 100%; baseline was 5%)
- industry hit-rate > 45% (measured: 59%; baseline was 35%)
- **every** near-duplicate pair: same industry, never an identical fingerprint (hard
  per-pair check, not just a corpus-wide average that could hide one collapsed pair)
- full determinism (same corpus → byte-identical report across runs)

All 247 existing tests plus this session's new/updated tests pass; `tsc --noEmit` is clean.

## Known limitations (documented on purpose, not fixed here)

- **`sectionSequenceDistinctRate` is 20%, not higher.** Businesses in the same vertical
  legitimately share narrative logic — some convergence is correct, not a bug. The
  `fullFingerprintDistinctRate` (100%) is the more honest "does this look like one
  generator's house style" measure, since design family + hero + every section's own
  variant are part of what a visitor actually sees.
- **Bakery/café is not a new industry.** Folding it into `restaurant`'s keyword list
  would misclassify it (wrong `priceLevel`/`primaryGoal` prior for a bakery vs. a
  sit-down restaurant); adding it as its own vertical was judged out of scope for this
  pass given the 5 verticals already added. It still gets a real, non-generic read from
  the broadened lexicon (see the bakery example above — the two variants of that prompt
  still diverge meaningfully) even while `industry` stays `generic`.
- **`resolveKnowledge()` in `KnowledgeResolver.ts` silently falls back to
  `startupKnowledge` for any industry without a dedicated knowledge file** — that's
  `agency`, `real_estate`, `ecommerce`, `education`, `generic`, and now also this
  session's 5 new industries. This is a pre-existing gap in the Psychology/Knowledge
  engine, not the Diversity Engine this pass covers, and none of today's changes made it
  worse (the 5 new industries just inherit the same fallback the existing 5 already had)
  — flagging it here since it's real and adjacent, not fixing it in this pass.
