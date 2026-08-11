# Suvka UX Audit v1

**Method:** walked every page in the real product flow (Landing → Sign Up → Login →
Dashboard → New Project → Editor) as a first-time user, in a real browser against the
real database — not code review. Signed up a fresh account, hit real validation errors,
seeded two projects (via the persistence API directly, at zero LLM cost, so the audit
didn't require a paid generation), exercised rename/delete/search, and read the dev
console on every screen. Test account and both projects were deleted afterward; the
database is back to empty.

**Not in scope:** actual interactive editing (`/editor/[id]` is deliberately view-only
right now — see the last session's note on scope), publishing, and anything past the
current flow. This is an audit of what exists today, not a wishlist.

---

## Findings, in priority order

### 1. `/new` is a dead end — no way back to the Dashboard

Once you click "New Project," there is no navigation of any kind on that page — no
logo, no breadcrumb, no "← Dashboard" link. The only way out is the browser's Back
button. Someone who opens `/new`, changes their mind, or just wants to check their
existing projects first has no in-product way to do that. This is the single highest-
priority finding: it's the exact kind of thing that makes a product feel unfinished
even when everything underneath it works.

### 2. No sign-out, anywhere

There is no user menu, no avatar, no "Sign out" link on any page. Once logged in,
there's no way to log out except clearing cookies. Combined with #1, there is currently
**zero persistent navigation anywhere in the authenticated app** - every page is an
island reachable only by a specific action (a redirect, a link from one specific other
page) or a typed URL.

### 3. No identity anywhere in the UI

Nothing on `/dashboard`, `/new`, or `/editor/[id]` shows who you're signed in as (name,
email, avatar). For a product whose entire pitch this session is "a real SaaS with
accounts," there's currently no visible confirmation you're in your own account at all.

### 4. Every new project defaults to the literal name "Untitled Project"

Confirmed live: generate a few pages without renaming and the Dashboard fills with
identical "Untitled Project" rows, indistinguishable until opened. This undermines the
Dashboard's whole purpose (find your projects at a glance) for exactly the user who
hasn't yet learned to rename things - i.e., every new user. Should default to something
derived from the generation itself (the business name from `businessProfile`, or the
hero title) rather than a static string.

### 5. Dashboard list order goes stale after a rename

Reproduced live: rename the second project in the list. "Last edited" correctly updates
to "Just now," but the row **stays in its old position** until a full page reload -
`app/dashboard/page.tsx` patches the renamed project in place (`.map()`) instead of
re-sorting after the optimistic update. The list's own stated ordering promise ("most
recently edited first," which the initial `GET /api/projects` response honors) silently
breaks after the first in-place edit. Small, but a real, easily-reproduced inconsistency
between what the UI claims and what it shows.

### 6. Clicking "Generate" with an empty prompt does nothing - no feedback at all

Confirmed live: empty input, click "Generate," and literally nothing happens - no error
text, no shake, no disabled-state hint, not even a console warning. `generateLandingPage()`
just returns silently (`if (!prompt.trim()) return;`). A first-time user who
misclicks or is still reading the placeholder text gets no signal that their click did
nothing.

### 7. Password requirements are only disclosed after you fail them

The signup form never hints at a minimum password length. Try `"ab"` and you get a
real, correct error ("Password must be at least 8 characters") - but only after
submitting. A one-line hint under the field (or inline validation) would remove this
one guaranteed first-attempt failure for most new users.

### 8. `/new`'s hero repeats the pre-login marketing pitch, with no framing for why you're there

The same "🚀 AI Landing Page Generator / Landing Pages that actually convert" copy
that greets an anonymous visitor on `/` is shown again, verbatim, to someone who already
signed up specifically to use the product. There's no "Dashboard → New Project"
breadcrumb, no acknowledgment of context. It reads like a landing page pasted into an
internal tool, not a purpose-built "create" screen.

### 9. `/editor/[id]` doesn't say it's view-only

The page is a real, working, persistent view of a saved project - but nothing on it
communicates that it's intentionally non-interactive right now. A user will very
reasonably try to click text, drag a section, or look for an edit affordance, get no
response of any kind, and reasonably conclude the app is broken or unfinished, rather
than understanding "the visual editor isn't built yet." This is the biggest single
"feels unfinished" risk in the current flow, and it's a one-line fix (a badge or note:
"Editing coming soon" / "View mode").

### 10. Renderer has no defensive fallback for malformed theme data (low priority)

While seeding a test project via a hand-written fixture (not a real generation), an
intentionally-incomplete `dna: {}` produced a real console error - `NaN is an invalid
value for the opacity CSS style property` in `app/components/ui/GlowBackground.tsx:47`.
**This does not affect real users today** - `buildPipeline()` always produces a
complete, valid `StrategyDNA`, so no real generation can hit this. Flagged only as
technical debt worth a defensive fallback (`?? 0.5` on the relevant field) before this
renderer is ever fed data from a source other than the pipeline itself (e.g. a future
partial-migration or hand-edited project).

### Not a finding: browser-extension hydration warnings

Every page showed a React hydration warning in the dev console mentioning
`data-lt-installed="true"`. Confirmed this is caused by the LanguageTool browser
extension installed in the test browser injecting attributes into `<html>` before
React hydrates - not an app bug (`suppressHydrationWarning` is already set on the
relevant element). Noting it only so it isn't mistaken for a real issue if you see the
same "N Issues" badge while testing yourself with extensions installed.

---

## What already works well (confirmed live, not assumed)

- Signup → auto-login → redirect to Dashboard is seamless, zero friction.
- Server-side validation errors (weak password, wrong login) surface correctly and
  legibly.
- Rename (inline, Enter-to-save) and Delete (two-step "Confirm delete?" / "Cancel," no
  native browser dialog) are both clean, discoverable, and behave correctly.
- Search filters correctly and only appears once there's something to search.
- Empty states (no projects yet) are well-designed with a clear, single CTA.
- The full lifecycle - create, list, open, rename, delete - works with zero errors
  against the real database.

## Recommendation

Highest-leverage fixes, in order: **#1 (no way back to Dashboard) and #2/#3 (no
sign-out, no identity)** are the three that most directly make the app feel like
disconnected pages rather than one product - likely worth a single small shared nav
header across every authenticated page, which would resolve all three at once. **#9**
(editor doesn't announce it's view-only) is the cheapest fix with the highest
"feels unfinished" payoff. #4-#8 are real but smaller. #10 is debt, not a bug - fix
opportunistically, not urgently.

Not fixing anything yet, per your instruction - this is the audit only.
