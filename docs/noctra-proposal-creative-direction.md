# Proposal — Creative Direction

**Status:** awaiting decision. Nothing implemented.

**Short version:** the layer already exists, it is selecting well, and it still cannot make
two pages feel different. The gap is not a missing layer — it is that a creative direction
is currently only allowed to speak in adjectives, never in nouns.

---

## 1. The layer is already there

`app/ai/engines/DesignFamily.ts` defines eight named directions — minimal, editorial,
bold, corporate, playful, elegant, highEndAgency, startupDashboard — each fit-scored
against the business and applied as additive offsets to the DNA. `PipelineBuilder` calls
`resolveDesignFamily` then `applyDesignFamily` on every generation.

Measured across the 20 benchmark businesses:

| family | count | examples |
|---|---|---|
| bold | 5/20 | advogado, dentista, fotografo, eletricista, ecommerce |
| minimal | 5/20 | restaurante, imobiliaria, psicologo, estetica, arquitetura |
| startupDashboard | 4/20 | agencia, consultor, hotel, fisioterapia |
| elegant | 2/20 | canalizador, coaching |
| highEndAgency | 1/20 | barbeiro |
| playful | 1/20 | wedding-planner |
| corporate | 1/20 | saas |
| editorial | 1/20 | ginasio |

**8 of 8 families in use.** No cluster, no dead entry, no regression to a single default.
Selection is not the problem. This is important, because it means the fix is not "choose
better" and not "add a layer" — both would leave the actual cause untouched.

## 2. Why it makes no visible difference

A direction may currently adjust exactly ten fields:

```
density  roundedness  decorationDensity  saturation  contentWidth
elevation  typeScale  typeWeight  accentIntensity  colorTemperature
```

Every one of them is a **continuous style modifier**. Not one of them changes what the
page *is*. The offsets then land in compilers that map them into deliberately narrow
ranges — radius `lerp(2,10)`, spacing `lerp(28,64)` — so a ±0.25 push moves a corner by a
few pixels and a gap by a few more.

So `bold` and `minimal` differ in saturation and decoration, and produce: the same centered
hero, the same card grid, the same column widths, the same vertical rhythm, the same CTA in
the same place. Which is precisely what is visible in the contact sheet.

**The structural fields are not in the adjustment set at all.** `heroSplitLean`,
`heroImageryProminence` and `sectionWeight` — the three that decide page shape — cannot be
touched by any direction.

And the consequence compounds. Hero layout is chosen by
`heroVariantFor(heroSplitLean, priceEmphasis, ...)`, and measured over the corpus those are
the two most compressed axes in the entire DNA:

```
heroSplitLean   sd 0.102   (weak)
priceEmphasis   sd 0.055   (dead - 6 distinct values across 20 businesses)
```

The single most visible structural decision on the page is made by the two weakest signals
we have, and no creative direction is permitted to override them. That is the whole
explanation for hero centered 15/20.

## 3. Where the layer belongs

The proposed diagram places Creative Direction *between DNA and Renderer*. I would put it
*before* DNA, which is where it already sits:

```
Business -> BusinessIntelligence -> CreativeDirection -> StrategyDNA -> Renderer
```

Reason: the renderer consumes DNA and only DNA, and that is a property worth keeping. A
layer after the DNA means every compiler — theme, layout, sections, hero — grows a second
input and a second reason to change. A layer before it means widening one type and one
function, and every compiler improves for free without knowing anything happened.

The correction is therefore not to move the layer. It is to **widen what a direction is
allowed to decide**.

## 4. What a direction should be able to commit to

Today: ten continuous nudges. Proposed: the same nudges, plus a small set of genuinely
structural commitments that the renderer already knows how to honour —

- **Hero archetype** — centered / split / minimal / full-bleed image, decided by the
  direction rather than by `heroSplitLean`'s compressed value. `editorial` should be able
  to insist on an asymmetric hero; `minimal` on a text-only one.
- **Content shape** — whether proof arrives as cards, as a quiet list, as a single
  full-width quote, or as a table. Right now everything is a card because the components
  offer nothing else at direction level.
- **Width strategy** — a direction should be able to commit to a narrow editorial column
  or an edge-to-edge canvas, and to vary width *between sections*. Today one
  `contentWidth` governs the whole page, which is why every page measures the same.
- **Vertical rhythm** — whether sections breathe evenly or alternate tight/open. Today
  `rhythm` is per-section but drawn from the same distribution every time.
- **Section weighting** — `sectionWeight` is already continuous and already gates which
  sections appear; letting a direction bias it would let `minimal` genuinely drop sections
  that `bold` keeps.

This is the same move that fixed colour: stop interpolating one shared point, and let a
named region commit to a coherent configuration, with the DNA still modulating inside it.

## 5. On sub-directions per industry

The brief proposes directions like "rustic Italian" vs "luxury Italian", "boutique law" vs
"corporate law". I would resist naming them by industry. The moment a direction is called
"Italian Rustic", the pipeline has an industry lookup table again — the exact thing the
architecture spent its existence removing, and the thing that made every dentist identical
before.

The same expressive range is available without it: "rustic Italian" is warm neutrals, low
density, heavy type, photography-forward, asymmetric, low decoration. That is a
*configuration*, and it is reachable from business signals — price positioning, emotional
weight, visual importance — without ever naming a cuisine. Two Italian restaurants at
opposite ends of `pricePositioning` should land on different directions because their
signals differ, not because someone wrote a rule about Italian food.

So: more directions, yes. Structural power for each, yes. Industry-named directions, no.

## 6. What I would need to decide next, and the honest risk

The measurement in section 2 says structural power is the binding constraint. But it also
says the signals feeding structure are the weakest we produce. Widening what a direction
may decide does not help if the fit scores that choose the direction are themselves
compressed — and unlike the ten style axes, I have not yet measured how well-separated the
family fit scores are.

That is the one thing I would measure before writing any code, because it decides the
order of work:

- if fit scores separate cleanly, widen the directions first;
- if they do not, the analysers have to come first after all, and widening directions
  would only produce eight ways of looking the same.

## 7. Recommendation

1. Measure the separation of family fit scores across the corpus. Cheap, decisive, no LLM.
2. Widen `DesignFamily` to carry structural commitments, not only continuous offsets.
3. Give the hero its archetype from the direction instead of from the two weakest axes in
   the DNA.
4. Re-render the contact sheet and judge, before anything is committed.

Nothing here requires a new layer, a renderer rewrite, or a change to how the DNA reaches
the compilers.

---

# MEASUREMENT — the fit scores (added after the proposal above)

Section 6 named the one thing to measure before writing code: whether the fit scores that
choose a design family separate cleanly, or are compressed like the style axes.

**They are compressed, and worse than that, the selection is a lottery.**

`resolveDesignFamily` draws from `seededPick(random, fit^3)` — a weighted random draw, not
an argmax. Sweeping 400 seeds per business, holding the business fixed:

```
mean share of the winning family : 22%    (12.5% = pure lottery, 100% = signal decides)
mean entropy                     : 2.87 bits of a possible 3.00 (uniform over 8)
businesses where the seed decides: 20/20
real seed disagrees with best fit: 18/20
```

2.87 of 3.00 bits is 96% of maximum entropy. The effective number of choices is 2^2.87 ≈
7.3 — the draw is spreading almost uniformly over seven of the eight families. The code's
stated intent was that "most businesses genuinely suit two or three visual languages";
in practice they suit all eight equally, because the raw fits are close enough that cubing
them still leaves near-parity.

**A business's creative direction is therefore not derived from the business.** 18 of 20
did not receive their own best-fitting family. Two identical briefs would produce unrelated
directions.

## This corrects the earlier conclusion in section 1

The proposal above reported "8 of 8 families in use, healthy distribution, selection is not
the problem." That reading was wrong. The distribution is healthy because the draw is
random, not because the businesses differ.

Holding the seed's influence out and taking each business's best fit gives the distribution
the signal alone would produce:

```
signal alone            what the corpus actually gets
  corporate       8/20    bold              5/20
  playful         5/20    minimal           5/20
  highEndAgency   3/20    startupDashboard  4/20
  minimal         2/20    elegant           2/20
  startupDashboard 1/20   highEndAgency     1/20
  elegant         1/20    playful           1/20
                          corporate         1/20
                          editorial         1/20
```

The signal clusters — `corporate` for a lawyer, a dentist, a psychologist, an electrician,
a plumber, a consultant, a coach and a physiotherapist. Eight unrelated businesses, one
direction.

## The consequence for sequencing

There are two separate defects, and the order matters more than usual because **the
randomness is currently masking the compression**.

1. The draw is a lottery (entropy 2.87/3.00).
2. The fit scores underneath it are compressed (best-fit clusters 8/20 on one family).

Fixing (1) alone — making selection deterministic, which is a few lines — would make the
output visibly **worse**: eight of twenty businesses would become `corporate` together.
The noise is presently doing the diversity work that the signal should be doing.

So the fit scores are not healthy, and by the decision rule agreed beforehand, the
analysers come first. Widening the structural power of design families before that would
buy eight richer ways of looking the same, and would land on a business by lottery.

## Revised order of work

1. **Analysers.** Decompress the signals that feed both the fit scores and the structural
   axes. The known-dead ones are `priceEmphasis` (sd 0.055), `proofDensity` (0.057),
   `priceAnchoring` (0.060); the weak-but-load-bearing ones are `heroSplitLean` (0.102),
   `brightness` (0.091), `emotionalIntensity` (0.099), `colorTemperature` (0.104).
2. **Selection.** Only once fits separate, replace the lottery with a dominance-respecting
   choice — keeping a seeded tie-break for genuine near-parity, which is the honest case
   the current design was reaching for.
3. **Structural power.** Then widen what a direction may commit to (section 4 above).
4. Re-render the contact sheet and judge, before anything is committed.
