import { generateLayout } from "./LayoutIntelligence";
import type { LandingComposition } from "../types/composition";
import type { PageArchetype } from "../types/archetype";
import type { CompositionSignals } from "../types/signals";

// LandingComposition sits between ArchetypeResolver and SectionPlanner:
//
//   Business -> BusinessProfile -> ArchetypeResolver -> PageArchetype
//     -> LandingComposition -> SectionPlanner -> Section[] -> Renderer
//
// This file is the stable pipeline-facing name for that stage - PipelineBuilder.ts
// depends on `buildLandingComposition`, not on how composition is actually decided.
// The decision itself lives in LayoutIntelligence.ts's generative engine: no
// per-archetype table of full page structures lives here (or anywhere) anymore.
export function buildLandingComposition(
  archetype: PageArchetype,
  signals: CompositionSignals
): LandingComposition {
  return generateLayout(archetype, signals);
}
