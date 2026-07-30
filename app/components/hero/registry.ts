import HeroDashboard from "./HeroDashboard";

export const heroRegistry = {
  dashboard: HeroDashboard,

  analytics: HeroDashboard,
  product: HeroDashboard,
  phone: HeroDashboard,
  website: HeroDashboard,
  abstract: HeroDashboard,
} as const;