import type { BusinessProfile, BusinessGoal } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";

const GOAL_CTA: Record<BusinessGoal, string> = {
  generate_leads: "Get Started",
  book_consultation: "Book a Consultation",
  book_demo: "Request a Demo",
  sell_product: "Shop Now",
  collect_emails: "Get Early Access",
  schedule_call: "Schedule a Call",
};

const GOAL_FRAMING: Record<BusinessGoal, string> = {
  generate_leads:
    "Frame the offer as a low-commitment first step, not a final decision",
  book_consultation:
    "Frame the offer around getting expert clarity on their specific situation",
  book_demo: "Frame the offer as a chance to see real value before committing",
  sell_product:
    "Frame the offer around the immediate, tangible outcome of owning the product",
  collect_emails:
    "Frame the offer as exclusive early access, not a generic newsletter signup",
  schedule_call: "Frame the offer as a no-pressure conversation, not a sales pitch",
};

// Replaces the old PRICE_FRAMING_MODIFIER table (keyed by BusinessProfile.priceLevel -
// a constant fixed per industry, never derived from the prompt's own words). This is
// the exact fix for Signal Trace Audit v1's finding #3: "Luxury Wedding Photographer"
// and "Cheap Wedding Photographer" share an industry (both classify as "generic" or
// whichever industry "wedding photographer" alone triggers) and therefore used to share
// this modifier too, despite bi.pricePositioning already correctly reading >0.7 vs <0.3
// for the two prompts - the offer framing text was silently contradicting the BUSINESS
// INTELLIGENCE section of the same prompt.
function priceFramingModifier(bi: BusinessIntelligenceProfile): string | null {
  if (bi.pricePositioning >= 0.7) {
    return "leaning into exclusivity rather than competing on price";
  }
  if (bi.pricePositioning >= 0.55) {
    return "while justifying the higher price with clear value";
  }
  return null;
}

const GOAL_RISK_REVERSAL: Record<BusinessGoal, string> = {
  generate_leads: "No credit card required to get started",
  book_consultation: "The first consultation carries no obligation to continue",
  book_demo: "The demo is free, with no purchase commitment",
  sell_product: "Backed by a satisfaction guarantee",
  collect_emails: "Unsubscribe anytime, no questions asked",
  schedule_call: "No sales pressure - just a conversation, cancel anytime",
};

function derivePrimaryCTA(
  business: BusinessProfile,
  knowledge: BusinessKnowledge
): string {
  const hasDedicatedIndustryKnowledge = knowledge.industry === business.industry;

  return hasDedicatedIndustryKnowledge
    ? knowledge.primaryCTA
    : GOAL_CTA[business.primaryGoal];
}

function toWantClause(desire: string): string {
  return desire.replace(/^Wants /, "want ");
}

function deriveValueProposition(
  business: BusinessProfile,
  knowledge: BusinessKnowledge,
  psychology: PsychologyProfile
): string {
  const topDesire = psychology.desires[0];
  const topBenefit = knowledge.commonBenefits[0] ?? knowledge.commonFeatures[0];

  if (!topDesire || !topBenefit) {
    return `Built for ${business.audience} through ${knowledge.heroStyle.toLowerCase()}`;
  }

  return `Built for ${business.audience} who ${toWantClause(
    topDesire
  )}, delivered through ${topBenefit.toLowerCase()}`;
}

function deriveOfferFraming(business: BusinessProfile, bi: BusinessIntelligenceProfile): string {
  const base = GOAL_FRAMING[business.primaryGoal];
  const modifier = priceFramingModifier(bi);

  return modifier ? `${base}, ${modifier}` : base;
}

function deriveRiskReductionAngle(
  business: BusinessProfile,
  psychology: PsychologyProfile
): string {
  const guarantee = GOAL_RISK_REVERSAL[business.primaryGoal];
  const topObjection = psychology.objections[0];

  return topObjection
    ? `${guarantee} - directly answers: "${topObjection}"`
    : guarantee;
}

export function buildOfferStrategy(
  business: BusinessProfile,
  knowledge: BusinessKnowledge,
  psychology: PsychologyProfile,
  bi: BusinessIntelligenceProfile
): OfferStrategy {
  return {
    primaryCTA: derivePrimaryCTA(business, knowledge),
    valueProposition: deriveValueProposition(business, knowledge, psychology),
    offerFraming: deriveOfferFraming(business, bi),
    riskReductionAngle: deriveRiskReductionAngle(business, psychology),
  };
}
