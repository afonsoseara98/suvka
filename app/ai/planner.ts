export type PlannerResult = {
  industry: string;

  tone:
    | "professional"
    | "modern"
    | "bold"
    | "luxury"
    | "minimal";

  complexity:
    | "simple"
    | "medium"
    | "advanced";

  colorPalette:
    | "blue"
    | "purple"
    | "green"
    | "red"
    | "dark";

  heroLayout:
    | "dashboard"
    | "analytics"
    | "website"
    | "phone"
    | "product"
    | "abstract";

  ctaStyle:
    | "solid"
    | "outline"
    | "glass";

  pricingStyle:
    | "cards"
    | "comparison"
    | "enterprise";

  background:
    | "gradient"
    | "solid"
    | "mesh";

  iconStyle:
    | "minimal"
    | "duotone"
    | "filled";

  animationLevel:
    | "none"
    | "subtle"
    | "high";

  spacing:
    | "compact"
    | "comfortable"
    | "large";
};

export function buildPlanner(
  industry: string
): PlannerResult {
  return {
    industry,

    tone: "professional",

    complexity: "medium",

    colorPalette: "blue",

    heroLayout: "dashboard",

    ctaStyle: "solid",

    pricingStyle: "cards",

    background: "gradient",

    iconStyle: "minimal",

    animationLevel: "subtle",

    spacing: "comfortable",
  };
}