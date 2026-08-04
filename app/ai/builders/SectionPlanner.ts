import type { Section, SectionType, SectionProminence } from "@/app/types/landing";
import type { LandingComposition, CompositionSection } from "../types/composition";
import type { DesignFamilyName } from "../engines/DesignFamily";
import { seededPick, type WeightedOption } from "../utils/seed";

// Translates LandingComposition's structural intent (role + prominence) into the
// concrete variant string each component already understands. This is the only place
// prominence (and, since the diversity pass, design family + the design seed) maps to
// a rendering choice - components themselves stay ignorant of "why", they just receive
// a variant like before.
//
// Every role with more than one valid variant for its prominence is resolved the same
// way every other seed-consuming decision in this pipeline is: each candidate variant
// gets a fit weight (prominence-appropriateness + how well it suits the resolved
// design family), and the seed picks among them - never a hard switch that always
// returns the same variant for the same prominence. A role with only one sensible
// treatment (stats/faq/footer/logoCloud/cta) still has exactly one option, which
// seededPick handles the same way as any other single-candidate list.
function variantOptions(
  role: SectionType,
  prominence: SectionProminence,
  family: DesignFamilyName
): readonly WeightedOption<string>[] {
  const editorialLike = family === "editorial" || family === "elegant" || family === "highEndAgency";
  const denseLike = family === "bold" || family === "startupDashboard" || family === "playful";
  const restrainedLike = family === "minimal" || family === "corporate";

  switch (role) {
    case "features":
      if (prominence === "compact") {
        return [{ value: "list", weight: 1 }];
      }
      return [
        { value: "grid", weight: restrainedLike ? 1.4 : 1 },
        { value: "alternating", weight: editorialLike ? 1.6 : 0.4 },
        { value: "bento", weight: denseLike && prominence === "primary" ? 1.6 : 0.3 },
      ];

    case "benefits":
      return prominence === "compact"
        ? [{ value: "list", weight: 1 }]
        : [
            { value: "cards", weight: 1 },
            { value: "minimal", weight: restrainedLike || editorialLike ? 1.3 : 0.5 },
          ];

    case "testimonials":
      if (prominence === "compact") {
        return [{ value: "minimal", weight: 1 }];
      }
      return [
        { value: "cards", weight: restrainedLike || denseLike ? 1.3 : 1 },
        { value: "spotlight", weight: editorialLike ? 1.7 : 0.5 },
      ];

    case "pricing":
      return [
        { value: prominence === "primary" ? "premium" : "simple", weight: 1.2 },
        { value: "comparison", weight: restrainedLike || denseLike ? 1.5 : 0.4 },
      ];

    case "stats":
      return [
        { value: "cards", weight: 1 },
        { value: "inline", weight: restrainedLike || editorialLike ? 1.4 : 0.5 },
      ];

    case "faq":
      return [
        { value: "accordion", weight: 1 },
        { value: "twoColumn", weight: denseLike ? 1.3 : 0.6 },
      ];

    case "footer":
      return [{ value: "simple", weight: 1 }];

    case "logoCloud":
    case "cta":
    default:
      return [{ value: "default", weight: 1 }];
  }
}

function toSection(
  composition: LandingComposition,
  entry: CompositionSection,
  family: DesignFamilyName,
  random: () => number
): Section {
  const variant =
    entry.role === "hero"
      ? composition.heroVariant
      : seededPick(random, variantOptions(entry.role, entry.prominence, family));

  return {
    type: entry.role,
    variant,
    prominence: entry.prominence,
    rhythm: entry.rhythm,
  };
}

export function buildSections(
  composition: LandingComposition,
  family: DesignFamilyName,
  random: () => number
): readonly Section[] {
  return composition.sections.map((entry) => toSection(composition, entry, family, random));
}
