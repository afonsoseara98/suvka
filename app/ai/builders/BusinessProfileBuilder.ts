import type { BusinessProfile } from "../types";

export function buildBusinessProfile(
  prompt: string
): BusinessProfile {

  const text = prompt.toLowerCase();

  if (
    text.includes("dentista") ||
    text.includes("clínica") ||
    text.includes("hospital")
  ) {
    return {
      industry: "medical",
      businessModel: "service",

      primaryGoal: "book_consultation",

      audience: "Families and professionals",

      tone: "professional",

      priceLevel: "premium",

      trustSignals: [
        "Certified professionals",
        "Verified reviews",
        "Years of experience",
      ],

      recommendedTheme: "medical",

      recommendedHeroVariant: "centered",

      recommendedCTA: "Book Consultation",
    };
  }

  if (
    text.includes("restaurante") ||
    text.includes("restaurant")
  ) {
    return {
      industry: "restaurant",
      businessModel: "local_business",

      primaryGoal: "generate_leads",

      audience: "Local customers",

      tone: "friendly",

      priceLevel: "medium",

      trustSignals: [
        "Local reputation",
        "Fresh ingredients",
      ],

      recommendedTheme: "restaurant",

      recommendedHeroVariant: "split",

      recommendedCTA: "Reserve a Table",
    };
  }

  return {
    industry: "generic",

    businessModel: "business",

    primaryGoal: "generate_leads",

    audience: "General audience",

    tone: "modern",

    priceLevel: "medium",

    trustSignals: [
      "Trusted by customers",
    ],

    recommendedTheme: "startup",

    recommendedHeroVariant: "centered",

    recommendedCTA: "Get Started",
  };
}