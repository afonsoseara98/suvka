export type DesignStyle =
  | "saas"
  | "agency"
  | "luxury"
  | "corporate"
  | "medical"
  | "restaurant"
  | "fitness";

export type HeroVariant =
  | "dashboard"
  | "image"
  | "product"
  | "phone"
  | "minimal";

export type CardStyle =
  | "glass"
  | "solid"
  | "outline"
  | "cards";

export interface DesignSystem {
  style: DesignStyle;

  heroVariant: HeroVariant;

  featureVariant: CardStyle;

  benefitVariant: CardStyle;

  testimonialVariant: CardStyle;

  pricingVariant:
    | "featured"
    | "simple";

  primaryColor: string;

  background:
    | "light"
    | "dark";

  borderRadius:
    | "lg"
    | "xl"
    | "2xl";
}