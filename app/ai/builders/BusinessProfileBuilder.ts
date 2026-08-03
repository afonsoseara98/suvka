import type { Industry, BusinessGoal, Tone, BusinessProfile } from "../types";

interface IndustryProfile {
  businessModel: string;
  primaryGoal: BusinessGoal;
  audience: string;
  tone: Tone;
  priceLevel: "low" | "medium" | "high" | "premium";
}

const INDUSTRY_PROFILES: Record<Industry, IndustryProfile> = {
  startup: {
    businessModel: "saas",
    primaryGoal: "book_demo",
    audience: "Startup founders and product teams",
    tone: "modern",
    priceLevel: "medium",
  },
  agency: {
    businessModel: "service",
    primaryGoal: "schedule_call",
    audience: "Small and medium businesses",
    tone: "bold",
    priceLevel: "medium",
  },
  medical: {
    businessModel: "service",
    primaryGoal: "book_consultation",
    audience: "Families and professionals",
    tone: "professional",
    priceLevel: "premium",
  },
  restaurant: {
    businessModel: "local_business",
    primaryGoal: "generate_leads",
    audience: "Local customers",
    tone: "friendly",
    priceLevel: "medium",
  },
  fitness: {
    businessModel: "local_business",
    primaryGoal: "generate_leads",
    audience: "People wanting better health and performance",
    tone: "bold",
    priceLevel: "medium",
  },
  law: {
    businessModel: "service",
    primaryGoal: "book_consultation",
    audience: "Individuals and businesses seeking legal advice",
    tone: "professional",
    priceLevel: "premium",
  },
  real_estate: {
    businessModel: "service",
    primaryGoal: "schedule_call",
    audience: "Home buyers and sellers",
    tone: "professional",
    priceLevel: "high",
  },
  ecommerce: {
    businessModel: "ecommerce",
    primaryGoal: "sell_product",
    audience: "Online shoppers",
    tone: "modern",
    priceLevel: "medium",
  },
  education: {
    businessModel: "online_platform",
    primaryGoal: "collect_emails",
    audience: "Students and lifelong learners",
    tone: "friendly",
    priceLevel: "medium",
  },
  generic: {
    businessModel: "business",
    primaryGoal: "generate_leads",
    audience: "General audience",
    tone: "modern",
    priceLevel: "medium",
  },
};

type ClassifiableIndustry = Exclude<Industry, "generic">;

interface IndustryKeywords {
  primary: string[];
  secondary: string[];
  negative: string[];
}

const INDUSTRY_KEYWORDS: Record<ClassifiableIndustry, IndustryKeywords> = {
  medical: {
    primary: ["dentist", "dentista", "dental", "clinic", "clínica", "doctor", "médico", "physician"],
    secondary: ["patient", "paciente", "appointment", "consulta", "healthcare", "saúde", "hospital", "treatment"],
    negative: [],
  },
  law: {
    primary: ["law firm", "lawyer", "attorney", "advocacia", "advogado", "solicitor"],
    secondary: ["legal advice", "jurídico", "litigation", "contract", "legal"],
    negative: [],
  },
  real_estate: {
    primary: ["real estate", "realtor", "imobiliária", "imóveis", "property for sale"],
    secondary: ["homes for sale", "buyer", "seller", "corretor", "housing market"],
    negative: [],
  },
  fitness: {
    primary: ["gym", "fitness", "academia", "ginásio", "personal trainer", "personal training"],
    secondary: ["workout", "treino", "crossfit", "yoga studio", "nutrition coaching", "musculação"],
    negative: ["course", "curso", "online course"],
  },
  restaurant: {
    primary: ["restaurant", "restaurante", "café", "cafe", "bistro"],
    secondary: ["menu", "reservation", "reserva", "chef", "dining", "cuisine", "pizzeria"],
    negative: [],
  },
  ecommerce: {
    primary: ["online store", "ecommerce", "e-commerce", "loja online", "loja virtual", "webshop"],
    secondary: ["buy online", "shipping", "checkout", "comprar online", "product catalog"],
    negative: [],
  },
  education: {
    primary: ["online course", "learning platform", "academy", "curso online", "plataforma de ensino"],
    secondary: ["tutoring", "mentorship", "students", "aulas", "certificate", "ensino"],
    negative: ["gym", "workout", "academia de ginástica"],
  },
  agency: {
    primary: ["marketing agency", "digital agency", "creative agency", "agência de marketing", "agência digital"],
    secondary: ["seo", "paid ads", "social media management", "branding", "consultoria"],
    negative: [],
  },
  startup: {
    primary: [
      "saas",
      "startup",
      "software platform",
      "tech company",
      "analytics platform",
      "software for",
      "platform for",
      "built for",
      "crm",
      "erp",
      "ai-powered",
    ],
    secondary: ["b2b", "dashboard", "api", "plataforma de software", "customer churn"],
    negative: [],
  },
};

// Tie-break precedence, deliberately independent of INDUSTRY_KEYWORDS's declaration
// order. Narrowest, hardest-to-fake vocabulary first; broadest/most overlap-prone last.
const CLASSIFICATION_PRIORITY: ClassifiableIndustry[] = [
  "medical",
  "law",
  "real_estate",
  "fitness",
  "restaurant",
  "ecommerce",
  "education",
  "agency",
  "startup",
];

const PRIMARY_WEIGHT = 5;
const SECONDARY_WEIGHT = 2;
const NEGATIVE_WEIGHT = -4;
const CONFIDENCE_THRESHOLD = 4;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesWord(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(text);
}

function scoreEntry(text: string, keywords: IndustryKeywords): number {
  const primaryHits = keywords.primary.filter((keyword) => matchesWord(text, keyword));
  const secondaryHits = keywords.secondary.filter((keyword) => matchesWord(text, keyword));
  const negativeHits = keywords.negative.filter((keyword) => matchesWord(text, keyword));

  return (
    primaryHits.length * PRIMARY_WEIGHT +
    secondaryHits.length * SECONDARY_WEIGHT +
    negativeHits.length * NEGATIVE_WEIGHT
  );
}

function classifyIndustry(prompt: string): Industry {
  const text = prompt.toLowerCase();

  let best: { industry: ClassifiableIndustry; score: number } | null = null;

  for (const industry of CLASSIFICATION_PRIORITY) {
    const score = scoreEntry(text, INDUSTRY_KEYWORDS[industry]);

    if (best === null || score > best.score) {
      best = { industry, score };
    }
  }

  return best !== null && best.score >= CONFIDENCE_THRESHOLD ? best.industry : "generic";
}

export function buildBusinessProfile(prompt: string): BusinessProfile {
  const industry = classifyIndustry(prompt);
  const facts = INDUSTRY_PROFILES[industry];

  return {
    industry,
    ...facts,
  };
}
