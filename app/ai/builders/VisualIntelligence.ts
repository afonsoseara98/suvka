import type { BusinessProfile, Industry } from "../types";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";
import type { StrategyDNA } from "../types/dna";
import type { ImageOrientation, ImageTreatment, VisualIntent } from "../types/visual";
import type { HeroImageStyle } from "@/app/types/landing";
import { clamp01 } from "../utils/math";

// VISUAL INTELLIGENCE
//
// Decides WHAT a generated page shows, the way the rest of the pipeline decides how it
// looks. See app/ai/types/visual.ts for the measured defect this replaces.
//
// WHY THIS ONE LOOKUP IS NOT THE THING THE ARCHITECTURE FORBIDS
//
// Every other "pick by industry" table in this codebase was deleted on purpose: theme,
// layout, spacing and structure are all compiled continuously from StrategyDNA, because a
// design decision has a continuum ("more elevation", "warmer accent") and a label
// destroys it. The subject of a photograph does not. There is no interpolation between
// bread and teeth, and no continuous axis whose midpoint is "half a restaurant". Which
// noun a business is photographed as is a SEMANTIC fact about the business, not a design
// decision, and semantics are exactly where a vocabulary is the honest representation.
//
// What stays continuous is everything that can be: the qualifier applied to that noun,
// the treatment, and the orientation are all derived from BusinessIntelligenceProfile and
// StrategyDNA - which is what makes "Luxury Wedding Photographer" and "Budget Wedding
// Photographer" ask for visibly different pictures despite sharing an industry.
interface IndustryVisuals {
  // Ordered most-specific first. A provider walks this list until something matches, so a
  // miss on the evocative phrase still lands on a correct, generic picture instead of an
  // empty hero.
  scenes: readonly [string, ...string[]];

  // Applied at the extremes of pricePositioning. Deliberately different words rather than
  // "luxury"/"cheap" - stock libraries index on mood, and "affordable dentist" returns
  // worse pictures than "friendly dentist".
  premium: string;
  everyday: string;
}

const VISUAL_VOCABULARY: Record<Industry, IndustryVisuals> = {
  startup: {
    scenes: ["modern software team working in a bright office", "technology office workspace", "laptop on a clean desk"],
    premium: "sleek",
    everyday: "friendly",
  },
  agency: {
    scenes: ["creative team collaborating in a design studio", "creative agency workspace", "designer at work"],
    premium: "award winning",
    everyday: "collaborative",
  },
  medical: {
    scenes: ["doctor talking with a patient in a bright modern clinic", "modern medical clinic interior", "healthcare professional"],
    premium: "private",
    everyday: "friendly",
  },
  restaurant: {
    scenes: ["beautifully plated dish in a warm restaurant dining room", "restaurant interior with set tables", "fresh food close up"],
    premium: "fine dining",
    everyday: "rustic",
  },
  fitness: {
    scenes: ["person training with weights in a modern gym", "bright fitness studio interior", "athlete exercising"],
    premium: "boutique",
    everyday: "energetic",
  },
  law: {
    scenes: ["lawyer meeting a client in a modern office", "law office interior with bookshelves", "professional handshake"],
    premium: "distinguished",
    everyday: "approachable",
  },
  real_estate: {
    scenes: ["bright modern living room interior", "attractive house exterior at golden hour", "modern architecture"],
    premium: "luxury",
    everyday: "welcoming",
  },
  ecommerce: {
    scenes: ["product still life on a clean minimal background", "styled product flat lay", "packaged products"],
    premium: "premium",
    everyday: "colourful",
  },
  education: {
    scenes: ["student studying with a laptop at a bright desk", "modern classroom", "person learning and taking notes"],
    premium: "focused",
    everyday: "cheerful",
  },
  beauty: {
    scenes: ["beauty salon treatment in a calm modern studio", "spa interior with soft lighting", "skincare close up"],
    premium: "luxury",
    everyday: "fresh",
  },
  home_services: {
    scenes: ["skilled tradesperson working in a home", "professional tools and workmanship close up", "home repair work"],
    premium: "master craftsman",
    everyday: "reliable",
  },
  consulting: {
    scenes: ["consultant presenting to a client across a table", "professional business meeting", "modern office conversation"],
    premium: "executive",
    everyday: "practical",
  },
  automotive: {
    scenes: ["car being detailed in a professional garage", "mechanic working on a vehicle", "clean car close up"],
    premium: "performance",
    everyday: "trusted",
  },
  events: {
    scenes: ["elegant celebration with guests and warm lighting", "beautifully styled event table setting", "party venue decorated"],
    premium: "luxury",
    everyday: "joyful",
  },
  generic: {
    scenes: ["professional at work in a bright modern workspace", "modern office interior", "professional workplace"],
    premium: "refined",
    everyday: "approachable",
  },
};

// Only software products genuinely want a rendered interface in the hero - and for them
// it is the RIGHT answer, which is why the existing hero scenes (HeroDashboard/
// HeroWebsite/HeroProduct) are kept rather than deleted. Every other industry sells
// something that exists in the physical world and is photographed, not screenshotted.
const SOFTWARE_INDUSTRIES: ReadonlySet<Industry> = new Set<Industry>(["startup"]);

// Preserved verbatim from generateLandingPage.ts's imageStyleFor. It was never wrong
// about WHICH mockup a software product should show - it was only ever wrong about who
// should be shown a mockup at all, which is now decided one level up by `treatment`.
function softwareSceneFor(heroImageryProminence: number, complexity: number): HeroImageStyle {
  if (heroImageryProminence >= 0.65) return complexity >= 0.55 ? "product" : "abstract";
  if (complexity >= 0.6) return "analytics";
  if (complexity >= 0.4) return "dashboard";
  return "website";
}

const PREMIUM_THRESHOLD = 0.68;
const EVERYDAY_THRESHOLD = 0.32;

// The qualifier is the continuous part: same industry noun, different picture, driven by
// where the business actually sits on price and how much it trades on appearance.
function qualifierFor(vocabulary: IndustryVisuals, intelligence: BusinessIntelligenceProfile): string {
  const price = clamp01(intelligence.pricePositioning);
  if (price >= PREMIUM_THRESHOLD) return vocabulary.premium;
  if (price <= EVERYDAY_THRESHOLD) return vocabulary.everyday;
  return "";
}

// A split hero puts the image in a column beside the text, where a wide landscape crop
// gets letterboxed into a sliver; a centered hero runs it full width below the headline,
// where a portrait crop towers over the fold. Orientation follows the layout the DNA
// already chose rather than being asked for separately.
function orientationFor(dna: StrategyDNA): ImageOrientation {
  return clamp01(dna.heroSplitLean) >= 0.5 ? "square" : "landscape";
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

// Which of several equally-good matches this business takes. Built from the continuous
// axes the rest of the pipeline already computed, so it inherits their discrimination for
// free: two businesses that differ enough to look different will differ here too, and the
// same business is stable across regenerations because the DNA is deterministic.
//
// Deliberately NOT random. A random pick would give the same business a different hero on
// every regeneration, which reads as instability rather than variety.
function variantSeedFrom(dna: StrategyDNA): number {
  const axes = [
    dna.emotionalIntensity,
    dna.urgency,
    dna.complexity,
    dna.colorTemperature,
    dna.saturation,
    dna.typeScale,
    dna.density,
    dna.proofDensity,
  ];

  // Quantise each axis to 4 decimals before folding: the axes are floats, and two
  // businesses differing only past the noise floor should not get different pictures.
  let hash = 2166136261;
  for (const axis of axes) {
    const quantised = Math.round((Number.isFinite(axis) ? clamp01(axis) : 0.5) * 10000);
    hash ^= quantised;
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash);
}

export function deriveVisualIntent(
  profile: BusinessProfile,
  intelligence: BusinessIntelligenceProfile,
  dna: StrategyDNA
): VisualIntent {
  const vocabulary = VISUAL_VOCABULARY[profile.industry] ?? VISUAL_VOCABULARY.generic;
  const treatment: ImageTreatment = SOFTWARE_INDUSTRIES.has(profile.industry) ? "software-scene" : "photo";

  const qualifier = qualifierFor(vocabulary, intelligence);
  const [primary, ...rest] = vocabulary.scenes;
  const subject = qualifier ? `${qualifier} ${primary}` : primary;

  return {
    treatment,
    subject,
    // The unqualified primary is itself a fallback: if "fine dining plated dish in a warm
    // restaurant dining room" finds nothing, the same scene without the qualifier is a
    // better next guess than jumping straight to "restaurant interior".
    alternateSubjects: [primary, ...rest].filter((scene, index, all) => all.indexOf(scene) === index),
    alt: capitalize(subject),
    orientation: orientationFor(dna),
    variantSeed: variantSeedFrom(dna),
    scene: softwareSceneFor(dna.heroImageryProminence, dna.complexity),
  };
}
