import type { Section } from "@/app/types/landing";

export function buildSections(
  industry: string
): Section[] {

  switch (industry) {

    case "restaurant":
      return [
        { type: "hero", variant: "split" },
        { type: "features", variant: "grid" },
        { type: "testimonials", variant: "cards" },
        { type: "benefits", variant: "list" },
        { type: "faq", variant: "accordion" },
        { type: "footer", variant: "simple" },
      ];

    case "medical":
      return [
        { type: "hero", variant: "centered" },
        { type: "benefits", variant: "list" },
        { type: "features", variant: "grid" },
        { type: "testimonials", variant: "cards" },
        { type: "faq", variant: "accordion" },
        { type: "footer", variant: "simple" },
      ];

    case "fitness":
      return [
        { type: "hero", variant: "split" },
        { type: "stats", variant: "cards" },
        { type: "benefits", variant: "list" },
        { type: "pricing", variant: "premium" },
        { type: "faq", variant: "accordion" },
        { type: "footer", variant: "simple" },
      ];

    case "law":
      return [
        { type: "hero", variant: "centered" },
        { type: "benefits", variant: "list" },
        { type: "testimonials", variant: "cards" },
        { type: "faq", variant: "accordion" },
        { type: "footer", variant: "simple" },
      ];

    case "startup":
    default:
      return [
        { type: "hero", variant: "centered" },
        { type: "stats", variant: "cards" },
        { type: "features", variant: "grid" },
        { type: "benefits", variant: "list" },
        { type: "testimonials", variant: "cards" },
        { type: "pricing", variant: "premium" },
        { type: "faq", variant: "accordion" },
        { type: "footer", variant: "simple" },
      ];
  }

}