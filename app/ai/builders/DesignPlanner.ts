import type { DesignSystem } from "@/app/types/design";
import type { Industry } from "../types";

export function buildDesignSystem(
  industry: Industry
): DesignSystem {
  switch (industry) {
    case "medical":
      return {
        style: "medical",

        heroVariant: "image",

        featureVariant: "outline",

        benefitVariant: "outline",

        testimonialVariant: "outline",

        pricingVariant: "simple",

        primaryColor: "#2563EB",

        background: "light",

        borderRadius: "xl",
      };

    case "restaurant":
      return {
        style: "restaurant",

        heroVariant: "product",

        featureVariant: "glass",

        benefitVariant: "glass",

        testimonialVariant: "glass",

        pricingVariant: "featured",

        primaryColor: "#EA580C",

        background: "dark",

        borderRadius: "2xl",
      };

    case "fitness":
      return {
        style: "fitness",

        heroVariant: "dashboard",

        featureVariant: "glass",

        benefitVariant: "glass",

        testimonialVariant: "glass",

        pricingVariant: "featured",

        primaryColor: "#DC2626",

        background: "dark",

        borderRadius: "2xl",
      };

    case "agency":
      return {
        style: "agency",

        heroVariant: "dashboard",

        featureVariant: "glass",

        benefitVariant: "glass",

        testimonialVariant: "cards",

        pricingVariant: "featured",

        primaryColor: "#7C3AED",

        background: "dark",

        borderRadius: "2xl",
      };

    case "startup":
    case "law":
    case "real_estate":
    case "ecommerce":
    case "education":
    case "generic":
    default:
      return {
        style: "saas",

        heroVariant: "dashboard",

        featureVariant: "glass",

        benefitVariant: "glass",

        testimonialVariant: "glass",

        pricingVariant: "featured",

        primaryColor: "#3B82F6",

        background: "dark",

        borderRadius: "2xl",
      };
  }
}
