import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { CompositionSignals } from "../types/signals";
import type { CtaStrategy, CtaStyle, CommitmentFraming } from "../types/strategy";

// CTA ENGINE
//
// Distinct from LayoutIntelligence.ts's ctaCountFor/insertCtas (which decide HOW MANY
// CTAs appear and WHERE in the section order - a structural decision, unchanged here).
// This engine decides the STYLE of those CTAs: how hard they push, and what kind of
// commitment they're framed as asking for. Two different decisions that happen to both
// be about CTAs, kept in two places on purpose rather than one engine doing both.

function resolveStyle(bi: BusinessIntelligenceProfile, signals: CompositionSignals): CtaStyle {
  if (signals.urgency >= 0.65) return "urgent";
  if (bi.decisionComplexity >= 0.55 || bi.trustDifficulty >= 0.6) return "soft";
  return "direct";
}

function resolveCommitmentFraming(bi: BusinessIntelligenceProfile, signals: CompositionSignals): CommitmentFraming {
  if (bi.riskPerception >= 0.6 || bi.decisionComplexity >= 0.6) return "considered";
  if (signals.urgency >= 0.65) return "immediate-action";
  return "low-commitment";
}

const STYLE_DIRECTIVE: Record<CtaStyle, string> = {
  urgent: "Push for immediate action",
  soft: "Invite the next step without pressure",
  direct: "Ask clearly and directly",
};

export function resolveCtaStrategy(bi: BusinessIntelligenceProfile, signals: CompositionSignals): CtaStrategy {
  const style = resolveStyle(bi, signals);
  const commitmentFraming = resolveCommitmentFraming(bi, signals);

  return {
    style,
    commitmentFraming,
    tone: `${STYLE_DIRECTIVE[style]} - frame it as ${commitmentFraming.replace("-", " ")}`,
  };
}

export function describeCtaStrategyForPrompt(strategy: CtaStrategy): string[] {
  return [`CTA style: ${strategy.style}`, `Commitment framing: ${strategy.commitmentFraming}`, strategy.tone];
}
