import type { BusinessProfile, BusinessGoal } from "../types";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { PageArchetype } from "../types/archetype";
import { pickBestMatch, type SignalFingerprint } from "../engines/shared";

// NARRATIVE ENGINE
//
// What this replaces: INDUSTRY_ARCHETYPES, a Record<Industry, PageArchetype> - a
// hardcoded "if industry === X, archetype = Y" table. Two businesses in the same
// industry got the exact same archetype forever, no matter how differently they
// described themselves, because the archetype was the table key's *value*, not
// something computed from the business itself.
//
// What this is instead: every PageArchetype declares an ideal SIGNAL FINGERPRINT - the
// BusinessIntelligenceProfile values a business who genuinely fits that archetype would
// have (see each ARCHETYPE_FINGERPRINTS entry's inline reasoning, sourced from the same
// compositional intent LayoutIntelligence.ts's BIAS_BY_ARCHETYPE already documents:
// luxury hides pricing/stats, authority leans on testimonials/stats, etc). The archetype
// whose fingerprint the business's actual signals are closest to wins - industry never
// enters this function. Industry still matters, but only through the legitimate channel
// of having shaped BusinessIntelligenceProfile's priors upstream (BusinessIntelligence.ts),
// never as a direct lookup key here.
//
// GOAL_BIAS is the one deliberate exception, and it is not an industry table: primaryGoal
// is a literal fact about what the business wants a visitor to do (book a consultation vs
// buy a product), which a psychographic fingerprint alone can't always capture - a
// same-day-booking dentist and a by-appointment-only boutique law firm can have nearly
// identical trust/risk/authority signals while wanting structurally different pages. Kept
// small (<=0.1) so it can only tip a close call, never overrule a strong fingerprint match
// (see ArchetypeResolver.test.ts's "goal bias never overrides a decisive fingerprint match"
// case). Goals with weak, generic predictive value (schedule_call, generate_leads) are
// deliberately left out rather than assigned a token bias that would just add noise.
const ARCHETYPE_FINGERPRINTS: Record<PageArchetype, SignalFingerprint> = {
  // Credentials-led: trust and authority are hard-won, the decision itself is involved
  // (BIAS_BY_ARCHETYPE gives authority +testimonials/+stats - proof-heavy by design).
  authority: { trustDifficulty: 0.8, authorityRequirement: 0.85, decisionComplexity: 0.6 },

  // High price positioning + a considered, non-trivial decision + strong visual weight,
  // but explicitly NOT urgency-driven (BIAS_BY_ARCHETYPE strips pricing/stats/logoCloud -
  // this is restraint-and-craft, not a numbers pitch).
  luxury: { pricePositioning: 0.78, visualImportance: 0.65, decisionComplexity: 0.72, riskPerception: 0.6 },

  // Deliberately near the neutral center on every axis - the natural fallback for a
  // business with no strongly distinguishing strategic signal, not a dumping ground.
  local_business: { competitionLevel: 0.45, decisionComplexity: 0.3, visualImportance: 0.45, purchaseUrgency: 0.45 },

  // B2B-shaped: a nontrivial offer, a moderately complex decision, a sophisticated buyer
  // (BIAS_BY_ARCHETYPE's +logoCloud/+pricing fits a business selling to other businesses).
  lead_generation: { offerComplexity: 0.65, decisionComplexity: 0.5, buyerSophistication: 0.55 },

  // Trust built through a person, not a brand or a dataset - meaningfully emotional,
  // low competition framing, and explicitly a SIMPLE decision (BIAS_BY_ARCHETYPE's
  // +testimonials/-logoCloud: an audience follows someone and opts in, it doesn't
  // compare vendor logos or weigh a complex purchase) - decisionComplexity is what
  // keeps this from being confused with a considered, high-stakes purchase like real
  // estate that happens to also sit near-neutral on emotion/authority/competition.
  personal_brand: { emotionalVsRational: 0.6, authorityRequirement: 0.5, competitionLevel: 0.4, decisionComplexity: 0.3 },

  // Visual, low-friction, moderately urgent, in a crowded market, and a genuinely
  // simple offer - one discrete product, not a bespoke engagement (BIAS_BY_ARCHETYPE's
  // +logoCloud: brand trust matters when the product itself is one of many). Low
  // offerComplexity is what separates "browse and buy a product" from portfolio's
  // "browse creative work, then commission something custom."
  product_showcase: { visualImportance: 0.55, decisionComplexity: 0.2, competitionLevel: 0.65, purchaseUrgency: 0.5, offerComplexity: 0.2 },

  // A real decision with real stakes that still needs an explicit next step scheduled
  // (BIAS_BY_ARCHETYPE's +faq: enough at stake that objections need answering before
  // someone will commit to time on a calendar).
  booking: { decisionComplexity: 0.55, riskPerception: 0.65, trustDifficulty: 0.55 },

  // Work speaks for itself: highly visual, in a competitive field, more emotional than
  // data-driven, browsed rather than urgently purchased (BIAS_BY_ARCHETYPE's
  // +features/-logoCloud: showcase the work, not client logos). decisionComplexity
  // keeps a real estate listing (also visual, but a genuinely considered purchase) from
  // reading as a creative portfolio; offerComplexity keeps a commodity product listing
  // (product_showcase) from reading as one - browsing work still precedes a bespoke,
  // custom engagement, unlike buying a single discrete product off a shelf.
  portfolio: { visualImportance: 0.65, competitionLevel: 0.55, emotionalVsRational: 0.4, decisionComplexity: 0.3, offerComplexity: 0.55 },

  // Visual and emotional but genuinely low-stakes/low-complexity and price-moderate -
  // what separates this from luxury is the absence of high pricePositioning/decisionComplexity.
  hospitality: { visualImportance: 0.72, emotionalVsRational: 0.68, decisionComplexity: 0.2, pricePositioning: 0.5 },
};

const GOAL_BIAS: Partial<Record<BusinessGoal, Partial<Record<PageArchetype, number>>>> = {
  book_consultation: { booking: 0.1 },
  book_demo: { lead_generation: 0.1 },
  sell_product: { product_showcase: 0.1 },
  collect_emails: { personal_brand: 0.08, lead_generation: 0.05 },
};

export function resolveArchetype(business: BusinessProfile, bi: BusinessIntelligenceProfile): PageArchetype {
  const signals: Record<string, number> = {
    pricePositioning: bi.pricePositioning,
    competitionLevel: bi.competitionLevel,
    visualImportance: bi.visualImportance,
    buyerSophistication: bi.buyerSophistication,
    emotionalVsRational: bi.emotionalVsRational,
    decisionComplexity: bi.decisionComplexity,
    purchaseUrgency: bi.purchaseUrgency,
    offerComplexity: bi.offerComplexity,
    riskPerception: bi.riskPerception,
    trustDifficulty: bi.trustDifficulty,
    authorityRequirement: bi.authorityRequirement,
  };

  return pickBestMatch(ARCHETYPE_FINGERPRINTS, signals, GOAL_BIAS[business.primaryGoal] ?? {});
}
