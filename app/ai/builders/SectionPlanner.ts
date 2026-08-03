import type { Section, SectionType, SectionProminence } from "@/app/types/landing";
import type { LandingComposition, CompositionSection } from "../types/composition";

// Translates LandingComposition's structural intent (role + prominence) into the
// concrete variant string each component already understands. This is the only place
// prominence maps to a rendering choice - components themselves stay ignorant of
// "why", they just receive a variant like before. Section types with only one existing
// treatment (logoCloud, stats, faq, cta, footer) ignore prominence for variant purposes;
// it still reaches the renderer via Section.prominence for spacing/emphasis.
//
// Compact prominence deliberately resolves to the variants that had no archetype
// pointing at them before this file existed (Features/Benefits "list", Testimonials
// "minimal") - LandingComposition marking a section "compact" is what finally makes
// picking those variants a real, reachable decision instead of dead code.
function deriveVariant(
  role: SectionType,
  prominence: SectionProminence,
  heroVariant: LandingComposition["heroVariant"]
): string {
  switch (role) {
    case "hero":
      return heroVariant;

    case "features":
      return prominence === "compact" ? "list" : "grid";

    case "benefits":
      return prominence === "compact" ? "list" : "cards";

    case "testimonials":
      return prominence === "compact" ? "minimal" : "cards";

    case "pricing":
      return prominence === "primary" ? "premium" : "simple";

    case "stats":
      return "cards";

    case "faq":
      return "accordion";

    case "footer":
      return "simple";

    case "logoCloud":
    case "cta":
    default:
      return "default";
  }
}

function toSection(composition: LandingComposition, entry: CompositionSection): Section {
  return {
    type: entry.role,
    variant: deriveVariant(entry.role, entry.prominence, composition.heroVariant),
    prominence: entry.prominence,
    rhythm: entry.rhythm,
  };
}

export function buildSections(composition: LandingComposition): readonly Section[] {
  return composition.sections.map((entry) => toSection(composition, entry));
}
