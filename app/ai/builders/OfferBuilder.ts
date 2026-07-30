import type { BusinessProfile, BusinessGoal } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";

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

const PRICE_FRAMING_MODIFIER: Record<BusinessProfile["priceLevel"], string | null> = {
  low: null,
  medium: null,
  high: "while justifying the higher price with clear value",
  premium: "leaning into exclusivity rather than competing on price",
};

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

function deriveOfferFraming(business: BusinessProfile): string {
  const base = GOAL_FRAMING[business.primaryGoal];
  const modifier = PRICE_FRAMING_MODIFIER[business.priceLevel];

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
  psychology: PsychologyProfile
): OfferStrategy {
  return {
    primaryCTA: derivePrimaryCTA(business, knowledge),
    valueProposition: deriveValueProposition(business, knowledge, psychology),
    offerFraming: deriveOfferFraming(business),
    riskReductionAngle: deriveRiskReductionAngle(business, psychology),
  };
}
