import type { BusinessProfile } from "@/app/ai/types";
import type { BrandingData, LandingPage } from "@/app/types/landing";
import type { PageState } from "./pageState";
import type { PageHistory } from "./history";
import { fromLandingPage } from "./pageState";
import { createHistory, currentState } from "./history";

// PROJECT
//
// One level above PageState: a Project is what a user is actually working on - "my
// company's website," not "this one landing page." A project owns everything that
// needs to be consistent ACROSS pages (who the business is, its brand, its shared
// assets, publishing settings) and holds one or more pages, each independently
// editable/undoable via the exact same SectionInstance/Operation/History machinery
// already built for a single page - nothing about that machinery changes here, it's
// only ever wrapped, never duplicated.
//
// What's deliberately NOT here: project-level undo/redo. Every content edit already
// gets full undo/redo through its page's own PageHistory (the thing that actually
// changes constantly while someone works); renaming a project or swapping its brand
// color is comparatively rare and coarse-grained. If project-level history turns out
// to be wanted later, these functions are already pure state -> state transforms - the
// same shape history.ts's dispatch wraps - so adding it later means wrapping this
// module, not reshaping Project.

export type AssetType = "image" | "logo" | "icon" | "font" | "other";

export interface Asset {
  id: string;
  type: AssetType;
  url?: string; // a materialized asset
  prompt?: string; // an AI-generated asset not yet materialized into a URL
  label?: string;
}

export interface ProjectSettings {
  publishing: {
    domain?: string;
    published: boolean;
  };
}

export interface ProjectPage {
  id: string;
  name: string; // "Landing", "About", "Pricing", "Contact", ...
  slug: string; // route path, e.g. "/", "/about"
  history: PageHistory;
}

export interface Project {
  id: string;
  name: string;
  businessProfile: BusinessProfile;
  brand: BrandingData;
  assets: readonly Asset[];
  pages: readonly ProjectPage[];
  settings: ProjectSettings;
}

export class ProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectError";
  }
}

export function createProject(input: {
  id: string;
  name: string;
  businessProfile: BusinessProfile;
  brand: BrandingData;
  initialPage: { id: string; name: string; slug: string; state: PageState };
  assets?: readonly Asset[];
  settings?: ProjectSettings;
}): Project {
  return {
    id: input.id,
    name: input.name,
    businessProfile: input.businessProfile,
    brand: input.brand,
    assets: input.assets ?? [],
    pages: [
      {
        id: input.initialPage.id,
        name: input.initialPage.name,
        slug: input.initialPage.slug,
        history: createHistory(input.initialPage.state),
      },
    ],
    settings: input.settings ?? { publishing: { published: false } },
  };
}

// Bridges a single generated LandingPage (today's only producer of a page) into a full
// Project - the one seam, same idea as pageState.ts's fromLandingPage. `businessProfile`
// is passed in separately rather than expected on `landing` itself: LandingPage
// (app/types/landing.ts) stays exactly the LLM-facing wire schema it already is, never
// gaining a field just for this. The project's brand seeds from the page's own
// site.branding, since there's no independent project-level brand-generation step yet -
// documented as a deliberate bridge, not a permanent source of truth once a project can
// hold pages with genuinely different origins.
export function projectFromLandingPage(
  landing: LandingPage,
  businessProfile: BusinessProfile,
  meta: { id: string; name: string; pageName?: string; pageSlug?: string },
  now: number = Date.now()
): Project {
  return createProject({
    id: meta.id,
    name: meta.name,
    businessProfile,
    brand: landing.site.branding,
    initialPage: {
      id: "landing",
      name: meta.pageName ?? "Landing",
      slug: meta.pageSlug ?? "/",
      state: fromLandingPage(landing, now),
    },
  });
}

export function getPage(project: Project, pageId: string): ProjectPage | undefined {
  return project.pages.find((page) => page.id === pageId);
}

export function currentPageState(project: Project, pageId: string): PageState {
  const page = getPage(project, pageId);
  if (!page) {
    throw new ProjectError(`No page with id "${pageId}" in project "${project.id}"`);
  }
  return currentState(page.history);
}

export function addPage(
  project: Project,
  input: { id: string; name: string; slug: string; state: PageState }
): Project {
  if (project.pages.some((p) => p.id === input.id)) {
    throw new ProjectError(`Page id "${input.id}" already exists in project "${project.id}"`);
  }
  const page: ProjectPage = { id: input.id, name: input.name, slug: input.slug, history: createHistory(input.state) };
  return { ...project, pages: [...project.pages, page] };
}

export function removePage(project: Project, pageId: string): Project {
  if (!project.pages.some((p) => p.id === pageId)) {
    throw new ProjectError(`No page with id "${pageId}" in project "${project.id}"`);
  }
  if (project.pages.length === 1) {
    throw new ProjectError("Cannot remove the last page of a project");
  }
  return { ...project, pages: project.pages.filter((p) => p.id !== pageId) };
}

export function renamePage(project: Project, pageId: string, name: string): Project {
  return {
    ...project,
    pages: project.pages.map((p) => (p.id === pageId ? { ...p, name } : p)),
  };
}

export function reorderPages(project: Project, pageId: string, toIndex: number): Project {
  const index = project.pages.findIndex((p) => p.id === pageId);
  if (index === -1) {
    throw new ProjectError(`No page with id "${pageId}" in project "${project.id}"`);
  }
  const pages = [...project.pages];
  const [page] = pages.splice(index, 1);
  const clamped = Math.max(0, Math.min(toIndex, pages.length));
  pages.splice(clamped, 0, page);
  return { ...project, pages };
}

// The glue a caller uses after dispatching an Operation against one page's own
// PageHistory (history.ts) - writes the updated PageHistory back into the project,
// immutably, leaving every other page untouched.
export function updatePageHistory(project: Project, pageId: string, history: PageHistory): Project {
  if (!project.pages.some((p) => p.id === pageId)) {
    throw new ProjectError(`No page with id "${pageId}" in project "${project.id}"`);
  }
  return {
    ...project,
    pages: project.pages.map((p) => (p.id === pageId ? { ...p, history } : p)),
  };
}

export function updateBrand(project: Project, brand: Partial<BrandingData>): Project {
  return { ...project, brand: { ...project.brand, ...brand } };
}

export function updateBusinessProfile(project: Project, profile: Partial<BusinessProfile>): Project {
  return { ...project, businessProfile: { ...project.businessProfile, ...profile } };
}

export function updateSettings(project: Project, settings: Partial<ProjectSettings>): Project {
  return { ...project, settings: { ...project.settings, ...settings } };
}

export function addAsset(project: Project, asset: Asset): Project {
  if (project.assets.some((a) => a.id === asset.id)) {
    throw new ProjectError(`Asset id "${asset.id}" already exists in project "${project.id}"`);
  }
  return { ...project, assets: [...project.assets, asset] };
}

export function removeAsset(project: Project, assetId: string): Project {
  return { ...project, assets: project.assets.filter((a) => a.id !== assetId) };
}
