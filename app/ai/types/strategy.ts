// Output types for the Hero/Trust/CTA/Pricing engines (app/ai/engines/). Each engine is
// a pure function of BusinessIntelligenceProfile (+ CompositionSignals, where a
// decision genuinely needs the already-blended composite rather than raw BI dims) that
// returns one of these - a structured object, not prose - which PromptBuilder.ts then
// turns into directives. This is the "AI reasons using structured objects, not raw
// prompts" principle applied one layer earlier: these decisions are made *before* the
// LLM is ever prompted, deterministically, and are never left for the model to infer.

export type HeadlineLength = "short" | "medium" | "long";
export type HeroImagery = "immersive" | "minimal" | "product-focused" | "data-focused";
export type Whitespace = "airy" | "balanced" | "dense";
export type ProofPlacement = "immediate" | "after-hero" | "deferred";

export interface HeroStrategy {
  emotionalIntensity: number;
  headlineLength: HeadlineLength;
  imagery: HeroImagery;
  whitespace: Whitespace;
  proofPlacement: ProofPlacement;
}

export type CredibilityApproach = "credentials" | "social-proof" | "data" | "guarantee";
export type ProofDensity = "minimal" | "moderate" | "heavy";
export type ObjectionHandling = "proactive" | "reactive" | "minimal";

// Deliberately absorbs what a first pass might have split into separate Authority,
// Social Proof and Objection engines - all three are facets of one question ("how does
// this page earn belief"), driven by the same handful of BI/signal dimensions
// (trustDifficulty, authorityRequirement, riskPerception, socialProofNeed,
// objectionPressure). Splitting them into independent modules would mean three engines
// re-deriving overlapping reads of the same signals instead of one coherent strategy.
export interface TrustStrategy {
  credibilityApproach: CredibilityApproach;
  proofDensity: ProofDensity;
  objectionHandling: ObjectionHandling;
  authorityEmphasis: number;
}

export type CtaStyle = "soft" | "direct" | "urgent";
export type CommitmentFraming = "low-commitment" | "considered" | "immediate-action";

export interface CtaStrategy {
  style: CtaStyle;
  commitmentFraming: CommitmentFraming;
  tone: string;
}

export type PricingPresentation = "exact-numbers" | "custom-quote" | "tiered-comparison";
export type PricingEmphasis = "understated" | "standard" | "prominent";

export interface PricingStrategy {
  presentation: PricingPresentation;
  anchoring: boolean;
  emphasis: PricingEmphasis;
}
