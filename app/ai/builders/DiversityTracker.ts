import { computeDiversityScore, type GenerationFingerprint } from "./DiversityScore";

// ANTI-REPETITION (IN-MEMORY)
//
// Caveat, stated plainly: this is module-level, in-process state - it resets on server
// restart and is never shared across serverless instances/replicas. A real cross-
// request, cross-deploy anti-repetition memory would need persistent storage (a
// database), which is explicitly out of scope for Suvka today (see
// SUVKA_CONSTITUTION.md - auth/payments/DB are deferred). This is the honest version
// of the mechanism that's actually buildable without that: it catches repetition
// within a single running server process, which is exactly the case that matters most
// in practice (a user generating several pages back-to-back in one session/demo).
//
// Two separate stores, deliberately not one, because they answer different questions
// with different correctness requirements:
//   - `recentWindow` (bounded, small) - "what did we just generate, that a NEW prompt
//     shouldn't collide with." A rolling window is exactly right here: comparing a new
//     page against something generated 10,000 requests ago isn't "repetition" in any
//     meaningful sense a person would notice.
//   - `retriesByPrompt` (unbounded for the life of the process) - "how many times did
//     THIS EXACT prompt need recomposing, the first time we ever saw it." This has to
//     be remembered forever (not just recently), because PipelineBuilder.ts replays
//     that exact count for a repeated prompt to stay deterministic - if this were
//     bounded and a popular prompt's entry got evicted, a repeat of it could recompute
//     a different retry count than its first generation used, silently returning a
//     different page for the identical input. Each entry is tiny (a few numbers and
//     short strings), so unbounded growth here is an acceptable memory/determinism
//     tradeoff for this app's scale - a production deployment generating millions of
//     distinct prompts per process lifetime would want this backed by a real store
//     instead, which is the same "needs a database" boundary as the rolling window.
const RECENT_WINDOW_SIZE = 20;
export const MIN_ACCEPTABLE_DIVERSITY = 0.25;
export const MAX_RECOMPOSE_ATTEMPTS = 3;

interface HistoryEntry {
  promptHash: number;
  fingerprint: GenerationFingerprint;
  retries: number;
}

let recentWindow: HistoryEntry[] = [];
let retriesByPrompt = new Map<number, HistoryEntry>();

// The full history entry for a prompt hash already seen in this process (however long
// ago), or null if this is genuinely new. PipelineBuilder.ts uses this to replay the
// exact same recompose count a repeated prompt used the first time, rather than
// re-running collision detection against a recent window that has since moved on.
export function findExisting(promptHash: number): HistoryEntry | null {
  return retriesByPrompt.get(promptHash) ?? null;
}

// Returns the most similar entry in the RECENT window that falls below the acceptable
// diversity floor, or null if none does. Read-only: does not mutate state, so a caller
// can check multiple candidate fingerprints (recompose attempts) before deciding which
// one to actually remember.
export function findTooSimilar(fingerprint: GenerationFingerprint): HistoryEntry | null {
  let closest: HistoryEntry | null = null;
  let closestScore = Infinity;

  for (const entry of recentWindow) {
    const score = computeDiversityScore(entry.fingerprint, fingerprint);
    if (score < MIN_ACCEPTABLE_DIVERSITY && score < closestScore) {
      closest = entry;
      closestScore = score;
    }
  }

  return closest;
}

export function remember(promptHash: number, fingerprint: GenerationFingerprint, retries: number): void {
  const entry: HistoryEntry = { promptHash, fingerprint, retries };

  retriesByPrompt.set(promptHash, entry);
  recentWindow = [...recentWindow.filter((existing) => existing.promptHash !== promptHash), entry].slice(
    -RECENT_WINDOW_SIZE
  );
}

// Test-only escape hatch - the module-level state would otherwise leak between test
// cases (and between unrelated requests in a long-running process, which is
// intentional in production but not in a test suite asserting specific collisions).
export function resetDiversityHistory(): void {
  recentWindow = [];
  retriesByPrompt = new Map();
}
