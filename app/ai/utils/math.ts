// Previously defined independently in CompositionIntelligence.ts, LayoutIntelligence.ts
// and BusinessIntelligence.ts - three copies of the same one-line function. Extracted
// once a fourth consumer (the engines/ scorer) needed it too, same reasoning as
// textMatching.ts: independent copies are how one of them silently drifts from the rest.
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
