import { describe, it, expect } from "vitest";
import {
  createProject,
  projectFromLandingPage,
  getPage,
  currentPageState,
  addPage,
  removePage,
  renamePage,
  reorderPages,
  updatePageHistory,
  updateBrand,
  updateBusinessProfile,
  updateSettings,
  addAsset,
  removeAsset,
  ProjectError,
  type Project,
} from "./project";
import { fromLandingPage } from "./pageState";
import { dispatch } from "./history";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { LandingPage } from "@/app/types/landing";
import type { BusinessProfile } from "@/app/ai/types";

const NOW = 1_000_000;

const BUSINESS_PROFILE: BusinessProfile = {
  industry: "startup",
  businessModel: "saas",
  primaryGoal: "book_demo",
  audience: "Startup founders",
  tone: "modern",
  priceLevel: "medium",
};

function landingPage(): LandingPage {
  return {
    dna: neutralStrategyDna(),
    site: {
      seo: { title: "T", description: "D", keywords: [], ogTitle: "", ogDescription: "" },
      branding: {
        primaryColor: "#111",
        secondaryColor: "#222",
        accentColor: "#333",
        fontHeading: "Inter",
        fontBody: "Inter",
        logoPrompt: "a logo",
      },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    sections: [
      { type: "hero", variant: "centered", prominence: "primary", rhythm: "standard" },
      { type: "stats", variant: "cards", prominence: "standard", rhythm: "standard" },
      { type: "footer", variant: "simple", prominence: "compact", rhythm: "standard" },
    ],
    hero: {
      badge: "B",
      title: "T",
      highlightWord: "T",
      subtitle: "S",
      primaryCTA: "Go",
      secondaryCTA: "Learn",
      imageStyle: "abstract",
      imagePrompt: "",
      stats: [],
    },
    stats: [{ value: "10", label: "Years" }],
    features: [],
    benefits: [],
    testimonials: [],
    pricing: [],
    faq: [],
    footer: { company: "Acme", email: "a@acme.com", copyright: "(c)" },
  };
}

function baseProject(): Project {
  return projectFromLandingPage(landingPage(), BUSINESS_PROFILE, { id: "proj-1", name: "Acme Co" }, NOW);
}

describe("projectFromLandingPage / createProject", () => {
  it("createProject defaults assets/settings and wraps the initial page in its own history", () => {
    const state = fromLandingPage(landingPage(), NOW);
    const project = createProject({
      id: "proj-2",
      name: "Direct",
      businessProfile: BUSINESS_PROFILE,
      brand: landingPage().site.branding,
      initialPage: { id: "home", name: "Home", slug: "/", state },
    });
    expect(project.pages).toEqual([{ id: "home", name: "Home", slug: "/", history: { states: [state], records: [], cursor: 0 } }]);
    expect(project.assets).toEqual([]);
    expect(project.settings).toEqual({ publishing: { published: false } });
  });

  it("creates a project with exactly one page, seeded from the LandingPage", () => {
    const project = baseProject();
    expect(project.pages).toHaveLength(1);
    expect(project.pages[0].id).toBe("landing");
    expect(project.pages[0].name).toBe("Landing");
    expect(project.pages[0].slug).toBe("/");
  });

  it("seeds brand from the page's own site.branding", () => {
    const project = baseProject();
    expect(project.brand).toEqual(landingPage().site.branding);
  });

  it("carries the given businessProfile through unchanged", () => {
    const project = baseProject();
    expect(project.businessProfile).toEqual(BUSINESS_PROFILE);
  });

  it("defaults assets to empty and settings to unpublished", () => {
    const project = baseProject();
    expect(project.assets).toEqual([]);
    expect(project.settings).toEqual({ publishing: { published: false } });
  });

  it("the seeded page's history starts undoable-empty at the generated PageState", () => {
    const project = baseProject();
    const state = currentPageState(project, "landing");
    expect(state).toEqual(fromLandingPage(landingPage(), NOW));
  });
});

describe("getPage / currentPageState", () => {
  it("finds an existing page", () => {
    const project = baseProject();
    expect(getPage(project, "landing")).toBeDefined();
    expect(getPage(project, "nope")).toBeUndefined();
  });

  it("throws for an unknown page id", () => {
    const project = baseProject();
    expect(() => currentPageState(project, "nope")).toThrow(ProjectError);
  });
});

describe("addPage / removePage / renamePage / reorderPages", () => {
  it("adds a new page from a fresh PageState", () => {
    const project = baseProject();
    const aboutState = fromLandingPage(landingPage(), NOW);
    const next = addPage(project, { id: "about", name: "About", slug: "/about", state: aboutState });
    expect(next.pages.map((p) => p.id)).toEqual(["landing", "about"]);
  });

  it("rejects adding a page with a duplicate id", () => {
    const project = baseProject();
    expect(() =>
      addPage(project, { id: "landing", name: "Dup", slug: "/dup", state: fromLandingPage(landingPage(), NOW) })
    ).toThrow(ProjectError);
  });

  it("removes a page when more than one exists", () => {
    const project = addPage(baseProject(), { id: "about", name: "About", slug: "/about", state: fromLandingPage(landingPage(), NOW) });
    const next = removePage(project, "about");
    expect(next.pages.map((p) => p.id)).toEqual(["landing"]);
  });

  it("rejects removing the last remaining page", () => {
    const project = baseProject();
    expect(() => removePage(project, "landing")).toThrow(ProjectError);
  });

  it("rejects removing an unknown page", () => {
    const project = baseProject();
    expect(() => removePage(project, "nope")).toThrow(ProjectError);
  });

  it("renames a page without touching its content/history", () => {
    const project = baseProject();
    const next = renamePage(project, "landing", "Home");
    expect(next.pages[0].name).toBe("Home");
    expect(next.pages[0].history).toEqual(project.pages[0].history);
  });

  it("reorders pages, clamping an out-of-range index", () => {
    const project = addPage(baseProject(), { id: "about", name: "About", slug: "/about", state: fromLandingPage(landingPage(), NOW) });
    const moved = reorderPages(project, "about", 0);
    expect(moved.pages.map((p) => p.id)).toEqual(["about", "landing"]);
    const clamped = reorderPages(project, "landing", 999);
    expect(clamped.pages.at(-1)?.id).toBe("landing");
  });
});

describe("updatePageHistory", () => {
  it("writes a page's updated history back into the project, leaving other pages untouched", () => {
    const project = addPage(baseProject(), { id: "about", name: "About", slug: "/about", state: fromLandingPage(landingPage(), NOW) });
    const landingPageState = currentPageState(project, "landing");
    const statsId = landingPageState.sections.find((s) => s.type === "stats")!.id;
    const nextHistory = dispatch(getPage(project, "landing")!.history, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user");

    const next = updatePageHistory(project, "landing", nextHistory);
    expect(currentPageState(next, "landing").sections.find((s) => s.id === statsId)?.variant).toBe("inline");
    expect(currentPageState(next, "about")).toEqual(currentPageState(project, "about"));
  });

  it("rejects updating an unknown page", () => {
    const project = baseProject();
    expect(() => updatePageHistory(project, "nope", project.pages[0].history)).toThrow(ProjectError);
  });
});

describe("updateBrand / updateBusinessProfile / updateSettings", () => {
  it("shallow-merges a brand update", () => {
    const project = baseProject();
    const next = updateBrand(project, { primaryColor: "#fff" });
    expect(next.brand.primaryColor).toBe("#fff");
    expect(next.brand.secondaryColor).toBe(project.brand.secondaryColor);
  });

  it("shallow-merges a businessProfile update", () => {
    const project = baseProject();
    const next = updateBusinessProfile(project, { tone: "bold" });
    expect(next.businessProfile.tone).toBe("bold");
    expect(next.businessProfile.industry).toBe(project.businessProfile.industry);
  });

  it("shallow-merges a settings update", () => {
    const project = baseProject();
    const next = updateSettings(project, { publishing: { published: true, domain: "acme.com" } });
    expect(next.settings.publishing).toEqual({ published: true, domain: "acme.com" });
  });

  it("none of these mutate the input project", () => {
    const project = baseProject();
    const snapshot = JSON.parse(JSON.stringify(project));
    updateBrand(project, { primaryColor: "#fff" });
    expect(JSON.parse(JSON.stringify(project))).toEqual(snapshot);
  });
});

describe("addAsset / removeAsset", () => {
  it("adds and removes an asset", () => {
    const project = baseProject();
    const withAsset = addAsset(project, { id: "logo-1", type: "logo", prompt: "a bold logo" });
    expect(withAsset.assets).toHaveLength(1);
    const removed = removeAsset(withAsset, "logo-1");
    expect(removed.assets).toEqual([]);
  });

  it("rejects a duplicate asset id", () => {
    const project = addAsset(baseProject(), { id: "logo-1", type: "logo" });
    expect(() => addAsset(project, { id: "logo-1", type: "icon" })).toThrow(ProjectError);
  });
});
