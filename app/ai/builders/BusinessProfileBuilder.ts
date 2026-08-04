import type { Industry, BusinessGoal, Tone, BusinessProfile } from "../types";
import { matchesWord } from "../utils/textMatching";

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
  beauty: {
    businessModel: "local_business",
    primaryGoal: "generate_leads",
    audience: "Local clients looking for personal care and grooming",
    tone: "friendly",
    priceLevel: "medium",
  },
  home_services: {
    businessModel: "local_business",
    primaryGoal: "generate_leads",
    audience: "Homeowners needing reliable, licensed help",
    tone: "professional",
    priceLevel: "medium",
  },
  consulting: {
    businessModel: "service",
    primaryGoal: "schedule_call",
    audience: "Business owners and professionals seeking expert guidance",
    tone: "professional",
    priceLevel: "high",
  },
  automotive: {
    businessModel: "local_business",
    primaryGoal: "generate_leads",
    audience: "Vehicle owners needing repairs or a new car",
    tone: "professional",
    priceLevel: "medium",
  },
  events: {
    businessModel: "service",
    primaryGoal: "schedule_call",
    audience: "Couples and hosts planning a memorable event",
    tone: "friendly",
    priceLevel: "high",
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
    // "agency" alone (not just "marketing agency"/"digital agency") added after the
    // agency-vs-restaurant known limitation (see BusinessProfileBuilder.test.ts): a
    // prompt like "A digital marketing agency helping restaurant owners increase online
    // orders" scored an exact 5-5 tie against restaurant's "restaurant owners" hit and
    // lost on tie-break priority order, even though "agency" was unambiguously the
    // subject. Any business describing itself as "an agency" should score at least that
    // one extra, decisive point - the same "X for Y"/"X serving Y" provider-signal
    // precedent startup's own keywords already follow.
    primary: ["marketing agency", "digital agency", "creative agency", "agency", "agência de marketing", "agência digital", "agência"],
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
  beauty: {
    primary: [
      "hair salon", "beauty salon", "nail salon", "barbershop", "barber shop", "spa",
      "salão de beleza", "cabeleireiro", "esthetician",
    ],
    secondary: [
      "haircut", "manicure", "pedicure", "facial", "waxing", "blowout", "hairstylist",
      "hairdresser", "skincare treatment", "grooming",
    ],
    negative: [],
  },
  home_services: {
    primary: [
      "plumber", "electrician", "hvac", "home services", "handyman", "landscaping company",
      "cleaning company", "pest control", "encanador", "eletricista",
    ],
    secondary: [
      "plumbing", "electrical repair", "air conditioning repair", "lawn care", "house cleaning",
      "roofing", "contractor", "renovation", "remodeling",
    ],
    negative: [],
  },
  consulting: {
    primary: [
      "business consultant", "consulting firm", "management consultant", "business coach",
      "executive coach", "life coach", "career coach", "consultoria empresarial",
    ],
    secondary: [
      "strategy consulting", "coaching program", "advisory services", "business strategy", "leadership coaching",
    ],
    negative: [],
  },
  automotive: {
    primary: [
      "auto repair", "car repair", "auto shop", "car dealership", "auto dealership", "mechanic shop",
      "oficina mecânica", "concessionária",
    ],
    secondary: ["oil change", "brake repair", "car wash", "used cars", "new cars", "vehicle inspection", "tire shop"],
    negative: [],
  },
  events: {
    primary: [
      "event planner", "wedding planner", "party planner", "event planning company", "wedding planning",
      "event management company",
    ],
    secondary: ["event coordination", "venue booking", "catering coordination", "wedding coordinator", "corporate events"],
    negative: [],
  },
};

// Tie-break precedence, deliberately independent of INDUSTRY_KEYWORDS's declaration
// order. Narrowest, hardest-to-fake vocabulary first; broadest/most overlap-prone last.
const CLASSIFICATION_PRIORITY: ClassifiableIndustry[] = [
  "medical",
  "law",
  "real_estate",
  "automotive",
  "home_services",
  "beauty",
  "fitness",
  "restaurant",
  "events",
  "ecommerce",
  "education",
  "consulting",
  "agency",
  "startup",
];

const PRIMARY_WEIGHT = 5;
const SECONDARY_WEIGHT = 2;
const NEGATIVE_WEIGHT = -4;
const CONFIDENCE_THRESHOLD = 4;

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
