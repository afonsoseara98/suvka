// Shared scorer behind every "pick the best-matching option" decision in this engine
// layer (Narrative Engine's archetype choice, Visual Engine's style choice) - written
// once so the two never carry independently-drifting copies of the same distance
// math. This is the mechanism that replaces "if industry === X" tables: instead of a
// hardcoded answer per industry, every candidate option declares an ideal SIGNAL
// FINGERPRINT (a partial set of dimension -> ideal value), and whichever option's
// fingerprint the business's actual signals are closest to wins. Industry never enters
// this function at all - it only ever shows up upstream, as one of several inputs that
// shaped BusinessIntelligenceProfile's priors in the first place.

// A dimension's ideal value, either as a bare number (implicit weight 1 - "this
// dimension matters the same as any other") or as {target, weight} when one dimension
// is a meaningfully stronger signal for this option than the others (e.g. pricePositioning
// for the "luxury" style - see DesignPlanner.ts). Plain numbers stay the common case;
// weighting is opt-in, not required at every call site.
export type FingerprintEntry = number | { target: number; weight: number };

export interface SignalFingerprint {
  [dimension: string]: FingerprintEntry;
}

function targetOf(entry: FingerprintEntry): number {
  return typeof entry === "number" ? entry : entry.target;
}

function weightOf(entry: FingerprintEntry): number {
  return typeof entry === "number" ? 1 : entry.weight;
}

// bias is a small, explicit nudge - never a substitute for the fingerprint match. It
// exists for legitimate non-industry facts a fingerprint alone can't express (e.g.
// "this business's primaryGoal is literally to take bookings" - see the goal bias in
// ArchetypeResolver.ts), and it's deliberately kept small enough that a strong
// fingerprint mismatch can still overrule it.
export function pickBestMatch<TOption extends string>(
  fingerprints: Record<TOption, SignalFingerprint>,
  actual: Record<string, number>,
  bias: Partial<Record<TOption, number>> = {}
): TOption {
  let best: TOption | null = null;
  let bestScore = -Infinity;

  for (const option of Object.keys(fingerprints) as TOption[]) {
    const fingerprint = fingerprints[option];
    const dimensions = Object.keys(fingerprint);
    const totalWeight = dimensions.reduce((sum, dim) => sum + weightOf(fingerprint[dim]), 0);

    const distance =
      dimensions.length === 0
        ? 0.5
        : dimensions.reduce((sum, dim) => {
            const entry = fingerprint[dim];
            return sum + weightOf(entry) * Math.abs((actual[dim] ?? 0.5) - targetOf(entry));
          }, 0) / totalWeight;

    const score = 1 - distance + (bias[option] ?? 0);

    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }

  // Every call site passes a non-empty fingerprints record (a real, non-empty option
  // enum), so the loop above always runs at least once and best is always assigned.
  return best as TOption;
}
