import type {
  SectionType,
  SectionProminence,
  SectionRhythm,
  HeroVariant,
} from "@/app/types/landing";
import type { PageArchetype } from "./archetype";

// LandingComposition sits between ArchetypeResolver and SectionPlanner:
//
//   Business -> BusinessProfile -> ArchetypeResolver -> PageArchetype
//     -> LandingComposition -> SectionPlanner -> Section[] -> Renderer
//
// ArchetypeResolver answers "what kind of business is this" (a single enum value).
// LandingComposition answers "what does a page for that archetype actually look like
// as a whole" - order, which sections exist at all, how much weight each one carries,
// and the rhythm between them. SectionPlanner then translates that structural intent
// into the concrete {type, variant} Section[] the renderer already understands, so
// nothing downstream of it changes.
//
// CompositionSection deliberately omits `variant` - that's an implementation detail
// SectionPlanner derives from `role` + `prominence`, not a decision LandingComposition
// makes directly. This is what lets prominence:"compact" retire the same "list"/
// "minimal" variants that used to be dead code (nothing ever selected them).
export interface CompositionSection {
  role: SectionType;
  prominence: SectionProminence;
  rhythm: SectionRhythm;
}

export interface LandingComposition {
  archetype: PageArchetype;
  heroVariant: HeroVariant;
  sections: readonly CompositionSection[];
}
