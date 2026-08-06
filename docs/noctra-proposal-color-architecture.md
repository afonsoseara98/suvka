# Proposal — the colour model blocks the quality bar

**Status:** awaiting decision. Nothing implemented.

## The measurement

Compiled the current theme for all 20 benchmark businesses and read back what the visitor
actually sees:

| | result |
|---|---|
| accent magenta/pink | **17 / 20** |
| accent purple | 2 / 20 |
| accent red | 1 / 20 |
| accent **blue** | **0 / 20** |
| background in the muddy 20–80% lightness band | **20 / 20** |

A family law firm — wills, estate planning, bereaved families — renders a dusty lilac page
with a hot magenta headline and a fluorescent pink "Book Your Free Consultation" button.
A restaurant renders the same mauve. So does a plumber, an architect and a hotel.

Not one business in twenty gets blue, the most common colour in professional web design.
Not one gets a near-white or near-black background, which is what every real site uses.

## Why — and why it is architectural, not a tuning problem

Two lines in `app/styles/theme.ts` produce all of it.

```ts
hueFromTemperature = 225 + colorTemperature * 165   // blue 225 -> magenta 307 -> red 390
bgLightness        = lerp(3, 92, brightness)        // near-black -> near-white
```

Both are linear interpolations across a continuous axis. Both are correct in isolation.
Both fail for the same reason:

**`colorTemperature` and `brightness` cluster in the middle.** Measured: 17 of 20
businesses fall between 0.44 and 0.64. That is not a defect in the analysers — it is what
happens when a score is built by blending an industry prior with lexicon signals. Scores
regress to the middle.

**The middle of both scales is the worst place to be.** The midpoint of the hue arc is 307
— magenta. The midpoint of the lightness scale is ~48% — a mid-grey background, the one
region no professional website occupies. Blue is only reachable at `colorTemperature ≈ 0`,
which nothing produces.

So the architecture concentrates the entire customer base onto the single least
professional palette available, by construction. Turning knobs cannot fix it: the
distribution's centre of mass would have to be moved off the middle of the axis, and the
middle of the axis is where a blended score always lands.

The deeper premise is the real problem:

> **Design space is not convex.** The midpoint between two good palettes is usually a bad
> palette. Linear interpolation assumes every point between two valid designs is valid.
> For spacing, radius, type scale and elevation that assumption holds. For colour it does
> not: halfway between a good dark theme and a good light theme is not a mediocre theme,
> it is an unusable one.

This is why the codebase's own comment in `theme.ts` already records patching a contrast
bug at mid-brightness with a forced ±55 lightness offset. That patch guarantees text stays
legible. It cannot make the result attractive, because the background it is compensating
for should never have been generated.

## What I propose

Keep the compiler. Keep determinism. Keep DNA-derived. Change what is interpolated.

**1. Anchored palettes, continuous within an anchor.**
Define a small set (6–8) of coherent, hand-verified palette regions — deep navy + warm
gold, near-white editorial + ink, charcoal + electric blue, warm cream + terracotta, and
so on. Each carries a DNA signature. A business selects the **nearest anchor in DNA
space**, then the DNA continues to modulate saturation, contrast, accent intensity and
depth *within* that anchor's safe range.

This is not the industry lookup table the architecture correctly deleted: anchors are
chosen by DNA distance, never by industry label, so two businesses in the same industry
can land on different anchors and two in different industries can share one. Determinism
and continuity are preserved. What changes is that interpolation now happens **inside a
region known to be good**, never across the whole space.

**2. Background lightness becomes bimodal.**
A threshold picks light mode (94–98%) or dark mode (6–11%), then the DNA modulates within
that band. There is no such thing as a 50%-lightness website, so the compiler should be
incapable of emitting one.

**3. Restore blue.**
Fixing the arc so blue is reachable at ordinary mid-range inputs is worth doing regardless
of whether anchors are adopted — it is a straightforward bug.

## Cost, risk, alternative

**Cost:** confined to the colour half of `compileTheme`, plus its tests and re-verification
across the 20 businesses. Roughly one file. No change to the pipeline, the DNA, the
renderer, the editor or publishing. Frozen published snapshots are unaffected — they store
DNA and recompile, so they simply improve.

**Risk:** the visible one is homogeneity. Eight anchors could make pages look like eight
templates. Mitigated by continuous modulation inside each anchor and by the 26 other axes
that already drive layout, spacing, type and structure — but it must be *verified*, on all
20, not assumed. If the 20 pages read as eight templates, the anchor count goes up or the
in-anchor range widens.

**Alternative considered and rejected:** re-centre the existing axes so the mid-range maps
to a better hue. Cheaper, but it only moves which single colour everyone gets. It leaves
the muddy-background problem untouched and leaves the convexity assumption in place, so
the next quality ceiling arrives immediately.

## What I need

A decision on the anchor approach. If yes, I implement it, regenerate all 20, and bring
side-by-side screenshots before any commit.
