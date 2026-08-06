import type { BusinessProfile, Industry } from "../types";
import type {
  BusinessIntelligenceProfile,
  MarketPosition,
  BrandPersonality,
  BuyerAwareness,
  VisitorTemperature,
  SalesCycle,
  ConversionStyle,
  LifetimeValue,
  TrafficSource,
  FunnelType,
} from "../types/businessIntelligence";
import { countMatches } from "../utils/textMatching";
import { calibrateSignal } from "./signalCalibration";

// BUSINESS INTELLIGENCE ENGINE
//
// What this exists to fix: BusinessProfile is a 10-row table keyed by classified
// Industry - "boutique law firm" and "exclusive premium white-glove law firm" produce
// the byte-identical profile, because nothing downstream of classification ever reads
// the prompt's own words again. This engine does: every PRIMARY dimension is an
// industry prior (a reasonable default for that vertical) blended with lexicon signals
// found in the ACTUAL PROMPT TEXT, the same way "Luxury Wedding Photographer" and
// "Cheap Wedding Photographer" should - and now do - diverge despite sharing an
// industry, a businessModel, and a primaryGoal.
//
// Deterministic by design (see NOCTRA_CONSTITUTION.md: "the AI should never improvise
// information when structured knowledge exists" / "structured data always comes before
// prompting an LLM") - this is lexicon scoring, not a second LLM call. No randomness,
// no network request, fully reproducible and unit-testable.

type PrimaryDimension = Exclude<
  keyof BusinessIntelligenceProfile,
  | "marketPosition"
  | "brandPersonality"
  | "buyerAwareness"
  | "visitorTemperature"
  | "salesCycle"
  | "conversionStyle"
  | "lifetimeValue"
  | "trafficSourceSuitability"
  | "funnelType"
>;

const NEUTRAL = 0.45;

// Every industry's reasonable starting point for the dimensions it strongly predicts
// regardless of phrasing (a dentist is high-trust-difficulty even in the blandest
// prompt). Dimensions not listed for an industry fall back to NEUTRAL - pure text-
// signal territory, no assumption baked in.
const INDUSTRY_PRIOR: Record<Industry, Partial<Record<PrimaryDimension, number>>> = {
  startup: { offerComplexity: 0.65, decisionComplexity: 0.55, visualImportance: 0.35, trustDifficulty: 0.4 },
  agency: { visualImportance: 0.55, competitionLevel: 0.6, trustDifficulty: 0.45 },
  medical: { trustDifficulty: 0.75, authorityRequirement: 0.8, riskPerception: 0.7, decisionComplexity: 0.5 },
  restaurant: { visualImportance: 0.75, emotionalVsRational: 0.7, decisionComplexity: 0.15, offerComplexity: 0.15 },
  fitness: { emotionalVsRational: 0.55, purchaseUrgency: 0.4, visualImportance: 0.5 },
  law: { trustDifficulty: 0.8, authorityRequirement: 0.85, riskPerception: 0.75, decisionComplexity: 0.6 },
  // pricePositioning 0.6: real estate transactions are inherently higher-ticket than
  // average (matches priceLevel "high" already set for this industry in
  // BusinessProfileBuilder.ts) - without this prior, the Narrative/Visual engines
  // (which score purely against BusinessIntelligenceProfile, never against industry
  // directly) had no signal to route a real_estate prompt toward the luxury archetype
  // and style the way the old industry-keyed tables explicitly did.
  real_estate: { decisionComplexity: 0.75, riskPerception: 0.7, visualImportance: 0.7, offerComplexity: 0.5, pricePositioning: 0.6 },
  ecommerce: { decisionComplexity: 0.2, purchaseUrgency: 0.45, competitionLevel: 0.7 },
  education: { trustDifficulty: 0.5, decisionComplexity: 0.4, emotionalVsRational: 0.45 },
  beauty: { visualImportance: 0.55, emotionalVsRational: 0.5, decisionComplexity: 0.15, offerComplexity: 0.15 },
  home_services: { trustDifficulty: 0.55, authorityRequirement: 0.5, decisionComplexity: 0.3 },
  consulting: { decisionComplexity: 0.6, offerComplexity: 0.55, trustDifficulty: 0.55, authorityRequirement: 0.6, buyerSophistication: 0.55 },
  automotive: { trustDifficulty: 0.5, decisionComplexity: 0.3, riskPerception: 0.4 },
  events: { emotionalVsRational: 0.65, visualImportance: 0.55, decisionComplexity: 0.4, offerComplexity: 0.35, pricePositioning: 0.55 },
  generic: {},
};

interface Lexicon {
  positive: readonly string[]; // pushes the dimension toward 1
  negative: readonly string[]; // pushes the dimension toward 0
}

const HIT_WEIGHT = 0.16;

// Text signals for the dimensions where PHRASING, not just industry, is the real
// driver - this is what makes "luxury"/"cheap" reshape pricePositioning within the
// exact same industry. Dimensions dominated by industry context (trustDifficulty,
// authorityRequirement, riskPerception) intentionally carry thin or no lexicon here -
// forcing a keyword list onto every dimension just to have one would be exactly the
// kind of hollow "intelligence" this system is meant to avoid.
// Every list below started as the narrow set that made the "luxury/cheap wedding
// photographer" worked example pass (see BusinessIntelligence.test.ts) - real prompts
// rarely use those exact words. Broadened after the 100-page stress test showed most
// plain-worded prompts hit NO lexicon at all and collapsed every primary dimension to
// NEUTRAL (0.45), which is what actually drove design-family/hero/phase-order collision
// downstream (see LayoutIntelligence.ts, DesignFamily.ts) - widening the vocabulary here
// is the upstream fix; the downstream seed-based tie-breaking is only a mitigation for
// whatever still collapses after this.
const LEXICON: Partial<Record<PrimaryDimension, Lexicon>> = {
  pricePositioning: {
    positive: [
      "luxury", "premium", "exclusive", "bespoke", "boutique", "high-end", "elite",
      "artisan", "curated", "prestige", "white-glove", "upscale", "high end",
      "high-quality", "top-tier", "designer", "handcrafted", "signature", "five-star",
      "vip", "finest", "refined", "sophisticated", "indulgent", "handmade", "couture",
      "private", "members-only", "invitation-only", "top-shelf",
    ],
    negative: [
      "cheap", "affordable", "budget", "discount", "low-cost", "inexpensive", "economical", "value",
      "wallet-friendly", "student discount", "no hidden fees", "family-friendly pricing",
      "small budget", "bargain", "on a budget", "low price", "cost-effective", "everyday low prices",
    ],
  },
  competitionLevel: {
    positive: [
      "leading", "established market", "crowded market", "well-known", "trusted by thousands",
      "industry leader", "top-rated", "award-winning", "market leader", "#1", "number one",
    ],
    negative: [
      "only", "first", "unique", "pioneering", "revolutionary", "one-of-a-kind", "never before",
      "new", "newest", "just launched", "innovative", "cutting-edge", "next-generation", "brand new",
    ],
  },
  visualImportance: {
    positive: [
      "stunning", "beautiful", "design", "aesthetic", "gallery", "portfolio", "visual", "photography", "style",
      "showcase", "visuals", "photos", "images", "look and feel", "craftsmanship", "beautifully",
      "gorgeous", "visually", "eye-catching", "striking", "elegant design", "sleek", "stylish",
    ],
    negative: [],
  },
  buyerSophistication: {
    positive: [
      "professional", "expert", "enterprise", "advanced", "industry-leading",
      "specialists", "veteran", "seasoned", "technical", "power users", "experienced professionals",
    ],
    negative: [
      "beginner", "first-time", "new to", "simple", "easy for anyone",
      "no experience needed", "anyone can", "no tech skills", "user-friendly", "for beginners", "no experience required",
    ],
  },
  emotionalVsRational: {
    positive: [
      "love", "dream", "memories", "journey", "story", "feel", "magical", "unforgettable", "passion", "heartfelt",
      "special day", "celebrate", "cherish", "warmth", "comfort", "belonging", "joy", "delight", "family", "together",
    ],
    negative: [
      "roi", "efficiency", "data", "metrics", "performance", "results", "guaranteed", "proven", "analytics", "measurable",
      "numbers", "reports", "dashboard", "conversion rate", "productivity", "output", "throughput", "benchmarks",
    ],
  },
  decisionComplexity: {
    positive: [
      "custom", "tailored", "integration", "enterprise", "multi-step", "consultation", "complex",
      "onboarding", "implementation", "requirements", "workflow", "configure", "customized", "in-depth",
    ],
    negative: [
      "simple", "easy", "one-click", "instant", "straightforward", "quick",
      "plug and play", "ready to go", "no setup", "works out of the box", "hassle-free", "no installation",
    ],
  },
  purchaseUrgency: {
    positive: [
      "now", "today", "limited", "hurry", "last chance", "urgent", "immediately", "same-day", "emergency", "don't wait",
      "book today", "spots are limited", "while supplies last", "act fast", "don't miss out", "closing soon",
      "limited time", "ends soon", "call now",
    ],
    negative: [],
  },
  offerComplexity: {
    positive: [
      "platform", "suite", "end-to-end", "comprehensive", "multi", "integration", "enterprise",
      "all-in-one", "full-service", "everything you need", "bundle", "modular", "full suite",
    ],
    negative: [
      "simple", "single", "straightforward",
      "one thing", "focused", "no-frills", "lightweight", "just one",
    ],
  },
  riskPerception: {
    positive: [
      "investment", "commitment", "contract", "long-term", "permanent", "surgery", "legal", "financial",
      "safety", "liability", "high-stakes", "irreversible", "binding", "life-changing", "major decision",
    ],
    negative: [
      "guarantee", "risk-free", "free trial", "money-back", "no commitment", "cancel anytime",
      "no obligation", "satisfaction guaranteed", "nothing to lose", "try before you buy", "flexible cancellation", "no risk",
    ],
  },
  trustDifficulty: {
    positive: [],
    negative: ["certified", "licensed", "accredited", "award-winning", "trusted by", "established"],
  },
  authorityRequirement: {
    positive: [
      "expert", "certified", "board-certified", "licensed", "accredited", "years of experience", "published", "featured in", "award-winning",
      "credentials", "qualified", "trained", "insured", "background-checked", "verified", "certified professionals",
    ],
    negative: [],
  },
};

function scorePrimary(dimension: PrimaryDimension, text: string, industry: Industry): number {
  const prior = INDUSTRY_PRIOR[industry][dimension] ?? NEUTRAL;
  const lexicon = LEXICON[dimension];

  if (!lexicon) {
    return calibrateSignal(dimension, prior);
  }

  const positiveHits = countMatches(text, lexicon.positive);
  const negativeHits = countMatches(text, lexicon.negative);

  return calibrateSignal(dimension, prior + positiveHits * HIT_WEIGHT - negativeHits * HIT_WEIGHT);
}

const TONE_TO_PERSONALITY: Record<BusinessProfile["tone"], BrandPersonality> = {
  professional: "authoritative",
  friendly: "warm",
  luxury: "elegant",
  modern: "bold",
  bold: "bold",
};

function deriveMarketPosition(competitionLevel: number, pricePositioning: number): MarketPosition {
  if (competitionLevel <= 0.35 && pricePositioning >= 0.6) return "niche";
  if (competitionLevel >= 0.7 && pricePositioning <= 0.4) return "challenger";
  if (competitionLevel >= 0.6 && pricePositioning >= 0.6) return "leader";
  return "established";
}

function deriveBrandPersonality(
  tone: BusinessProfile["tone"],
  pricePositioning: number,
  emotionalVsRational: number,
  purchaseUrgency: number
): BrandPersonality {
  if (pricePositioning >= 0.75) return "elegant";
  if (emotionalVsRational <= 0.35 && pricePositioning <= 0.4 && purchaseUrgency <= 0.5) return "playful";
  if (purchaseUrgency >= 0.7) return "bold";
  return TONE_TO_PERSONALITY[tone];
}

function deriveBuyerAwareness(offerComplexity: number, competitionLevel: number): BuyerAwareness {
  if (offerComplexity >= 0.7 && competitionLevel <= 0.4) return "unaware";
  if (offerComplexity >= 0.55) return "problem-aware";
  if (competitionLevel >= 0.65) return "most-aware";
  if (competitionLevel >= 0.5) return "product-aware";
  return "solution-aware";
}

function deriveVisitorTemperature(purchaseUrgency: number, buyerAwareness: BuyerAwareness): VisitorTemperature {
  if (buyerAwareness === "unaware" || purchaseUrgency <= 0.35) return "cold";
  if (purchaseUrgency >= 0.65 && (buyerAwareness === "product-aware" || buyerAwareness === "most-aware")) return "hot";
  return "warm";
}

function deriveSalesCycle(decisionComplexity: number, offerComplexity: number): SalesCycle {
  const avg = (decisionComplexity + offerComplexity) / 2;
  if (avg >= 0.65) return "long";
  if (avg >= 0.45) return "medium";
  if (avg >= 0.25) return "short";
  return "instant";
}

function deriveConversionStyle(
  decisionComplexity: number,
  trustDifficulty: number,
  primaryGoal: BusinessProfile["primaryGoal"]
): ConversionStyle {
  if (primaryGoal === "book_consultation" || primaryGoal === "schedule_call" || decisionComplexity >= 0.6) {
    return "consultative";
  }
  if (trustDifficulty >= 0.6) return "nurture";
  return "direct";
}

const BUSINESS_MODEL_LTV: Record<string, LifetimeValue> = {
  saas: "recurring-high",
  online_platform: "recurring-high",
  service: "recurring-low",
  local_business: "recurring-low",
};

function deriveLifetimeValue(businessModel: string): LifetimeValue {
  return BUSINESS_MODEL_LTV[businessModel] ?? "one-time";
}

function deriveTrafficSources(profile: {
  visualImportance: number;
  decisionComplexity: number;
  trustDifficulty: number;
  purchaseUrgency: number;
  authorityRequirement: number;
}): TrafficSource[] {
  const sources = new Set<TrafficSource>();

  if (profile.visualImportance >= 0.6) {
    sources.add("paid-social");
    sources.add("organic-content");
  }
  if (profile.decisionComplexity >= 0.55 || profile.trustDifficulty >= 0.6) {
    sources.add("search");
    sources.add("referral");
  }
  if (profile.purchaseUrgency >= 0.6) {
    sources.add("paid-social");
  }
  if (profile.authorityRequirement >= 0.6) {
    sources.add("referral");
  }
  if (sources.size === 0) {
    sources.add("search");
  }

  return Array.from(sources);
}

const GOAL_TO_FUNNEL: Record<BusinessProfile["primaryGoal"], FunnelType> = {
  generate_leads: "lead-generation",
  collect_emails: "lead-generation",
  book_demo: "lead-generation",
  book_consultation: "booking",
  schedule_call: "booking",
  sell_product: "direct-response",
};

// Turns the profile into short, LLM-readable directives - mirrors
// describeSignalsForPrompt's pattern in CompositionIntelligence.ts (qualitative bands
// and named categories, not raw floats/enum values dumped as-is), kept in this file
// rather than that one since these directives are about strategic READ of the business,
// not the structural CompositionSignals derived alongside it.
export function describeBusinessIntelligenceForPrompt(bi: BusinessIntelligenceProfile): string[] {
  const lines: string[] = [
    `Market Position: ${bi.marketPosition}`,
    `Brand Personality: ${bi.brandPersonality}`,
    `Buyer Awareness: ${bi.buyerAwareness}`,
    `Visitor Temperature: ${bi.visitorTemperature}`,
    `Sales Cycle: ${bi.salesCycle}`,
    `Funnel Type: ${bi.funnelType}`,
  ];

  if (bi.pricePositioning >= 0.7) {
    lines.push(
      "Price positioning is premium/luxury - write with restraint, avoid discount language, let scarcity and craft imply value instead of leading with price."
    );
  } else if (bi.pricePositioning <= 0.3) {
    lines.push("Price positioning is budget/value - lead with affordability and accessibility, make price a selling point.");
  }

  if (bi.visualImportance >= 0.65) {
    lines.push("Visuals carry a large share of the persuasion here - keep copy tight and let imagery/portfolio do the convincing.");
  }

  if (bi.authorityRequirement >= 0.65) {
    lines.push("Credentials and authority are central to the sale - surface expertise/certifications prominently, not as an afterthought.");
  }

  if (bi.conversionStyle === "nurture") {
    lines.push("This is a nurture sale - do not push for an immediate hard commitment, build trust progressively across the page.");
  } else if (bi.conversionStyle === "consultative") {
    lines.push("This is a consultative sale - frame the CTA as starting a conversation, not completing a transaction.");
  }

  return lines;
}

export function buildBusinessIntelligence(prompt: string, profile: BusinessProfile): BusinessIntelligenceProfile {
  const text = prompt.toLowerCase();

  const pricePositioning = scorePrimary("pricePositioning", text, profile.industry);
  const competitionLevel = scorePrimary("competitionLevel", text, profile.industry);
  const visualImportance = scorePrimary("visualImportance", text, profile.industry);
  const buyerSophistication = scorePrimary("buyerSophistication", text, profile.industry);
  const emotionalVsRational = scorePrimary("emotionalVsRational", text, profile.industry);
  const decisionComplexity = scorePrimary("decisionComplexity", text, profile.industry);
  const purchaseUrgency = scorePrimary("purchaseUrgency", text, profile.industry);
  const offerComplexity = scorePrimary("offerComplexity", text, profile.industry);
  const riskPerception = scorePrimary("riskPerception", text, profile.industry);
  const trustDifficulty = scorePrimary("trustDifficulty", text, profile.industry);
  const authorityRequirement = scorePrimary("authorityRequirement", text, profile.industry);

  const buyerAwareness = deriveBuyerAwareness(offerComplexity, competitionLevel);

  return {
    pricePositioning,
    competitionLevel,
    visualImportance,
    buyerSophistication,
    emotionalVsRational,
    decisionComplexity,
    purchaseUrgency,
    offerComplexity,
    riskPerception,
    trustDifficulty,
    authorityRequirement,

    marketPosition: deriveMarketPosition(competitionLevel, pricePositioning),
    brandPersonality: deriveBrandPersonality(profile.tone, pricePositioning, emotionalVsRational, purchaseUrgency),
    buyerAwareness,
    visitorTemperature: deriveVisitorTemperature(purchaseUrgency, buyerAwareness),
    salesCycle: deriveSalesCycle(decisionComplexity, offerComplexity),
    conversionStyle: deriveConversionStyle(decisionComplexity, trustDifficulty, profile.primaryGoal),
    lifetimeValue: deriveLifetimeValue(profile.businessModel),
    trafficSourceSuitability: deriveTrafficSources({
      visualImportance,
      decisionComplexity,
      trustDifficulty,
      purchaseUrgency,
      authorityRequirement,
    }),
    funnelType: GOAL_TO_FUNNEL[profile.primaryGoal],
  };
}
