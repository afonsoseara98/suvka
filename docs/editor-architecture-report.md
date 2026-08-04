# Editor Foundation Report — Project, PageState, Operations, History

This is the foundation for evolving Noctra from a single-page generator into a full
website editor + AI co-pilot: a `Project` (one or more pages, shared brand/business
context/assets) built on top of a canonical page model, a typed operation/reducer
system, and operation-log-based undo/redo per page — all built, fully tested, and wired
into the live render path. No visual editor UI exists yet; this is deliberately just the
ground it will stand on. New code lives entirely under `app/editor/`.

## What was built

| File | Responsibility |
|---|---|
| `app/editor/project.ts` | `Project`/`ProjectPage`/`Asset` types, page add/remove/rename/reorder, brand/business-profile/settings updates, `projectFromLandingPage` |
| `app/editor/pageState.ts` | `PageState`/`SectionInstance` types, `fromLandingPage`/`toLandingPage` adapters, `mergeDna` |
| `app/editor/operations.ts` | `Operation` union (13 kinds) + `applyOperation` pure reducer |
| `app/editor/history.ts` | `PageHistory`, `dispatch`/`dispatchBatch`, `undo`/`redo`/`goToVersion` |
| `app/components/Landing.tsx` | renders one page's `PageState` directly, filters hidden sections |
| `app/components/renderers/SectionRenderer.tsx` | renders one `SectionInstance`, resolves per-section theme overrides |
| `app/api/generate/route.ts` | now also returns the already-computed `businessProfile` alongside the page (no new OpenAI call) |
| `app/page.tsx` | builds a `Project` from the generation result via `projectFromLandingPage` |

136 new tests (`project.test.ts`, `pageState.test.ts`, `operations.test.ts`,
`history.test.ts`, plus extensions to `SectionRenderer.test.tsx` and a new
`Landing.test.tsx`). Full suite: 352 tests passing, `tsc --noEmit` clean, `next build`
clean. Nothing under `app/ai/*` was touched, and `app/api/generate/route.ts` gained
exactly one additive line — the generation pipeline still produces a `LandingPage`
exactly as before; `projectFromLandingPage()` is the one seam where it becomes a
project.

## The core idea

Everything downstream — a future editor UI, an AI co-pilot, eventually multiple people
editing together — goes through exactly one door:

```
Operation  →  applyOperation(state, operation)  →  new PageState
```

Nothing else in the codebase is allowed to construct a `PageState` by hand-editing
`sections`/`dna`. That single-door property is what makes the rest of this report true.

## The Project layer

Everything above describes editing *one page*. A real website is more than one page
sharing a business identity, a brand, and (eventually) a shared asset library — which
`LandingPage`/`PageState` alone can't express (there's exactly one `dna`, one `site`, no
concept of "this project has 4 pages"). `Project` (`app/editor/project.ts`) is that next
layer, added before any UI was built on top of the single-page version specifically to
avoid rebuilding the UI's data-fetching/state shape once multi-page became real work
instead of a "later" idea:

```ts
interface Project {
  id: string;
  name: string;
  businessProfile: BusinessProfile;   // reused from app/ai/types, not duplicated
  brand: BrandingData;                // reused from app/types/landing.ts, not duplicated
  assets: readonly Asset[];
  pages: readonly ProjectPage[];      // { id, name, slug, history: PageHistory }
  settings: ProjectSettings;
}
```

Two deliberate choices worth calling out:

- **Every field reuses an existing type** (`BusinessProfile`, `BrandingData`) rather than
  inventing a parallel one — a project's business identity is the same concept the AI
  pipeline already computes; its brand is the same shape a page's `site.branding` already
  carries. `projectFromLandingPage()` seeds `Project.brand` from the generated page's own
  `site.branding` today, since there's no independent project-level brand step yet - a
  documented bridge, not a permanent source of truth once pages can have different
  origins (imported, duplicated, hand-built).
- **No project-level undo/redo was added.** Each `ProjectPage` keeps its own full
  `PageHistory` — the exact per-section undo/redo engine above, reused verbatim, not
  duplicated — because that's where the frequent, fine-grained edits actually happen.
  Project-level changes (rename, swap brand color, add a page) are plain, pure,
  independently-tested functions (`addPage`, `renamePage`, `updateBrand`, ...) rather
  than a second parallel Operation/History system. If project-level history turns out to
  be wanted later, wrapping these functions is all that changes — `Project`'s shape
  doesn't need to move.

## How this supports visual editing

A future editor UI never needs its own mutation logic. Clicking "hide this section"
constructs `{ kind: "HideSection", sectionId }` and calls `dispatch(history, op, "user",
"Hid stats section")` — the same call shape for every interaction: dragging a section
constructs `MoveSection`, changing a dropdown constructs `ChangeVariant`, typing new copy
constructs `UpdateContent`. The UI's job shrinks to "turn this interaction into the right
Operation," never "figure out how to update the page correctly" — `applyOperation`
already knows the invariants (can't delete the last hero, a locked section rejects
edits, indices clamp instead of crashing).

## How this supports AI editing

An AI co-pilot's job is identical in shape to the UI's: given a page and an instruction
("make the hero bolder, and hide the FAQ"), it emits `Operation` JSON — here, plausibly:

```ts
dispatchBatch(
  history,
  [
    { kind: "ChangeSectionTheme", sectionId: "hero-0", themeOverrides: { saturation: 0.9, accentIntensity: 0.8 } },
    { kind: "HideSection", sectionId: "faq-6" },
  ],
  "ai",
  "Made hero bolder, hid FAQ"
);
```

Three things fall out of this for free, not as extra work:
- **AI can't corrupt state in a way the UI couldn't also produce** — there is no
  AI-specific write path, only `applyOperation`, so every invariant that protects a
  human's edits protects an AI's edits identically.
- **Every AI action is automatically undoable, and reviewable before it even applies** —
  `dispatchBatch`'s whole point is that a multi-step AI instruction reverts as one
  `undo()`, not N. Because an AI's proposed change is just an array of `Operation`
  objects (inspectable data, not an opaque side effect), a future UI can just as easily
  render it as a diff/preview and let the user accept, reject, or edit individual
  operations before `dispatchBatch` is ever called.
- **Every AI action is attributed** — `OperationRecord.actor: "ai"` and (on the
  instances it touches) `metadata.createdBy: "ai"` are set automatically, so a person
  can always see which parts of the page an AI changed vs. wrote by hand.

`RegenerateSection` exists as a distinct operation kind from `UpdateContent`
specifically so this attribution survives even when an AI's change happens to look
identical to a manual edit — "AI regenerated this" and "user retyped this" are different
facts worth keeping separate in history, even though the reducer applies them the same
way.

## How this supports collaboration (not built, but not blocked either)

`OperationRecord` is already the right unit for a future real-time transport: small,
serializable, timestamped, attributed to an actor. A collaboration layer would broadcast
`OperationRecord`s between clients instead of diffing full pages — each client applies
the same operation through the same `applyOperation`, so two clients that received the
same operations end up in the same state (the core correctness property any OT/CRDT
system needs, and one this reducer already has for free, since it's pure and
deterministic). `SectionInstance.version` is a ready-made per-section optimistic-
concurrency check ("has anyone touched this since I loaded it?") without needing to
diff the whole page.

None of this is implemented — there's no transport, no conflict resolution for two
*simultaneous* edits to the same field. But the data model doesn't need to change to add
it later; only a new consumer of `OperationRecord` does.

## What this unlocks next (concretely, not speculatively)

- **Multiple pages per project**: `addPage`/`removePage`/`renamePage`/`reorderPages`
  already exist and are tested — a future "New Page" button in the editor calls
  `addPage(project, { id, name, slug, state })` with a fresh or AI-generated `PageState`
  and the project now has an About/Pricing/Contact page, each with its own independent
  undo/redo.
- **Global branding editor**: `updateBrand(project, { primaryColor: "..." })` already
  updates the one shared `BrandingData` every page's theme could read from - the
  reducer/update exists; only a settings-panel UI calling it is missing.
- **Shared asset library**: `Asset`/`addAsset`/`removeAsset` are already typed and
  tested, ready for an upload/generate flow to populate.
- **Project-aware AI**: an AI co-pilot reasoning about one section today only sees that
  section's content; with `Project` in hand it can be given `businessProfile`/`brand`/
  the full `pages` list as context, so "match the tone of my About page" or "keep this
  consistent with my brand colors" becomes answerable instead of structurally
  impossible.
- **Full-site publishing**: `ProjectSettings.publishing` (`domain`, `published`) is
  already part of the shape - a publish flow has somewhere real to write to instead of
  needing a schema change to exist at all.
- **Version history UI**: `PageHistory.records` (with `actor`/`label`/`timestamp`) is
  already a listable log; `goToVersion(history, i)` jumps straight to any past state.
- **Reviewable AI suggestions**: an AI proposes a `dispatchBatch`-shaped array of
  operations; a UI can render a diff/preview of what each one would change before
  calling `dispatchBatch` for real.
- **Partial regeneration**: `RegenerateSection` already exists as a reducer contract —
  what's missing is a future API route that scopes a prompt to one section (reusing
  `PromptBuilder.ts`'s machinery) instead of the whole page, and produces the `content`
  that operation applies.
- **Per-section visual identity**: `ChangeSectionTheme`/`themeOverrides` let one section
  (a CTA banner, say) diverge from the page's theme without a full re-theme.
  `SectionRenderer.tsx` already recompiles `theme`/`layout` from the merged DNA whenever
  an instance has a non-empty override.
- **Templates/duplication**: `DuplicateSection` plus `metadata.createdBy: "template"`
  (already how `fromLandingPage` marks pipeline output) is the seed of a future
  section-template library.

## What was explicitly deferred

- **The visual editor UI itself** — no new user-facing surface was added. `app/page.tsx`
  now keeps a `Project` instead of a raw `LandingPage`, but nothing yet calls
  `dispatch`/`undo`/`redo`/`addPage`/`updateBrand` from a click handler.
- **A real multi-page generation flow** — today's `/api/generate` still only ever
  produces one page ("Landing"); `projectFromLandingPage()` wraps that single page in a
  project of one. Generating an About/Pricing/Contact page on demand needs its own
  (future, scoped) prompt/pipeline call, not a data-model change.
- **Project-level undo/redo** — deliberately not built (see "The Project layer" above);
  only per-page history exists today.
- **Live `RegenerateSection` LLM wiring** — the operation's reducer contract exists;
  the API route that would call OpenAI to produce a section's new content does not, per
  the standing rule against live OpenAI calls in this pass.
- **Collaboration transport** — see above.
- **`PipelineBuilder.ts` emitting operations** — generation still produces a flat
  `LandingPage`; `fromLandingPage()`/`projectFromLandingPage()` bridge it into the
  editable model after the fact rather than the pipeline constructing `SectionInstance`s
  directly. Revisiting this only makes sense once there's a real second producer of
  operations (the AI co-pilot) to unify against.

## Bug found and fixed along the way

While rewriting `SectionRenderer.tsx`, its `"stats"` and `"faq"` cases were found to
never forward `section.variant` to the `<Stats>`/`<FAQ>` components — both always
rendered their default variant no matter what `SectionPlanner.ts` chose. This meant the
`stats: "inline"` and `faq: "twoColumn"` variants added earlier this session (Diversity
Engine work) were computed correctly but **never actually reached the rendered page**.
The rewrite forwards `instance.variant` uniformly to every section type that accepts
one, and `SectionRenderer.test.tsx` now has explicit regression tests
(`actually renders stats:inline` / `actually renders faq:twoColumn`) asserting the
variant-specific markup is present, not just that *a* variant of that type renders.
