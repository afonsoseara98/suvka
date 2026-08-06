import type { HeroImageStyle } from "@/app/types/landing";

// VISUAL INTENT
//
// The missing half of the pipeline. Everything downstream of StrategyDNA compiles how a
// page LOOKS (color, spacing, type, elevation) but nothing ever decided what it SHOWS.
// The only thing that came close was hero.imageStyle, derived by
// imageStyleFor(heroImageryProminence, complexity) - two abstract axes that carry no
// information about what the business actually is. Measured across the 20 benchmark
// businesses, that function sent 13 of 20 to a fake analytics dashboard and 19 of 20 to
// one of two fake software mockups: a wedding planner, a dentist, a photographer and a
// barber all rendered a SaaS screenshot. The vocabulary itself (dashboard/analytics/
// product/phone/website/abstract) can only describe software product shots, so no input
// could ever have produced "bread" for a bakery.
//
// VisualIntent fixes the vocabulary before fixing the choice: it describes the SUBJECT of
// the visual in natural language, so a real photograph can satisfy it.
export type ImageTreatment =
  // A photograph of the real world. Correct for the overwhelming majority of businesses
  // that sell something physical, local, or human.
  | "photo"
  // A rendered UI mockup. Genuinely correct for software products - a SaaS hero SHOULD
  // show an interface - which is why the existing hero scenes are kept rather than
  // deleted. This is the branch they were always right for, and only that branch.
  | "software-scene";

export type ImageOrientation = "landscape" | "portrait" | "square";

export interface VisualIntent {
  treatment: ImageTreatment;

  // What should be pictured, as a natural-language search subject. Blended from the
  // industry noun (which is a semantic fact, not a design choice - see
  // VisualIntelligence.ts for why this one lookup is legitimate) and DNA/intelligence-
  // derived modifiers, so "Luxury Wedding Photographer" and "Budget Wedding
  // Photographer" ask for visibly different pictures.
  subject: string;

  // Tried in order when `subject` returns nothing. A provider that finds no match for
  // "artisan sourdough bakery interior" should still find "bakery" rather than leave the
  // hero empty.
  alternateSubjects: readonly string[];

  // Real alt text, written for a human. Not decoration: this is the only textual
  // description of the hero image a screen reader or a search crawler ever sees, and
  // published pages are indexed (see app/s/[slug]/page.tsx).
  alt: string;

  orientation: ImageOrientation;

  // Which of several equally-valid matches to take. Derived from the business's own DNA,
  // so it is stable for a given business and different between two businesses in the same
  // industry.
  //
  // Without it, every dentist in the city gets byte-identical hero photography: the
  // subject is a function of the industry, so the top stock result is too. Measured over
  // the 20-business corpus, one photo was shared by three medical businesses and another
  // by both trades. A pipeline built on 26 continuous axes specifically so no two pages
  // look alike cannot then hand competitors the same picture.
  variantSeed: number;

  // Only meaningful when treatment === "software-scene". Kept on the intent rather than
  // recomputed at render time so the choice stays in one place.
  scene: HeroImageStyle;
}

// A concrete picture, resolved from a VisualIntent by an ImageProvider.
//
// Resolution happens once, at generation time, and the result is stored in the page state
// - which means it is frozen into the published snapshot (prisma/schema.prisma's
// Page.publishedState) exactly like every other piece of content. A published site
// therefore never depends on a third-party API being up: the CDN URL is all it needs.
export interface ResolvedImage {
  url: string;
  width: number;
  height: number;
  alt: string;

  // Populated when the source's license asks for attribution. Rendered by the page when
  // present, so a customer publishing a commercial site is never silently put in breach
  // of a license they never saw.
  credit: ImageCredit | null;
}

export interface ImageCredit {
  name: string;
  url: string;
  source: string;
}
