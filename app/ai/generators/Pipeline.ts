import { buildBusinessProfile } from "../builders/BusinessProfileBuilder";
import { buildPlanner } from "../planner";
import { createDesignSystem } from "../design/design";
import { buildComponentPlan } from "../components/ComponentPlanner";
export function buildPipeline(prompt: string) {
  const business = buildBusinessProfile(prompt);

  const planner = buildPlanner(
    business.industry
  );

  const design = createDesignSystem(
    planner
  );

  const components = buildComponentPlan(
    business.industry
  );

  return {
    business,
    planner,
    design,
    components,
  };
}