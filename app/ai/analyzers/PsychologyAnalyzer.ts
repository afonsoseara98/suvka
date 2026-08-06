import type { BusinessProfile, BusinessGoal, Tone } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";

// Each FAQ topic implies a specific worry a prospect hasn't voiced yet.
// Keyed by the free-text topics already authored in app/ai/knowledge/*.ts.
const FAQ_TOPIC_PAINS: Record<string, string> = {
  Pricing: "Worried the price won't be justified by the value received",
  Security: "Concerned about the safety and security of their data or business",
  Integrations: "Afraid the solution won't fit into their existing tools and workflow",
  Support: "Fear of being left without help when something goes wrong",
  Insurance: "Uncertain whether their insurance will cover the cost",
  Appointments: "Frustrated by long waits or difficulty booking a convenient time",
  Treatments: "Anxious about what a treatment actually involves and its risks",
  "Opening hours": "Worried the business won't be available when they need it",
  Reservations: "Frustrated by not knowing if a table will actually be available",
  Parking: "Concerned about the hassle of finding somewhere to park",
  Menu: "Unsure whether the menu will suit their taste or dietary needs",
  Membership: "Wary of being locked into a long-term commitment",
  Classes: "Unsure if the classes will match their fitness level",
  "Personal training": "Doubtful that one-on-one attention is worth the extra cost",
  Nutrition: "Overwhelmed by conflicting nutrition advice elsewhere",
  Consultation: "Nervous about the cost or outcome of an initial consultation",
  Fees: "Afraid fees will escalate beyond what was quoted",
  Process: "Confused about how long the process will take and what it involves",
  Documents: "Overwhelmed by the paperwork and documentation required",
  Contracts: "Wary of being locked into long-term terms they don't fully understand",
  Shipping: "Worried about delivery times or unexpected shipping costs",
  Returns: "Concerned about the hassle of returning or exchanging an item",
  Enrollment: "Unsure how or when they can start, or if they've missed a deadline",
  Certification: "Doubtful whether the certificate will actually be recognised or valuable",
  Products: "Unsure which product or treatment is right for their specific needs",
  Guarantees: "Worried the work won't be done right the first time",
  Warranty: "Concerned about who pays if something goes wrong after the service",
  Availability: "Anxious that their preferred date won't be available",
};

// Each common benefit is reframed from "what it does" to "what the customer
// actually wants underneath it".
const BENEFIT_DESIRES: Record<string, string> = {
  "Save time": "Wants to reclaim time currently lost to manual, repetitive work",
  "Increase revenue": "Wants measurable business growth, not just activity",
  "Scale faster": "Wants to grow without being held back by operational bottlenecks",
  "Reduce costs": "Wants to do more with the same or a smaller budget",
  "Fast appointments": "Wants to be seen quickly without long waits",
  "Personalised care": "Wants to feel like an individual, not a number",
  "Trusted professionals": "Wants confidence that they're in capable hands",
  "Quality treatment": "Wants the best possible outcome, not just any outcome",
  "Fresh food": "Wants ingredients and preparation they can trust",
  "Fast service": "Wants their time respected, especially during a meal",
  "Amazing atmosphere": "Wants an experience, not just a transaction",
  "Authentic flavours": "Wants something that feels genuine, not mass-produced",
  "Build muscle": "Wants visible physical progress they can point to",
  "Lose weight": "Wants to feel more comfortable and confident in their body",
  "Improve health": "Wants long-term wellbeing, not just a short-term fix",
  "Increase confidence": "Wants to feel better about themselves, inside and out",
  "Expert advice": "Wants clarity from someone who has seen their situation before",
  "Legal protection": "Wants to feel safe from risks they don't fully understand",
  "Fast response": "Wants reassurance they won't be left waiting during a stressful time",
  "Peace of mind": "Wants the underlying worry resolved, not just the immediate task",
};

// Replaces the old PRICE_OBJECTIONS table (keyed by BusinessProfile.priceLevel, a
// constant fixed per industry in BusinessProfileBuilder.ts's INDUSTRY_PROFILES - never
// derived from the prompt's own words). bi.pricePositioning is continuous and DOES vary
// per-prompt (see BusinessIntelligence.test.ts's "Luxury Wedding Photographer vs Cheap
// Wedding Photographer"), which is the exact divergence Signal Trace Audit v1's finding
// #3 found was computed correctly but never reached this file.
function priceObjectionFromBi(bi: BusinessIntelligenceProfile): string {
  if (bi.pricePositioning >= 0.7) {
    return "Price itself may be the main barrier unless exclusivity and quality are obvious";
  }
  if (bi.pricePositioning <= 0.3) {
    return "May assume a low price signals lower quality or a lack of professionalism";
  }
  return "May shop around and compare against alternatives before deciding";
}

// A second, genuinely new objection this business's own signals can surface - absent
// entirely before this file consumed BusinessIntelligenceProfile, since neither
// riskPerception nor decisionComplexity has any equivalent in the coarse
// BusinessProfile. Returns null (filtered out below) when neither is elevated enough to
// be a distinct, real objection worth naming.
function riskOrComplexityObjectionFromBi(bi: BusinessIntelligenceProfile): string | null {
  if (bi.riskPerception >= 0.65) {
    return "May hesitate over the size of the commitment and what happens if it doesn't work out";
  }
  if (bi.decisionComplexity >= 0.65) {
    return "May feel overwhelmed by the number of factors involved in deciding";
  }
  return null;
}

const GOAL_OBJECTIONS: Record<BusinessGoal, string> = {
  generate_leads: "Not sure they're ready to commit to anything yet",
  book_consultation: "Unsure whether their situation really needs professional help",
  book_demo: "Skeptical that a demo will reflect their real-world use case",
  sell_product: "Uncertain the product will actually work for their specific situation",
  collect_emails: "Reluctant to hand over their email without a clear, immediate benefit",
  schedule_call: "Wary of being sold to on a call rather than getting real answers",
};

const TONE_TRIGGERS: Record<Tone, readonly string[]> = {
  professional: ["Confidence from expertise", "Reduced risk of making the wrong choice"],
  friendly: ["Feeling welcomed and understood", "A sense of belonging"],
  luxury: ["Status and exclusivity", "Being treated as a priority"],
  modern: ["Excitement about innovation", "Fear of falling behind"],
  bold: ["Ambition and excitement", "Desire to stand out"],
};

const GOAL_TRIGGERS: Record<BusinessGoal, readonly string[]> = {
  generate_leads: ["Curiosity to learn more without committing"],
  book_consultation: ["Urgency to resolve a pressing concern"],
  book_demo: ["Wanting proof before committing"],
  sell_product: ["Desire for immediate gratification"],
  collect_emails: ["Fear of missing out on future value"],
  schedule_call: ["Reassurance from speaking to a real person"],
};

function derivePains(knowledge: BusinessKnowledge): string[] {
  return knowledge.faqTopics.map(
    (topic) =>
      FAQ_TOPIC_PAINS[topic] ??
      `Uncertain about what to expect regarding ${topic.toLowerCase()}`
  );
}

function deriveDesires(knowledge: BusinessKnowledge): string[] {
  return knowledge.commonBenefits.map(
    (benefit) =>
      BENEFIT_DESIRES[benefit] ??
      `Wants the outcome behind: ${benefit.toLowerCase()}`
  );
}

function objectionForBusinessModel(businessModel: string): string {
  const normalized = businessModel.toLowerCase();

  if (normalized.includes("local")) {
    return "May wonder if a local business can match the polish of bigger competitors";
  }

  if (normalized.includes("global") || normalized.includes("national")) {
    return "May worry the experience will feel impersonal at scale";
  }

  return "May be unsure how this business is different from every other option";
}

function deriveObjections(business: BusinessProfile, bi: BusinessIntelligenceProfile): string[] {
  const objections = [
    priceObjectionFromBi(bi),
    GOAL_OBJECTIONS[business.primaryGoal],
    objectionForBusinessModel(business.businessModel),
    riskOrComplexityObjectionFromBi(bi),
  ];

  return objections.filter((objection): objection is string => objection !== null);
}

function deriveTrustFactors(
  business: BusinessProfile,
  knowledge: BusinessKnowledge,
  bi: BusinessIntelligenceProfile
): string[] {
  const factors = [...knowledge.trustSignals];

  // bi.pricePositioning/authorityRequirement/trustDifficulty are continuous reads of
  // THIS business's own prompt text - replacing the coarse business.priceLevel/tone
  // checks that used to gate these same three lines (both were constants fixed per
  // industry, never derived from what the user actually wrote).
  if (bi.pricePositioning >= 0.65) {
    factors.push(
      "Premium positioning signals higher quality and reduces perceived risk"
    );
  }

  if (business.businessModel.toLowerCase().includes("local")) {
    factors.push(
      "Local presence and community reputation build trust with nearby customers"
    );
  }

  if (bi.authorityRequirement >= 0.6) {
    factors.push(
      "Demonstrated expertise and credentials reduce the perceived risk of a bad decision"
    );
  }

  if (bi.trustDifficulty >= 0.6) {
    factors.push(
      "Clear, proactive communication matters more here, where trust is naturally harder to earn"
    );
  }

  return Array.from(new Set(factors));
}

// bi.emotionalVsRational adds a trigger this business's own signals surface, alongside
// (not instead of) the existing tone/goal-driven ones - null in the true middle of the
// spectrum, where neither an emotional nor a rational trigger is the more honest read.
function biEmotionalTrigger(bi: BusinessIntelligenceProfile): string | null {
  if (bi.emotionalVsRational >= 0.65) {
    return "Being moved, not just informed";
  }
  if (bi.emotionalVsRational <= 0.35) {
    return "Clear, measurable proof over emotional appeal";
  }
  return null;
}

function deriveEmotionalTriggers(business: BusinessProfile, bi: BusinessIntelligenceProfile): string[] {
  const trigger = biEmotionalTrigger(bi);

  return Array.from(
    new Set([
      ...TONE_TRIGGERS[business.tone],
      ...GOAL_TRIGGERS[business.primaryGoal],
      ...(trigger ? [trigger] : []),
    ])
  );
}

export function analyzePsychology(
  business: BusinessProfile,
  knowledge: BusinessKnowledge,
  bi: BusinessIntelligenceProfile
): PsychologyProfile {
  return {
    pains: derivePains(knowledge),
    desires: deriveDesires(knowledge),
    objections: deriveObjections(business, bi),
    trustFactors: deriveTrustFactors(business, knowledge, bi),
    emotionalTriggers: deriveEmotionalTriggers(business, bi),
  };
}
