import type { BusinessKnowledge } from "../types/knowledge";

// The only knowledge object never selected via a keyword match - it's what a business
// gets when BusinessProfileBuilder.ts's classifier genuinely can't tell what industry
// this is. Deliberately vertical-agnostic (never SaaS-flavored, never any specific
// trade) rather than a stand-in for any one industry - see KnowledgeResolver.ts and
// docs/noctra-signal-trace-audit-v1.md finding #2 for why defaulting to a real
// industry's knowledge here was the wrong fallback.
export const genericKnowledge: BusinessKnowledge = {
  industry: "generic",

  primaryCTA: "Get Started",

  heroStyle: "Team at work",

  trustSignals: [
    "Trusted by satisfied customers",
    "Reliable service",
    "Personalised attention",
    "Proven results",
  ],

  commonFeatures: [
    "Personalised service",
    "Responsive support",
    "Flexible options",
    "Proven track record",
  ],

  commonBenefits: [
    "Save time",
    "Peace of mind",
    "Trusted professionals",
    "Expert advice",
  ],

  faqTopics: [
    "Pricing",
    "Process",
    "Support",
    "Consultation",
  ],

  keywords: [
    "Business",
    "Service",
    "Local",
    "Professional",
  ],
};
