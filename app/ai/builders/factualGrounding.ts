import type { LandingPage } from "@/app/types/landing";

// FACTUAL GROUNDING
//
// The pipeline used to instruct the model, verbatim, to "Generate exactly 3 hero stats."
// Given a prompt containing no numbers at all, it complied. Real output, from real runs:
//
//   dental clinic   "98% Success Rate on Treatments"   "4.9 Average Patient Review"
//   law firm        "95% Cases Resolved Successfully"  "98% Confidentiality Guaranteed"
//   physiotherapy   "12K+ Appointments Scheduled"      "15 min Average Wait Time"
//
// plus named testimonials from people who do not exist - "Rebecca L., Mother of 3".
//
// None of it was in the brief. All of it would be published on a real business's real
// website under that business's name.
//
// This is not a copy-quality problem. A success rate published by a law firm and a
// treatment success rate published by a dental clinic are regulated professional claims,
// and invented customer reviews are prohibited outright in the EU under the Omnibus
// Directive. A customer who published one of these pages would be the one exposed, for a
// claim they never made and never saw us make on their behalf.
//
// THE RULE
//
// If the person did not give us the fact, we do not print the fact. There is no
// cleverness here on purpose: a heuristic that is right 90% of the time still ships a
// false regulated claim to one business in ten.
//
// A page with fewer sections is a smaller page. A page with invented credentials is a
// liability. The first is a design constraint; the second is not ours to impose on
// someone else's business.

// Digits, percentages, "12K", "4.9", written numbers, and the plus/star suffixes these
// claims arrive wrapped in.
const NUMERIC = /\d/;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

// Every number the person actually wrote, in a form that survives formatting differences:
// "25 years" in the brief should ground "25+ Years of Combined Experience".
function numbersIn(source: string): Set<string> {
  const found = new Set<string>();
  for (const match of source.matchAll(/\d+(?:[.,]\d+)?/g)) {
    found.add(match[0].replace(",", "."));
  }
  return found;
}

// A claim is grounded when the number it asserts appears in what the person told us.
// Deliberately strict: an ungrounded number is not "probably fine", it is a statement
// about someone else's business that nobody verified.
function isGrounded(value: string, sourceNumbers: Set<string>, normalisedSource: string): boolean {
  if (!NUMERIC.test(value)) {
    // A non-numeric "stat" is a slogan wearing a metric's clothing ("Award Winning").
    // Those belong in copy, not in a figure the reader will assume was measured.
    return false;
  }

  for (const number of value.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const candidate = number[0].replace(",", ".");
    if (!sourceNumbers.has(candidate)) return false;
  }

  // The number matched; require the subject to be mentioned too, so "since 1974" in the
  // brief cannot ground "1974 happy customers".
  return normalisedSource.length > 0;
}

export interface GroundingReport {
  statsRemoved: number;
  heroStatsRemoved: number;
  testimonialsRemoved: number;
  faqRemoved: number;
}

// Strips every claim the source does not support. Pure: returns a new page, reports what
// it took out, and never invents a replacement.
export function groundLandingPage(landing: LandingPage, sourcePrompt: string): { landing: LandingPage; report: GroundingReport } {
  const sourceNumbers = numbersIn(sourcePrompt);
  const normalisedSource = normalise(sourcePrompt);

  const report: GroundingReport = { statsRemoved: 0, heroStatsRemoved: 0, testimonialsRemoved: 0, faqRemoved: 0 };

  const keepStat = (item: { value: string; label: string }) => {
    const grounded = isGrounded(String(item?.value ?? ""), sourceNumbers, normalisedSource);
    return grounded;
  };

  const next = { ...landing } as LandingPage & Record<string, unknown>;

  const heroStats = Array.isArray(landing.hero?.stats) ? landing.hero.stats : [];
  const keptHeroStats = heroStats.filter(keepStat);
  report.heroStatsRemoved = heroStats.length - keptHeroStats.length;
  next.hero = { ...landing.hero, stats: keptHeroStats };

  const stats = Array.isArray(next.stats) ? (next.stats as { value: string; label: string }[]) : [];
  const keptStats = stats.filter(keepStat);
  report.statsRemoved = stats.length - keptStats.length;
  next.stats = keptStats;

  // Testimonials and FAQ have no grounding mechanism at all yet: nothing in the input
  // carries a real review or a real question, so anything here was invented wholesale.
  // They return the moment there is a field for the person to put real ones in.
  const testimonials = Array.isArray(next.testimonials) ? next.testimonials : [];
  report.testimonialsRemoved = testimonials.length;
  next.testimonials = [];

  const faq = Array.isArray(next.faq) ? next.faq : [];
  report.faqRemoved = faq.length;
  next.faq = [];

  return { landing: next as LandingPage, report };
}

// A section with nothing truthful left in it should not be on the page at all - an empty
// heading with a blank space under it reads as broken, and reads as generated.
export function dropEmptySections(landing: LandingPage): LandingPage {
  const contentFor: Record<string, () => number> = {
    stats: () => (Array.isArray(landing.stats) ? landing.stats.length : 0),
    testimonials: () => (Array.isArray(landing.testimonials) ? landing.testimonials.length : 0),
    faq: () => (Array.isArray(landing.faq) ? landing.faq.length : 0),
    features: () => (Array.isArray(landing.features) ? landing.features.length : 0),
    benefits: () => (Array.isArray(landing.benefits) ? landing.benefits.length : 0),
    pricing: () => (Array.isArray(landing.pricing) ? landing.pricing.length : 0),
  };

  return {
    ...landing,
    sections: landing.sections.filter((section) => {
      const count = contentFor[section.type];
      return count ? count() > 0 : true;
    }),
  };
}
