# CTO Decision Log

One entry per decision that changed what we build or deliberately did not build. The
"not built" entries matter as much as the built ones: they are the record of what was
considered and rejected, so the same idea does not get re-litigated from scratch.

Test applied to every candidate:

1. Does this significantly increase the value of Noctra?
2. Does it bring us closer to real customers?
3. Does it create an advantage that is hard to copy?
4. Is it worth more than everything else we could do today?

---

## M1 - Visual Identity (built)

**Decision.** Make a generated page look like it belongs to the business it describes.

**Evidence that forced it.** Running the pipeline over the 20-business benchmark corpus,
the previous rule - `imageStyleFor(heroImageryProminence, complexity)` - sent **13 of 20**
businesses to a fake analytics dashboard and **19 of 20** to one of two fake software
mockups. A wedding planner, a dentist, a photographer and a barber all rendered a SaaS
screenshot. The hero of a published bakery page contained a fake browser window with grey
placeholder bars and the literal text `yourbusiness.com`.

The root cause was vocabulary, not tuning. The only words the visual layer knew -
`dashboard`, `analytics`, `product`, `phone`, `website`, `abstract` - describe software
product shots. No input could ever have produced "bread". Every other part of the pipeline
compiles from `StrategyDNA`; the visual layer had no equivalent, so it keyed on two
abstract axes that carry no information about what the business is.

**Why it beat everything else.** Publishing was finished, auth works, persistence works,
the editor works. All of it serves a page nobody would show to a customer. The binding
constraint on value was not another feature; it was whether the output is good enough to
publish. Nothing else moves adoption or conversion while the answer is no.

---

## Stock image provider - Pexels chosen on license, not catalogue (built, inert)

Noctra publishes **commercial** sites for paying customers. A generated page carrying a
CC-BY photo whose attribution the customer never saw hands them a legal exposure they did
not ask for. Pexels permits commercial use with no attribution required; Unsplash is
similar; Wikimedia and Openverse are not. Attribution is captured and rendered anyway -
being entitled to omit it is not a reason to.

The provider sits behind `ImageProvider` (`app/lib/images/types.ts`) so the vendor stays
reversible, and resolution happens once at generation time and is frozen into the page,
so a published site never depends on a third party still answering.

**Status: live.** Key configured in `.env.local` (gitignored via `.env*`). Measured over
the 20-business corpus: 19 of 19 photo-treatment businesses resolve, 0 misses, ~400ms per
lookup.

Two defects surfaced only by running against the real API, both now fixed:

- **Wrong dimensions.** Pexels' named `src` variants are fixed-size crops (`large2x` is
  always 940x650), not scaled originals. Reporting `photo.width/height` described a file
  we never serve - a 4256x4256 original behind a 940x650 crop reserved a square layout box
  for a landscape image, defeating the whole point of carrying dimensions.
- **Competitors shared photographs.** The subject is a function of the industry, so every
  dentist asked the same question and - taking the top result - got the same picture. One
  photo was shared by three medical businesses, another by both trades: 14 distinct images
  across 19 businesses. `VisualIntent.variantSeed`, folded from the business's own
  continuous DNA axes, now picks among 15 candidates. 18 distinct across 19, and stable
  per business across regenerations (a random pick would have made each regeneration look
  like instability rather than variety).

---

## Not built: new industries for hotel, photographer, architecture

**Status:** 3 of 20 benchmark businesses still classify as `generic` and receive a generic
workplace photograph. A hotel getting "professional at work in a bright modern workspace"
is wrong.

**Why not now.** Adding an `Industry` value touches the enum, the classifier lexicon, the
classification priority list, the industry priors in `BusinessIntelligence.ts`, and the
visual vocabulary. The priors feed `StrategyDNA`, which feeds every compiled style on the
page - so the blast radius is the whole rendering, not just the photograph. That is a
larger, riskier change than the lexicon additions that recovered `estetica` and
`psicologo`, and it should be done as its own milestone with its own verification.

**Cost estimate:** ~5 files, plus re-verification of the full 20-business corpus.

---

## Not built: AI image generation

Rejected against stock photography on cost, latency and consistency: roughly $0.04-0.08
per image and 5-15 seconds each, against a free, instant lookup. Generation already makes
the user wait on an LLM call; adding three image generations to that is the difference
between a product that feels fast and one that does not. Revisit only if stock photography
proves visibly generic to real users.

---

## Not built: custom domains

The obvious paid upgrade, and worth building - but not before the page at `/s/slug` is
worth pointing a domain at. Sequencing, not rejection.

---

## Not built: payments

There is no reason to charge yet and no user to charge. Premature.

---

## Deferred: scoring the benchmark

80 generations are collected and sitting in `benchmark-results/`; zero have been scored.
The strategic claim - that Noctra beats an excellent prompt given directly to an LLM - is
still unproven.

Deliberately deferred past M1 for one reason: `qualidadeVisual` is one of the 12 criteria,
and until this milestone every Noctra page rendered a fake software mockup. Scoring would
have spent real money measuring a defect already visible by reading the code. The corpus
should be regenerated after images are live, then scored.

---

## Process note: what the test suite cannot see

Two defects in this milestone were invisible to 685 passing tests and were found only by
loading a real published page:

- The duplicated headline. Two separately-rendered valid strings; nothing about it is
  detectably wrong from inside the code.
- `Functions cannot be passed directly to Client Components`. The suite renders
  everything client-side, so it cannot observe the RSC boundary at all.

Both were caught by looking at the product. Neither would have been caught by writing more
tests. The rule this establishes: **every milestone ends with a real page loaded in a real
browser**, not with a green suite.
