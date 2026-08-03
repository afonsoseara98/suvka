// Shared word-boundary matching, previously defined privately inside
// BusinessProfileBuilder.ts and duplicated by BusinessIntelligence.ts. Extracted once
// both needed the identical behavior - two independent copies of a matcher is exactly
// the kind of duplication that lets them silently drift (e.g. one gets accent-insensitive
// matching added and the other doesn't).
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchesWord(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(text);
}

// Counts how many keywords from each list appear (word-boundary matched) in text,
// weighted. Used anywhere a signal is "how many words from this lexicon show up",
// which is both industry classification (BusinessProfileBuilder.ts) and dimension
// scoring (BusinessIntelligence.ts).
export function countMatches(text: string, keywords: readonly string[]): number {
  return keywords.filter((keyword) => matchesWord(text, keyword)).length;
}
