import type { BusinessProfile, Industry } from "../types";
import type { PageArchetype } from "../types/archetype";

// Composition depends on archetype, never directly on industry (see SectionPlanner.ts).
// This table is keyed by industry today only because every other BusinessProfile field
// (businessModel, priceLevel) is currently fixed per industry in
// BusinessProfileBuilder.ts's INDUSTRY_PROFILES - industry is the only signal that
// actually varies right now. Taking the full BusinessProfile here, rather than just
// `industry`, means this can incorporate those other facts later without SectionPlanner
// or anything downstream needing to change at all.
//
// Every PageArchetype must be reachable from at least one industry (see
// app/ai/types/archetype.ts for the full list) - an archetype nobody resolves to is
// composition nobody ever exercises. `authority` previously absorbed agency,
// real_estate, and education alongside law, leaving luxury/personal_brand/portfolio
// completely unreachable. Reassigned by fit with each archetype's actual composition
// in SectionPlanner.ts, not just by name:
// - real_estate -> luxury: no pricing section, minimal hero - matches a high-price
//   (priceLevel: "high"), single-striking-listing-photo presentation better than the
//   generic authority template.
// - education -> personal_brand: goal is collect_emails, not sell_product - an
//   audience-building funnel around an instructor, which is what personal_brand's
//   testimonials-minimal, no-pricing composition is built for.
// - agency -> portfolio: portfolio's hero-split + testimonials-cards composition is
//   client-work-showcase shaped, which fits a creative/marketing agency at least as
//   well as authority did.
// law keeps authority - a law firm is the archetypal case (credentials, trust,
// no fixed pricing table) that composition was designed around.
const INDUSTRY_ARCHETYPES: Record<Industry, PageArchetype> = {
  startup: "lead_generation",
  agency: "portfolio",
  medical: "booking",
  restaurant: "hospitality",
  fitness: "local_business",
  law: "authority",
  real_estate: "luxury",
  ecommerce: "product_showcase",
  education: "personal_brand",
  generic: "local_business",
};

export function resolveArchetype(business: BusinessProfile): PageArchetype {
  return INDUSTRY_ARCHETYPES[business.industry];
}
