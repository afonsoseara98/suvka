import type {
  SectionType,
  SectionProminence,
  SectionRhythm,
  HeroVariant,
} from "@/app/types/landing";

// LandingComposition sits between the Decision Engines and SectionPlanner:
//
//   Business -> BusinessProfile -> BusinessIntelligence -> StrategyDNA
//     -> LandingComposition -> SectionPlanner -> Section[] -> Renderer
//
// StrategyDNA answers "what does this business need, continuously" - no intermediate
// classification step. LandingComposition answers "what does a page with that DNA
// actually look like as a whole" - order, which sections exist at all, how much weight
// each one carries, and the rhythm between them (see LayoutIntelligence.ts, which
// thresholds StrategyDNA.sectionWeight at the last possible moment to decide array
// membership - the one place a continuous value has to become a discrete fact, because
// the DOM has no "60% of a pricing section"). SectionPlanner then translates that
// structural intent into the concrete {type, variant} Section[] the renderer already
// understands, so nothing downstream of it changes.
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
  heroVariant: HeroVariant;
  sections: readonly CompositionSection[];
}
