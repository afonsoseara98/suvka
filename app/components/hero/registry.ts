import type { ComponentType } from "react";
import type { HeroData } from "@/app/types/landing";
import type { ResolvedImage } from "@/app/ai/types/visual";
import type { ThemeConfig } from "@/app/styles/theme";

import HeroDashboard from "./HeroDashboard";
import HeroWebsite from "./HeroWebsite";
import HeroProduct from "./HeroProduct";

// Each imageStyle now resolves to a genuinely distinct scene, not one shared
// implementation. analytics/phone/abstract don't have bespoke scenes yet - they fall
// back to the closest existing one rather than duplicating a near-identical
// implementation (analytics -> dashboard, phone -> product, abstract -> website).
export const heroRegistry = {
  dashboard: HeroDashboard,
  analytics: HeroDashboard,

  product: HeroProduct,
  phone: HeroProduct,

  website: HeroWebsite,
  abstract: HeroWebsite,
} as const;

type SceneComponent = ComponentType<{ data: HeroData; theme: ThemeConfig }>;

// What the hero renders beside/below its text. Computed in one place so all three hero
// layouts cannot drift apart on it.
export type HeroVisualPlan =
  | { kind: "photo"; image: ResolvedImage }
  | { kind: "scene"; Scene: SceneComponent }
  | { kind: "none" };

export function planHeroVisual(data: HeroData): HeroVisualPlan {
  // No VisualIntent at all means a page generated before VisualIntelligence existed, or a
  // published snapshot frozen before it. Those keep rendering exactly what they always
  // rendered - a stored page's appearance must not change underneath its owner because we
  // shipped something.
  if (data.visual?.treatment !== "photo") {
    return { kind: "scene", Scene: heroRegistry[data.imageStyle] ?? heroRegistry.dashboard };
  }

  if (data.image) {
    return { kind: "photo", image: data.image };
  }

  // A photo was wanted and none is available (no provider configured, or the lookup found
  // nothing). "none" is a real design decision, not a failure state: a centered editorial
  // hero is a legitimate, common, good-looking treatment for a local business. Falling
  // back to a fake software mockup here is precisely the defect this whole module exists
  // to remove - a bakery must never be shown an analytics dashboard.
  return { kind: "none" };
}
