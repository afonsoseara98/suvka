// The fixed, versioned 20-business dataset for Benchmark v1 - the user's exact list.
// Each `prompt` is the ONE shared briefing every arm (Suvka, ChatGPT-equivalent,
// Claude-equivalent) receives verbatim - "mesmo prompt, mesmo objetivo." Plain,
// natural-language descriptions, same register as the Diversity Engine's stress-test
// corpus (app/ai/builders/DiversityStressTest.test.ts) - not keyword-stuffed.
//
// Deliberately a mix of industries Suvka's BusinessProfileBuilder classifies
// confidently (medical, law, restaurant, fitness, real_estate, beauty, home_services,
// consulting, agency, ecommerce, startup, events) and ones that land on "generic"
// (psychologist, hotel, physiotherapy, architecture) - the benchmark should surface
// whether that gap actually shows up in generation quality, not just assume it does.
export interface BenchmarkBusiness {
  id: string;
  label: string;
  prompt: string;
}

export const BENCHMARK_BUSINESSES: readonly BenchmarkBusiness[] = [
  {
    id: "advogado",
    label: "Advogado",
    prompt: "A small law firm helping local families with wills, estate planning and family law matters.",
  },
  {
    id: "dentista",
    label: "Dentista",
    prompt: "A family dental clinic offering checkups, cleanings and cosmetic dentistry for all ages.",
  },
  {
    id: "barbeiro",
    label: "Barbeiro",
    prompt: "A classic barbershop offering haircuts, beard trims and hot towel shaves for the modern gentleman.",
  },
  {
    id: "wedding-planner",
    label: "Wedding Planner",
    prompt: "A wedding planner helping couples plan their dream wedding from start to finish, stress-free.",
  },
  {
    id: "fotografo",
    label: "Fotógrafo",
    prompt: "A freelance photographer specializing in portraits, events and creative photography sessions.",
  },
  {
    id: "saas",
    label: "SaaS",
    prompt: "A project management SaaS platform helping small teams track tasks, deadlines and team workload.",
  },
  {
    id: "agencia",
    label: "Agência",
    prompt: "A digital marketing agency helping small businesses grow through social media, SEO and paid ads.",
  },
  {
    id: "restaurante",
    label: "Restaurante",
    prompt: "A neighborhood Italian restaurant serving fresh, homemade pasta and wood-fired pizza.",
  },
  {
    id: "imobiliaria",
    label: "Imobiliária",
    prompt: "A real estate agency helping first-time buyers and sellers navigate the local housing market.",
  },
  {
    id: "ginasio",
    label: "Ginásio",
    prompt: "A local gym offering personal training, group classes and modern equipment for all fitness levels.",
  },
  {
    id: "eletricista",
    label: "Eletricista",
    prompt: "A licensed electrician offering residential and commercial electrical repairs and installations.",
  },
  {
    id: "canalizador",
    label: "Canalizador",
    prompt: "A local plumber offering emergency repairs, installations and maintenance for homes and businesses.",
  },
  {
    id: "consultor",
    label: "Consultor",
    prompt: "A business consultant helping small companies improve operations and grow revenue.",
  },
  {
    id: "psicologo",
    label: "Psicólogo",
    prompt: "A licensed psychologist offering individual therapy sessions for anxiety, stress and personal growth.",
  },
  {
    id: "hotel",
    label: "Hotel",
    prompt: "A boutique hotel offering a relaxing stay with personalized service in the heart of the city.",
  },
  {
    id: "fisioterapia",
    label: "Fisioterapia",
    prompt: "A physiotherapy clinic helping patients recover from injuries and improve mobility.",
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    prompt: "An online store selling handmade, sustainable home goods and decor.",
  },
  {
    id: "estetica",
    label: "Estética",
    prompt: "An aesthetics studio offering skincare treatments, facials and beauty services.",
  },
  {
    id: "coaching",
    label: "Coaching",
    prompt: "A life coach helping ambitious professionals overcome obstacles and reach their goals.",
  },
  {
    id: "arquitetura",
    label: "Arquitetura",
    prompt: "An architecture studio designing modern, sustainable homes and residential renovations.",
  },
];
