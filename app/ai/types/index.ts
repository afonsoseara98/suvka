

export type Industry =
  | "startup"
  | "agency"
  | "medical"
  | "restaurant"
  | "fitness"
  | "law"
  | "real_estate"
  | "ecommerce"
  | "education"
  | "generic";

export type BusinessGoal =
  | "generate_leads"
  | "book_consultation"
  | "book_demo"
  | "sell_product"
  | "collect_emails"
  | "schedule_call";

export type Tone =
  | "professional"
  | "friendly"
  | "luxury"
  | "modern"
  | "bold";

export interface BusinessProfile {
  industry: Industry;

  businessModel: string;

  primaryGoal: BusinessGoal;

  audience: string;

  tone: Tone;

  priceLevel: "low" | "medium" | "high" | "premium";
}

