import { BENCHMARK_BUSINESSES } from "../app/benchmark/businesses";
import { buildBusinessProfile } from "../app/ai/builders/BusinessProfileBuilder";
import { buildBusinessIntelligence } from "../app/ai/builders/BusinessIntelligence";
import type { BusinessIntelligenceProfile } from "../app/ai/types/businessIntelligence";

// ORDERING AUDIT — permanent instrument. `npm run audit:ordering`
//
// Calibration amplifies whatever is there. If the analysers rank businesses correctly and
// merely quietly, amplifying is safe and is exactly the fix. If they rank them WRONGLY,
// amplifying makes twenty pages that differ confidently and incorrectly - which is worse
// than today, because it looks like differentiation without being it.
//
// So this asserts the rankings a person would agree with before looking at any code. It is
// the pre-flight for any change to signal amplitude, and the regression guard afterwards.
//
// Each expectation is a claim about the world, not about the implementation: an emergency
// plumber IS more urgent than an architecture studio, whatever the code currently says.

type Dimension = keyof BusinessIntelligenceProfile;

interface Expectation {
  dimension: Dimension;
  higher: string;
  lower: string;
  why: string;
}

const EXPECTATIONS: Expectation[] = [
  {
    dimension: "purchaseUrgency",
    higher: "canalizador",
    lower: "arquitetura",
    why: "a burst pipe is today; a house design is a year",
  },
  {
    dimension: "purchaseUrgency",
    higher: "eletricista",
    lower: "coaching",
    why: "electrical faults are emergencies; coaching is considered",
  },
  {
    dimension: "authorityRequirement",
    higher: "advogado",
    lower: "restaurante",
    why: "credentials are the sale for a lawyer, irrelevant for a dining room",
  },
  {
    dimension: "authorityRequirement",
    higher: "dentista",
    lower: "barbeiro",
    why: "a dentist is licensed and clinical; a barber is judged on the result",
  },
  {
    dimension: "emotionalVsRational",
    higher: "wedding-planner",
    lower: "saas",
    why: "a wedding is bought on feeling, software on specification",
  },
  {
    dimension: "emotionalVsRational",
    higher: "restaurante",
    lower: "consultor",
    why: "appetite versus business case",
  },
  {
    dimension: "decisionComplexity",
    higher: "arquitetura",
    lower: "restaurante",
    why: "commissioning a building has many stages; booking a table has none",
  },
  {
    dimension: "decisionComplexity",
    higher: "imobiliaria",
    lower: "barbeiro",
    why: "buying property involves finance, surveys and a partner; a haircut does not",
  },
  {
    dimension: "visualImportance",
    higher: "fotografo",
    lower: "canalizador",
    why: "a photographer IS their portfolio; a plumber is judged on turning up",
  },
  {
    dimension: "riskPerception",
    higher: "dentista",
    lower: "restaurante",
    why: "choosing wrong costs your teeth, versus one disappointing dinner",
  },
  {
    dimension: "trustDifficulty",
    higher: "psicologo",
    lower: "ecommerce",
    why: "therapy needs hard-won trust; a product page needs a return policy",
  },
  {
    dimension: "offerComplexity",
    higher: "consultor",
    lower: "barbeiro",
    why: "bespoke engagements versus a fixed price list",
  },
];

const profiles = new Map<string, BusinessIntelligenceProfile>();
for (const business of BENCHMARK_BUSINESSES) {
  const profile = buildBusinessProfile(business.prompt);
  profiles.set(business.id, buildBusinessIntelligence(business.prompt, profile));
}

let correct = 0;
let ties = 0;
let wrong = 0;

console.log("expectation".padEnd(58) + "higher   lower   delta   verdict");
for (const e of EXPECTATIONS) {
  const a = profiles.get(e.higher)?.[e.dimension] as number | undefined;
  const b = profiles.get(e.lower)?.[e.dimension] as number | undefined;

  if (typeof a !== "number" || typeof b !== "number") {
    console.log(`${(e.higher + " > " + e.lower + " (" + e.dimension + ")").padEnd(58)} MISSING BUSINESS`);
    continue;
  }

  const delta = a - b;
  // A difference this small cannot survive any threshold downstream; treating it as a
  // correct ranking would be flattering the analyser.
  const isTie = Math.abs(delta) < 0.02;
  const verdict = isTie ? "TIE" : delta > 0 ? "ok" : "WRONG";
  if (isTie) ties++;
  else if (delta > 0) correct++;
  else wrong++;

  console.log(
    `${(e.higher + " > " + e.lower + "  (" + e.dimension + ")").padEnd(58)}` +
      a.toFixed(2).padStart(6) +
      b.toFixed(2).padStart(8) +
      (delta >= 0 ? "+" : "") +
      delta.toFixed(2).padStart(7) +
      "   " +
      verdict +
      (verdict === "ok" ? "" : `   <- ${e.why}`)
  );
}

console.log(`\n=== ${correct} correct | ${ties} indistinguishable | ${wrong} inverted (of ${EXPECTATIONS.length}) ===`);
if (wrong > 0) {
  console.log("  Amplifying now would make these confidently wrong. Fix the ranking first.");
} else if (ties > correct) {
  console.log("  Rankings are not wrong, they are absent. Amplification cannot create signal that is not there.");
} else {
  console.log("  Rankings hold. The signal is correct and quiet - amplification is the right fix.");
}
