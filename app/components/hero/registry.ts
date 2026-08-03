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
