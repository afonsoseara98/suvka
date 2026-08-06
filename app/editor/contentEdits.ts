import type { HeroData, FooterData, PricingPlan } from "@/app/types/landing";

// CONTENT EDITS
//
// operations.ts's UpdateContent always replaces instance.content wholesale (see its
// header comment) - there's no field-level patch operation, deliberately, since content
// shapes differ per section type and a generic "patch" would need to know each shape
// anyway. These are the small, pure, per-shape rebuilders every EditableText commit
// site calls to go from "one field changed" to "the full content UpdateContent needs" -
// no React, no side effects, fully unit-tested in isolation from the editor UI.

export function updateHeroField(content: HeroData, field: keyof HeroData, value: string): HeroData {
  return { ...content, [field]: value };
}

export function updateArrayItemField<T extends object>(
  items: readonly T[],
  index: number,
  field: keyof T,
  value: string
): T[] {
  return items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
}

export function updateFooterField(content: FooterData, field: keyof FooterData, value: string): FooterData {
  return { ...content, [field]: value };
}

// PricingPlan.features is a plain string[], one level deeper than name/price - a feature
// line's identity is (planIndex, featureIndex), not a single index into the top-level
// array the way updateArrayItemField assumes.
export function updatePlanFeature(
  plans: readonly PricingPlan[],
  planIndex: number,
  featureIndex: number,
  value: string
): PricingPlan[] {
  return plans.map((plan, i) =>
    i === planIndex ? { ...plan, features: plan.features.map((feature, j) => (j === featureIndex ? value : feature)) } : plan
  );
}
