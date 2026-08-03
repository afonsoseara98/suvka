// The richer "who is this business, strategically" read that sits between
// BusinessProfile (industry classification) and everything downstream. See
// BusinessIntelligence.ts for how each field is computed.
//
// Split deliberately into two kinds:
// - PRIMARY dimensions are scored directly (industry prior blended with lexicon
//   signals found in the actual prompt text) - they're the ones that make "Luxury
//   Wedding Photographer" and "Cheap Wedding Photographer" diverge despite sharing an
//   industry.
// - DERIVED dimensions are computed FROM the primaries (plus BusinessProfile fields
//   already available, like tone/businessModel/primaryGoal) rather than carrying their
//   own independent lexicon. This is what keeps this a dependency graph instead of 20
//   parallel copies of the same scoring pattern.

export type MarketPosition = "challenger" | "established" | "leader" | "niche";
export type BrandPersonality = "playful" | "authoritative" | "warm" | "bold" | "elegant";
export type BuyerAwareness = "unaware" | "problem-aware" | "solution-aware" | "product-aware" | "most-aware";
export type VisitorTemperature = "cold" | "warm" | "hot";
export type SalesCycle = "instant" | "short" | "medium" | "long";
export type ConversionStyle = "direct" | "consultative" | "nurture";
export type LifetimeValue = "one-time" | "recurring-low" | "recurring-high";
export type TrafficSource = "paid-social" | "search" | "referral" | "organic-content" | "direct";
export type FunnelType = "direct-response" | "lead-generation" | "brand-awareness" | "booking";

export interface BusinessIntelligenceProfile {
  // --- Primary: 0 (low end of the dimension) to 1 (high end), industry prior + text signal ---
  pricePositioning: number; // 0 budget - 1 luxury
  competitionLevel: number; // 0 niche/blue-ocean - 1 saturated/commoditized
  visualImportance: number; // 0 function-first - 1 aesthetics-first
  buyerSophistication: number; // 0 first-timer - 1 seen it all before
  emotionalVsRational: number; // 0 fully rational - 1 fully emotional
  decisionComplexity: number; // 0 impulse decision - 1 many stakeholders/steps
  purchaseUrgency: number; // 0 no rush - 1 act now
  offerComplexity: number; // 0 single simple offer - 1 multi-faceted/custom
  riskPerception: number; // 0 low stakes - 1 high stakes if wrong
  trustDifficulty: number; // 0 easy to believe - 1 hard-won trust required
  authorityRequirement: number; // 0 credentials don't matter - 1 credentials are the sale

  // --- Derived: computed from the primaries above + existing BusinessProfile fields ---
  marketPosition: MarketPosition;
  brandPersonality: BrandPersonality;
  buyerAwareness: BuyerAwareness;
  visitorTemperature: VisitorTemperature;
  salesCycle: SalesCycle;
  conversionStyle: ConversionStyle;
  lifetimeValue: LifetimeValue;
  trafficSourceSuitability: readonly TrafficSource[];
  funnelType: FunnelType;
}
