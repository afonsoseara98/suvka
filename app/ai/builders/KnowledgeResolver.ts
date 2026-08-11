import type { Industry } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";

import { startupKnowledge } from "../knowledge/startup";
import { medicalKnowledge } from "../knowledge/medical";
import { restaurantKnowledge } from "../knowledge/restaurant";
import { fitnessKnowledge } from "../knowledge/fitness";
import { lawKnowledge } from "../knowledge/law";
import { agencyKnowledge } from "../knowledge/agency";
import { realEstateKnowledge } from "../knowledge/realEstate";
import { ecommerceKnowledge } from "../knowledge/ecommerce";
import { educationKnowledge } from "../knowledge/education";
import { beautyKnowledge } from "../knowledge/beauty";
import { homeServicesKnowledge } from "../knowledge/homeServices";
import { consultingKnowledge } from "../knowledge/consulting";
import { automotiveKnowledge } from "../knowledge/automotive";
import { eventsKnowledge } from "../knowledge/events";
import { genericKnowledge } from "../knowledge/generic";

// Every Industry maps to its OWN dedicated knowledge - no fallback to another
// industry's content. Signature tightened from `industry: string` to `industry:
// Industry` deliberately: with the real union type, TypeScript enforces this switch
// stays exhaustive, so a 16th Industry added later without a matching `case` here is a
// compile error, not a silent fallback discovered in production the way the previous
// `default: return startupKnowledge` was (see docs/suvka-signal-trace-audit-v1.md,
// finding #2 - 10 of 15 industries were silently receiving SaaS/startup knowledge:
// "AI automation" as a common feature for a hair salon).
export function resolveKnowledge(industry: Industry): BusinessKnowledge {
  switch (industry) {
    case "medical":
      return medicalKnowledge;
    case "restaurant":
      return restaurantKnowledge;
    case "fitness":
      return fitnessKnowledge;
    case "law":
      return lawKnowledge;
    case "startup":
      return startupKnowledge;
    case "agency":
      return agencyKnowledge;
    case "real_estate":
      return realEstateKnowledge;
    case "ecommerce":
      return ecommerceKnowledge;
    case "education":
      return educationKnowledge;
    case "beauty":
      return beautyKnowledge;
    case "home_services":
      return homeServicesKnowledge;
    case "consulting":
      return consultingKnowledge;
    case "automotive":
      return automotiveKnowledge;
    case "events":
      return eventsKnowledge;
    case "generic":
      return genericKnowledge;
  }
}
