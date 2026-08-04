import type { DesignSystem, DesignStyle } from "@/app/types/design";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import { pickBestMatch, type SignalFingerprint } from "../engines/shared";

// VISUAL ENGINE
//
// What this replaces: a switch(industry) returning a hardcoded DesignSystem per
// industry - "if industry === medical, style = medical" and so on. Two businesses in
// the same industry got the exact same visual identity forever, regardless of how they
// actually described themselves.
//
// What this is instead: every reachable DesignStyle declares an ideal SIGNAL
// FINGERPRINT (the BusinessIntelligenceProfile values a business who genuinely fits
// that visual language would have), and buildDesignSystem picks whichever style's
// fingerprint the business's actual signals are closest to - via the exact same
// pickBestMatch scorer ArchetypeResolver.ts's Narrative Engine uses. Industry never
// enters this function; it only ever mattered through the legitimate channel of having
// shaped BusinessIntelligenceProfile's priors upstream.
//
// "corporate" is a declared DesignStyle with no fingerprint here, deliberately: it has
// no ThemeConfig of its own (app/api/generate/route.ts's STYLE_TO_THEME maps it to the
// "agency" Theme as a placeholder) - scoring against a style with no real visual
// identity would just mislabel agency-themed pages as "corporate." Left unreachable
// until it gets a real theme; see the final report for this as tracked debt.
const STYLE_FINGERPRINTS: Record<Exclude<DesignStyle, "corporate">, SignalFingerprint> = {
  // The natural neutral fallback (deliberately close to center, the same role
  // local_business plays for archetypes) - functional over decorative, for a business
  // with no strongly distinguishing visual signal.
  saas: { offerComplexity: 0.55, decisionComplexity: 0.5, visualImportance: 0.4 },

  // Visual and genuinely competitive - what a business in a crowded, comparison-heavy
  // market (an agency pitching against other agencies, a retailer among many) looks
  // like when it still wants to look considered rather than cheap.
  agency: { visualImportance: 0.6, competitionLevel: 0.7 },

  // High price positioning, real visual weight, and a genuinely considered purchase -
  // restraint and craft, not a numbers pitch (mirrors the luxury archetype's reasoning
  // in ArchetypeResolver.ts, computed independently since visual identity and page
  // structure are different decisions that happen to often agree).
  luxury: { pricePositioning: 0.85, visualImportance: 0.6, decisionComplexity: 0.6 },

  // Trust and authority are hard-won and the stakes of getting it wrong are real -
  // restrained, clinical, credibility-first rather than decorative. This fingerprint
  // is also, honestly, the closest visual match for a plain (non-boutique) law firm
  // profile - both are high-trust professional services, and DesignStyle's current
  // 6-style space has no dedicated "corporate legal" identity distinct from "clinical
  // medical" (see the "corporate" style note above). A sufficiently strong price signal
  // (weighted pricePositioning in the luxury fingerprint below) can still override this.
  medical: { trustDifficulty: 0.72, authorityRequirement: 0.78, riskPerception: 0.68 },

  // Highly visual and emotional, a low-friction, low-complexity decision - the opposite
  // of medical's restraint, warm and appetite-driven. pricePositioning pinned to
  // neutral (not just absent) so an extreme price signal - a genuinely luxury business
  // that also happens to be visual/emotional, e.g. a high-end wedding photographer -
  // gets pulled toward luxury instead of restaurant purely because restaurant had no
  // price dimension to be penalized on.
  restaurant: { visualImportance: 0.72, emotionalVsRational: 0.68, decisionComplexity: 0.2, pricePositioning: 0.45 },

  // Energetic and emotionally driven, and explicitly NOT price-premium (unlike a
  // luxury business, which can also read as visual/emotional - e.g. a high-end
  // wedding photographer - pricePositioning is what keeps this fingerprint from
  // accidentally winning that case just by being a tighter 2-of-3-dim match).
  fitness: { emotionalVsRational: 0.65, visualImportance: 0.52, pricePositioning: 0.4 },
};

const STYLE_BUNDLE: Record<Exclude<DesignStyle, "corporate">, Omit<DesignSystem, "style">> = {
  saas: {
    heroVariant: "dashboard",
    featureVariant: "glass",
    benefitVariant: "glass",
    testimonialVariant: "glass",
    pricingVariant: "featured",
    primaryColor: "#3B82F6",
    background: "dark",
    borderRadius: "2xl",
  },

  agency: {
    heroVariant: "dashboard",
    featureVariant: "glass",
    benefitVariant: "glass",
    testimonialVariant: "cards",
    pricingVariant: "featured",
    primaryColor: "#7C3AED",
    background: "dark",
    borderRadius: "2xl",
  },

  luxury: {
    heroVariant: "minimal",
    featureVariant: "outline",
    benefitVariant: "outline",
    testimonialVariant: "outline",
    pricingVariant: "simple",
    primaryColor: "#D4AF37",
    background: "dark",
    borderRadius: "lg",
  },

  medical: {
    heroVariant: "image",
    featureVariant: "outline",
    benefitVariant: "outline",
    testimonialVariant: "outline",
    pricingVariant: "simple",
    primaryColor: "#2563EB",
    background: "light",
    borderRadius: "xl",
  },

  restaurant: {
    heroVariant: "product",
    featureVariant: "glass",
    benefitVariant: "glass",
    testimonialVariant: "glass",
    pricingVariant: "featured",
    primaryColor: "#EA580C",
    background: "dark",
    borderRadius: "2xl",
  },

  fitness: {
    heroVariant: "dashboard",
    featureVariant: "glass",
    benefitVariant: "glass",
    testimonialVariant: "glass",
    pricingVariant: "featured",
    primaryColor: "#DC2626",
    background: "dark",
    borderRadius: "2xl",
  },
};

export function buildDesignSystem(bi: BusinessIntelligenceProfile): DesignSystem {
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

  const style = pickBestMatch(STYLE_FINGERPRINTS, signals);

  return { style, ...STYLE_BUNDLE[style] };
}
