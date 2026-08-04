import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { buildPipeline } from "./PipelineBuilder";

// DIVERSITY STRESS TEST - data collection harness, not a regression gate.
//
// This file exists to answer one question with real numbers, not vibes: "does a
// realistic batch of user prompts produce visually/structurally diverse pages?" It is
// deliberately self-contained (no import from DiversityScore.ts/DiversityTracker.ts,
// both of which are part of the diversity engine THIS harness is trying to measure) so
// the exact same file can run unmodified against a checkout from BEFORE the diversity
// engine existed (git worktree at a pre-diversity-engine commit) and against the
// current tree, producing directly comparable before/after numbers. See
// DiversityRegression.test.ts for the permanent pass/fail regression guard - that one
// DOES depend on the current API and is not meant to run against old commits.
//
// No network access, no OpenAI call: buildPipeline() only produces the structured
// Landing JSON's shape (design family, hero, section order/variants) - the actual copy
// generation is a separate LLM call this harness never makes.

// 100+ prompts a real user might actually type, not lexicon-stuffed marketing copy.
// Grouped by intent so the corpus itself documents what it's testing:
//   - NEAR_DUPLICATE_PAIRS: same business type, meaningfully different positioning -
//     the core "semantically similar but should look distinct" claim.
//   - VERTICAL_PROMPTS: natural phrasing across every classifiable industry (the original
//     9 plus the 5 added this session), 5-6 each.
//   - BLAND_PROMPTS: deliberately generic, no industry keywords, minimal adjectives -
//     the worst case that used to collapse hardest toward NEUTRAL.
export const NEAR_DUPLICATE_PAIRS: [string, string][] = [
  [
    "We run a small bakery downtown and want a website to get more people ordering custom cakes.",
    "We run a small bakery downtown and want a website to get more people ordering custom cakes for weddings.",
  ],
  [
    "A local dentist looking to attract new patients for checkups and cleanings.",
    "A local dentist looking to attract new patients for checkups, cleanings and whitening.",
  ],
  [
    "A personal trainer helping busy professionals get in shape.",
    "A personal trainer helping busy professionals get in shape and build strength.",
  ],
  [
    "A small law office that helps families with wills and estate planning.",
    "A small law office that helps families with wills, estate planning and trusts.",
  ],
  [
    "An independent real estate agent helping first-time buyers find a home.",
    "An independent real estate agent helping first-time buyers find their first home.",
  ],
  [
    "A SaaS tool that helps small teams track their projects.",
    "A SaaS tool that helps small teams track their projects and deadlines.",
  ],
  [
    "A cozy neighborhood restaurant serving Italian food.",
    "A cozy neighborhood restaurant serving Italian food and wine.",
  ],
  [
    "An online store selling handmade jewelry.",
    "An online store selling handmade jewelry and accessories.",
  ],
  [
    "A marketing agency helping local shops grow online.",
    "A marketing agency helping local shops grow their online presence.",
  ],
  [
    "A hair salon offering haircuts and color for the whole family.",
    "A hair salon offering haircuts, color and styling for the whole family.",
  ],
];

const VERTICAL_PROMPTS: string[] = [
  // medical
  "A family doctor's office that wants more patients to book checkups online.",
  "A dental clinic focused on gentle care for anxious patients.",
  "A physical therapy practice helping people recover from injuries.",
  "A pediatric clinic that families trust for their kids' care.",
  "A dermatology clinic offering skin checks and treatments.",
  // law
  "A law firm that represents small businesses in contract disputes.",
  "A criminal defense attorney taking on new cases.",
  "An immigration lawyer helping families navigate visas.",
  "A personal injury law practice fighting for fair settlements.",
  "A divorce attorney who wants to make a hard process feel manageable.",
  // real_estate
  "A realtor who specializes in helping people sell their homes fast.",
  "A property management company looking for new landlord clients.",
  "A commercial real estate broker who works with growing businesses.",
  "An agency that helps people find rental apartments in the city.",
  "A luxury home real estate agent working with high-net-worth buyers.",
  // fitness
  "A neighborhood gym that wants more members to sign up.",
  "A yoga studio offering classes for all levels.",
  "A crossfit box looking to grow its community.",
  "An online fitness coach helping people train from home.",
  "A boxing gym for people who want to get serious about training.",
  // restaurant
  "A family-owned pizzeria that's been serving the neighborhood for years.",
  "A trendy brunch spot popular with young professionals.",
  "A sushi restaurant that wants more reservations on weekends.",
  "A coffee shop that roasts its own beans.",
  "A fine dining restaurant for special occasions.",
  // ecommerce
  "An online shop selling eco-friendly home goods.",
  "A store that sells custom phone cases and accessories.",
  "A subscription box for coffee lovers.",
  "An online shoe store for runners.",
  "A print-on-demand shop for independent artists.",
  // education
  "An online course platform teaching people to code from scratch.",
  "A language learning app that wants more paying subscribers.",
  "A tutoring service for high schoolers preparing for exams.",
  "An online academy teaching photography to beginners.",
  "A certification program for aspiring project managers.",
  // agency
  "A creative agency that builds brands for startups.",
  "A social media agency managing accounts for small businesses.",
  "An SEO agency helping local businesses rank higher on Google.",
  "A branding studio that helps founders find their visual identity.",
  "A PR agency getting press coverage for growing companies.",
  // startup
  "A startup building an analytics dashboard for e-commerce founders.",
  "A B2B platform that helps sales teams manage their pipeline.",
  "A fintech startup making it easier for freelancers to invoice clients.",
  "A developer tools company building an API for payments.",
  "A workplace collaboration tool for remote teams.",
  // beauty
  "A nail salon offering manicures and pedicures.",
  "A barbershop that wants more walk-in customers.",
  "A spa offering massages and facials for relaxation.",
  "An esthetician specializing in skincare treatments.",
  "A blowout bar for people who want to look good fast.",
  // home_services
  "A local plumber who handles emergency repairs.",
  "An electrician offering same-day service for homeowners.",
  "A cleaning company for busy families who need help around the house.",
  "A landscaping company that keeps yards looking great year-round.",
  "A handyman service for small home repairs.",
  // consulting
  "A business consultant helping small companies grow revenue.",
  "An executive coach working with new managers.",
  "A career coach helping people land better jobs.",
  "A management consulting firm advising mid-size companies.",
  "A financial advisor helping people plan for retirement.",
  // automotive
  "An auto repair shop that wants more customers for oil changes and brakes.",
  "A used car dealership looking to move more inventory.",
  "A mobile mechanic who comes to your driveway.",
  "A tire shop offering rotations and replacements.",
  "A car detailing business for people who want their car looking new.",
  // events
  "A wedding planner helping couples plan their big day stress-free.",
  "An event planning company for corporate conferences.",
  "A party planner specializing in kids' birthday parties.",
  "A catering company for weddings and private events.",
  "A DJ and entertainment company for weddings.",
];

const BLAND_PROMPTS: string[] = [
  "We help people achieve their goals every day.",
  "A small business looking to grow online.",
  "We want a website that helps us get more customers.",
  "Our company provides great service to our clients.",
  "We're a local business that cares about our community.",
  "A team that works hard to make our customers happy.",
  "We offer something people really need.",
  "A business trying to reach more people online.",
  "We do things a little differently around here.",
  "A company that wants to stand out from the competition.",
];

export const CORPUS: string[] = [
  ...NEAR_DUPLICATE_PAIRS.flat(),
  ...VERTICAL_PROMPTS,
  ...BLAND_PROMPTS,
];

export interface Fingerprint {
  prompt: string;
  industry: string;
  designFamily: string;
  heroVariant: string;
  sectionSequence: string;
  variantSignature: string;
}

export function fingerprintOf(prompt: string): Fingerprint {
  const result = buildPipeline(prompt) as unknown as Record<string, unknown>;
  const businessProfile = result.businessProfile as { industry?: string } | undefined;
  const composition = result.composition as { heroVariant?: string } | undefined;
  const sections = result.sections as { type: string; variant: string }[];

  return {
    prompt,
    industry: businessProfile?.industry ?? "unknown",
    // Not every tree this harness runs against has a design family concept (see the
    // header comment) - "n/a" for the pre-diversity-engine baseline is the honest value,
    // not a bug.
    designFamily: (result.designFamily as string | undefined) ?? "n/a",
    heroVariant: composition?.heroVariant ?? "unknown",
    sectionSequence: sections.map((s) => s.type).join(">"),
    variantSignature: sections.map((s) => `${s.type}:${s.variant}`).join("|"),
  };
}

function distributionOf(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function topShare(distribution: Record<string, number>, total: number): number {
  const max = Math.max(...Object.values(distribution));
  return max / total;
}

// Distinct-value rate: 1.0 means every one of N prompts produced a unique value, 0
// means they all collapsed to one value. The inverse of "collision."
function distinctRate(values: string[]): number {
  return new Set(values).size / values.length;
}

export interface StressReport {
  generatedAt: string;
  totalPrompts: number;
  industryHitRate: number; // share NOT classified as "generic"
  industryDistribution: Record<string, number>;
  designFamilyDistribution: Record<string, number>;
  designFamilyTopShare: number;
  heroVariantDistribution: Record<string, number>;
  heroVariantTopShare: number;
  sectionSequenceDistinctRate: number;
  fullFingerprintDistinctRate: number;
  nearDuplicatePairs: {
    promptA: string;
    promptB: string;
    identicalFingerprint: boolean;
    sameIndustry: boolean;
    sameDesignFamily: boolean;
    sameSectionSequence: boolean;
    sameHeroVariant: boolean;
  }[];
}

export function runStressTest(): StressReport {
  const fingerprints = CORPUS.map(fingerprintOf);

  const industries = fingerprints.map((f) => f.industry);
  const designFamilies = fingerprints.map((f) => f.designFamily);
  const heroVariants = fingerprints.map((f) => f.heroVariant);
  const sequences = fingerprints.map((f) => f.sectionSequence);
  const fullFingerprints = fingerprints.map(
    (f) => `${f.designFamily}||${f.heroVariant}||${f.sectionSequence}||${f.variantSignature}`
  );

  const nearDuplicatePairs = NEAR_DUPLICATE_PAIRS.map(([a, b]) => {
    const fa = fingerprintOf(a);
    const fb = fingerprintOf(b);
    return {
      promptA: a,
      promptB: b,
      identicalFingerprint:
        fa.designFamily === fb.designFamily &&
        fa.heroVariant === fb.heroVariant &&
        fa.sectionSequence === fb.sectionSequence &&
        fa.variantSignature === fb.variantSignature,
      sameIndustry: fa.industry === fb.industry,
      sameDesignFamily: fa.designFamily === fb.designFamily,
      sameSectionSequence: fa.sectionSequence === fb.sectionSequence,
      sameHeroVariant: fa.heroVariant === fb.heroVariant,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalPrompts: fingerprints.length,
    industryHitRate: industries.filter((i) => i !== "generic").length / industries.length,
    industryDistribution: distributionOf(industries),
    designFamilyDistribution: distributionOf(designFamilies),
    designFamilyTopShare: topShare(distributionOf(designFamilies), designFamilies.length),
    heroVariantDistribution: distributionOf(heroVariants),
    heroVariantTopShare: topShare(distributionOf(heroVariants), heroVariants.length),
    sectionSequenceDistinctRate: distinctRate(sequences),
    fullFingerprintDistinctRate: distinctRate(fullFingerprints),
    nearDuplicatePairs,
  };
}

describe("Diversity stress test - 100+ realistic prompts (data collection, no OpenAI calls)", () => {
  it("produces a fingerprint for every prompt in the corpus", () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(100);
    const fingerprints = CORPUS.map(fingerprintOf);
    expect(fingerprints).toHaveLength(CORPUS.length);
    for (const f of fingerprints) {
      expect(f.sectionSequence.length).toBeGreaterThan(0);
    }
  });

  it("writes the full report to DIVERSITY_REPORT_OUT (or a default scratch path) for before/after comparison", () => {
    const report = runStressTest();
    const outPath =
      process.env.DIVERSITY_REPORT_OUT ??
      "C:/Users/afons/AppData/Local/Temp/claude/C--Users-afons/109648c6-1bd6-4876-b574-26c100f41cb0/scratchpad/diversity-report-default.json";

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

    expect(report.totalPrompts).toBe(CORPUS.length);
  });
});
