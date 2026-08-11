import { BENCHMARK_BUSINESSES } from "../app/benchmark/businesses";

// ARCHETYPE AUDIT — `npm run audit:archetypes`
//
// Decides an architecture question with data instead of intuition: does a local-business
// site generator need one builder per niche, a small library of page archetypes, or
// neither?
//
// The three outcomes are distinguishable, and they point at different code:
//
//   LARGE vocabulary, LOW reuse   -> each niche genuinely needs sections nobody else uses.
//                                    Per-niche builders. Cost grows linearly with niches.
//   SMALL vocabulary, FEW combos  -> a handful of fixed page shapes covers everything.
//                                    An archetype library. Fixed cost, fixed ceiling.
//   SMALL vocabulary, MANY combos -> the sections are shared; only their combination
//                                    differs. Compose per business from available content.
//                                    Fixed cost, no ceiling, no niche list to maintain.
//
// WHERE THE INPUT COMES FROM, AND ITS LIMIT
//
// The section list per business below is judgement, not measurement - there is no dataset
// of "what a plumber's website contains". It is written down per business, with the
// reasoning visible, so it can be argued with rather than trusted. What it is NOT is a
// description of what Suvka currently produces: that would just re-measure our own bug.
//
// The rule applied throughout: a section is listed only if a real business of that kind
// would have content for it. A plumber has no menu and no portfolio; a photographer has a
// portfolio and no opening hours worth publishing; a restaurant has both a menu and hours.

interface Need {
  id: string;
  sections: readonly string[];
  note: string;
}

const NEEDS: readonly Need[] = [
  { id: "restaurante", sections: ["hero", "gallery", "menu", "hours", "footer"], note: "food is the argument; people come for the menu and the address" },
  { id: "barbeiro", sections: ["hero", "gallery", "services", "hours", "booking", "footer"], note: "cuts are shown, priced and booked" },
  { id: "estetica", sections: ["hero", "gallery", "services", "hours", "booking", "footer"], note: "same shape as a barber: show, price, book" },
  { id: "hotel", sections: ["hero", "gallery", "rooms", "amenities", "hours", "booking", "footer"], note: "rooms are the product; amenities are the differentiator" },
  { id: "ginasio", sections: ["hero", "gallery", "services", "pricing", "hours", "footer"], note: "classes and memberships; recurring price is real here" },
  { id: "fotografo", sections: ["hero", "portfolio", "services", "pricing", "contact", "footer"], note: "portfolio IS the product; no walk-in hours" },
  { id: "arquitetura", sections: ["hero", "portfolio", "services", "about", "contact", "footer"], note: "projects and process; a studio is judged on past work" },
  { id: "canalizador", sections: ["hero", "services", "serviceArea", "contact", "footer"], note: "what you fix, where you go, how to call. No gallery, no hours" },
  { id: "eletricista", sections: ["hero", "services", "serviceArea", "contact", "footer"], note: "identical shape to a plumber" },
  { id: "advogado", sections: ["hero", "services", "about", "credentials", "contact", "footer"], note: "credentials are the sale; no gallery, no prices" },
  { id: "consultor", sections: ["hero", "services", "about", "credentials", "contact", "footer"], note: "same as a lawyer: expertise, proof, a way to talk" },
  { id: "coaching", sections: ["hero", "services", "about", "pricing", "contact", "footer"], note: "programmes have published prices; a lawyer's fees do not" },
  { id: "dentista", sections: ["hero", "services", "team", "hours", "booking", "contact", "footer"], note: "who treats you matters; appointments are booked" },
  { id: "fisioterapia", sections: ["hero", "services", "team", "hours", "booking", "contact", "footer"], note: "same clinical shape as a dentist" },
  { id: "psicologo", sections: ["hero", "about", "services", "booking", "contact", "footer"], note: "the practitioner is the product; no gallery, no team" },
  { id: "imobiliaria", sections: ["hero", "listings", "services", "team", "contact", "footer"], note: "listings are the product and change constantly" },
  { id: "wedding-planner", sections: ["hero", "portfolio", "services", "about", "contact", "footer"], note: "past weddings are the proof" },
  { id: "agencia", sections: ["hero", "portfolio", "services", "about", "contact", "footer"], note: "same shape as a wedding planner: work, offer, people" },
  { id: "ecommerce", sections: ["hero", "products", "about", "faq", "contact", "footer"], note: "products, shipping and returns questions" },
  { id: "saas", sections: ["hero", "features", "pricing", "faq", "cta", "footer"], note: "the only genuinely SaaS-shaped business in the corpus" },
];

const byBusiness = new Map(NEEDS.map((need) => [need.id, need]));
const missing = BENCHMARK_BUSINESSES.filter((business) => !byBusiness.has(business.id));
if (missing.length > 0) console.log("NOT COVERED:", missing.map((b) => b.id).join(", "), "\n");

// 1. VOCABULARY — how many distinct section types are needed at all?
const usage = new Map<string, string[]>();
for (const need of NEEDS) {
  for (const section of need.sections) {
    if (!usage.has(section)) usage.set(section, []);
    usage.get(section)!.push(need.id);
  }
}

console.log("=== 1. VOCABULARY: how many section types, and how often is each reused? ===");
const ranked = [...usage.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [section, businesses] of ranked) {
  const bar = "#".repeat(businesses.length);
  const flag = businesses.length === 1 ? `  <- unique to ${businesses[0]}` : "";
  console.log(`  ${section.padEnd(13)} ${String(businesses.length).padStart(2)}/20 ${bar.padEnd(20)}${flag}`);
}
const singleUse = ranked.filter(([, b]) => b.length === 1);
console.log(`\n  distinct section types : ${usage.size}`);
console.log(`  used by only ONE business : ${singleUse.length} (${singleUse.map(([s]) => s).join(", ") || "none"})`);
console.log(`  mean reuse : ${(NEEDS.reduce((a, n) => a + n.sections.length, 0) / usage.size).toFixed(1)} businesses per section type`);

// 2. COMBINATIONS — how many distinct page shapes, treating a page as a SET of sections?
const shapes = new Map<string, string[]>();
for (const need of NEEDS) {
  const key = [...need.sections].sort().join("+");
  if (!shapes.has(key)) shapes.set(key, []);
  shapes.get(key)!.push(need.id);
}

console.log("\n=== 2. COMBINATIONS: how many distinct page shapes? ===");
for (const [shape, businesses] of [...shapes.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(businesses.length)}x  ${businesses.join(", ")}`);
  console.log(`      ${shape.split("+").join(" ")}`);
}
console.log(`\n  distinct shapes: ${shapes.size}/20`);

// 3. COVERAGE — how much of the corpus do the N most common shapes explain?
console.log("\n=== 3. COVERAGE: how far do the top N shapes get us? ===");
const sizes = [...shapes.values()].map((b) => b.length).sort((a, b) => b - a);
let cumulative = 0;
sizes.forEach((size, index) => {
  cumulative += size;
  if (index < 6 || cumulative === 20) {
    console.log(`  top ${String(index + 1).padStart(2)} shapes -> ${String(cumulative).padStart(2)}/20 businesses (${((cumulative / 20) * 100).toFixed(0)}%)`);
  }
});

// 4. THE VERDICT
console.log("\n=== 4. WHAT THE NUMBERS ARGUE FOR ===");
const vocabulary = usage.size;
const combos = shapes.size;
const uniqueRatio = singleUse.length / vocabulary;

console.log(`  vocabulary ${vocabulary} types | ${combos} distinct shapes | ${(uniqueRatio * 100).toFixed(0)}% of types used once`);
if (uniqueRatio > 0.4) {
  console.log("  -> PER-NICHE BUILDERS. Most section types serve exactly one business; there is");
  console.log("     little to share, so sharing machinery would be overhead.");
} else if (combos <= 8) {
  console.log("  -> ARCHETYPE LIBRARY. A handful of fixed shapes covers the corpus.");
} else {
  console.log("  -> COMPOSITION. The vocabulary is small and heavily reused, but almost every");
  console.log("     business combines it differently. Neither a builder per niche nor a fixed");
  console.log("     archetype list fits: pick sections per business from the content that exists.");
}

// The cost each architecture implies as the business adds niches.
console.log("\n  cost to add the 21st niche:");
console.log(`    per-niche builder : a new file, ~150 lines, forever (20 niches = 20 files)`);
console.log(`    archetype library : free IF it matches an existing shape, else a new archetype`);
console.log(`    composition       : free unless it needs a section type that does not exist yet`);
