// Every field is a 0-1 score, always deterministically derivable from BusinessProfile +
// PsychologyProfile + OfferStrategy - no randomness, no LLM call. This is what
// CompositionIntelligence.ts scores and what makes two businesses in the *same*
// PageArchetype produce genuinely different LandingCompositions instead of the byte-
// identical structure a pure archetype-keyed lookup table always would.
export interface CompositionSignals {
  // How much the page needs to establish credibility before asking for anything.
  trustNeed: number;

  // How immediately the page should be pushing toward a conversion action.
  urgency: number;

  // How much explaining the offer needs before it's understandable.
  complexity: number;

  // How much weight testimonials/proof should carry relative to other content.
  socialProofNeed: number;

  // How hard the copy needs to work to defeat hesitation before converting.
  objectionPressure: number;

  // How much the price itself is likely to be a sticking point for this audience.
  priceSensitivity: number;
}
