import type { BusinessKnowledge } from "../types/knowledge";

import { startupKnowledge } from "../knowledge/startup";
import { medicalKnowledge } from "../knowledge/medical";
import { restaurantKnowledge } from "../knowledge/restaurant";
import { fitnessKnowledge } from "../knowledge/fitness";
import { lawKnowledge } from "../knowledge/law";

export function resolveKnowledge(
  industry: string
): BusinessKnowledge {
  switch (industry.toLowerCase()) {
    case "medical":
      return medicalKnowledge;

    case "restaurant":
      return restaurantKnowledge;

    case "fitness":
      return fitnessKnowledge;

    case "law":
      return lawKnowledge;

    case "startup":
    default:
      return startupKnowledge;
  }
}