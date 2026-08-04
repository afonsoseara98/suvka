// DESIGN SEED
//
// Why this exists: the pipeline is (correctly, deliberately) fully deterministic - the
// same prompt always produces the same page. That's the right rule, but it has a side
// effect: two businesses whose BusinessIntelligenceProfile signals land close together
// (which happens often - "a local gym" and "a local bakery" can score very similarly on
// every strategic dimension) were producing near-identical structure and visuals,
// because nothing in the pipeline varied EXCEPT those signals. The result reads as "one
// generator's house style," not as work from different designers.
//
// The fix is not randomness (forbidden - "Não interrompas... Refatora... desde que
// mantenhas qualidade" does not lift the standing "no randomization, everything must be
// deterministic" rule from the Layout Intelligence phase, and nothing here reintroduces
// it: hashString/createSeededRandom are pure functions of the prompt text, so the same
// prompt always derives the same seed and the same sequence of "random" numbers). The
// seed is used exclusively to break ties AMONG OPTIONS THE SIGNALS HAVE ALREADY DEEMED
// EQUALLY VALID (see resolvePhaseOrder in LayoutIntelligence.ts and resolveFamily in
// DesignFamily.ts) - it never overrides a decisive signal-driven preference, only
// decides between choices the business's own signals didn't distinguish.

// FNV-1a: a small, well-known, non-cryptographic string hash - fast, good bit
// distribution for this use (tie-breaking), no dependency needed.
export function hashString(text: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

// mulberry32: a small deterministic PRNG. Seeded once from hashString(prompt), then
// called repeatedly - each call advances the same reproducible sequence, so multiple
// tie-breaking decisions for one prompt are independent of each other but always the
// same across runs of that same prompt.
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WeightedOption<T> {
  value: T;
  weight: number;
}

// Weighted pick against a deterministic [0,1) draw - options with weight 0 are never
// selected, options with a real (even small) edge are proportionally more likely, but
// every option the signals left in the running remains reachable. Falls back to the
// first option if every weight is exactly 0 (a caller passing an empty-weighted list is
// a caller bug, not something to throw over).
export function seededPick<T>(random: () => number, options: readonly WeightedOption<T>[]): T {
  const totalWeight = options.reduce((sum, option) => sum + Math.max(0, option.weight), 0);

  if (totalWeight <= 0) {
    return options[0].value;
  }

  const draw = random() * totalWeight;
  let cursor = 0;

  for (const option of options) {
    cursor += Math.max(0, option.weight);
    if (draw < cursor) {
      return option.value;
    }
  }

  return options[options.length - 1].value;
}
