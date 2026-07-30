export type LandingComponent =
  | "hero"
  | "logoCloud"
  | "stats"
  | "features"
  | "benefits"
  | "gallery"
  | "pricing"
  | "testimonials"
  | "faq"
  | "cta"
  | "contact"
  | "footer";

export function buildComponentPlan(
  industry: string
): LandingComponent[] {

  switch (industry.toLowerCase()) {

    case "saas":
      return [
        "hero",
        "logoCloud",
        "stats",
        "features",
        "pricing",
        "testimonials",
        "faq",
        "cta",
        "footer",
      ];

    case "restaurant":
      return [
        "hero",
        "gallery",
        "testimonials",
        "contact",
        "footer",
      ];

    case "gym":
      return [
        "hero",
        "benefits",
        "pricing",
        "testimonials",
        "cta",
        "footer",
      ];

    default:
      return [
        "hero",
        "features",
        "pricing",
        "testimonials",
        "faq",
        "footer",
      ];

  }

}