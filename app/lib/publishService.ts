import type { RepositoryBundle, OperationRecordRow } from "./repositories/types";
import type { PageState } from "@/app/editor/pageState";
import { applyOperation } from "@/app/editor/operations";

// PUBLISH SERVICE
//
// The seam between "what I am editing" and "what the world sees". Everything here
// follows from one decision (prisma/schema.prisma's Page.publishedState): publishing
// MATERIALIZES the page as it looks at the current cursor and stores that copy, rather
// than storing a pointer into the operation log.
//
// Consequences worth being explicit about, because they are the whole feature:
//   - Editing after publishing changes nothing for visitors until Publish is pressed
//     again. That is the safety property a builder has to have; without it every
//     keystroke is live, which is unusable.
//   - Serving a published page is a single row read - no replay, no cost that grows
//     with how long the owner has been editing. The public surface is the one that has
//     to stay fast, and it is the one being hit by people who are not paying us.

const MAX_SLUG_LENGTH = 60;
const MAX_SLUG_ATTEMPTS = 50;

// Lowercase, ASCII-ish, hyphen-separated. Accents are stripped rather than dropped
// ("Padaria Céu" -> "padaria-ceu") so a Portuguese business name still produces a
// readable URL instead of losing characters.
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    // Combining diacritical marks, stripped after NFD has split "é" into "e" + accent.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return base;
}

// Reserved because they are (or will be) real routes on the same origin - a project
// slugged "dashboard" would shadow the app itself.
const RESERVED_SLUGS = new Set([
  "api", "dashboard", "editor", "new", "benchmark", "login", "logout", "signup",
  "settings", "admin", "s", "static", "public", "assets", "_next", "about", "pricing",
  "terms", "privacy", "support", "help", "docs", "blog", "app", "www",
]);

// Finds a free slug near the requested one. Appends -2, -3, ... rather than random
// noise so the URL a user gets is still guessable and speakable.
export async function resolveAvailableSlug(
  repos: RepositoryBundle,
  desired: string,
  forProjectId: string
): Promise<string> {
  const base = slugify(desired) || "site";

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;

    if (RESERVED_SLUGS.has(candidate)) continue;

    const existing = await repos.projects.findBySlug(candidate);
    if (!existing || existing.id === forProjectId) {
      return candidate;
    }
  }

  // Deterministic attempts exhausted (50 businesses genuinely called the same thing).
  // A short suffix off the project id keeps this collision-free without a random walk.
  return `${base}-${forProjectId.slice(-6)}`;
}

function stateAtCursor(baseState: PageState, log: readonly OperationRecordRow[], cursor: number): PageState {
  let current = baseState;
  for (const row of log.slice(0, cursor)) {
    for (const operation of row.operations) {
      current = applyOperation(current, operation);
    }
  }
  return current;
}

export interface PublishResult {
  slug: string;
  publishedAt: Date;
}

// Publishes every page of a project at its current cursor. One transaction: a project
// must never end up with a slug but no published page, or half its pages live.
export async function publishProject(
  repos: RepositoryBundle,
  projectId: string,
  now: Date = new Date()
): Promise<PublishResult> {
  return repos.transaction(async (tx) => {
    const project = await tx.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found`);
    }

    // A slug is claimed once, on first publish, and then kept forever - re-publishing
    // must never change a URL someone may already have shared.
    const slug = project.slug ?? (await resolveAvailableSlug(tx, project.name, projectId));
    if (project.slug !== slug) {
      await tx.projects.update(projectId, { slug });
    }

    const pages = await tx.pages.listPages(projectId);
    if (pages.length === 0) {
      throw new Error(`Project "${projectId}" has no pages to publish`);
    }

    for (const page of pages) {
      const [baseState, log] = await Promise.all([
        tx.pages.getBaseState(page.id),
        tx.operationLog.list(page.id),
      ]);
      if (!baseState) {
        throw new Error(`Page "${page.id}" is missing its base state`);
      }

      const state = stateAtCursor(baseState, log, page.cursor);
      await tx.pages.setPublishedSnapshot(page.id, { state, index: page.cursor, publishedAt: now });
    }

    await tx.projects.update(projectId, {
      settings: { ...project.settings, publishing: { ...project.settings.publishing, published: true } },
    });

    return { slug, publishedAt: now };
  });
}

// Takes the site offline without discarding the slug: the URL stays reserved for this
// project, so re-publishing later restores the same address rather than handing it to
// whoever asked next.
export async function unpublishProject(repos: RepositoryBundle, projectId: string): Promise<void> {
  await repos.transaction(async (tx) => {
    const project = await tx.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found`);
    }

    const pages = await tx.pages.listPages(projectId);
    for (const page of pages) {
      await tx.pages.setPublishedSnapshot(page.id, null);
    }

    await tx.projects.update(projectId, {
      settings: { ...project.settings, publishing: { ...project.settings.publishing, published: false } },
    });
  });
}

export interface PublishedSite {
  projectName: string;
  slug: string;
  state: PageState;
  publishedAt: Date;
}

// The only read path a public visitor takes. Returns null - never throws, never leaks
// which projects exist - for an unknown slug, an unpublished project, or a project
// whose landing page has no snapshot.
export async function loadPublishedSite(repos: RepositoryBundle, slug: string): Promise<PublishedSite | null> {
  const project = await repos.projects.findBySlug(slug);
  if (!project || !project.settings.publishing.published) {
    return null;
  }

  const pages = await repos.pages.listPages(project.id);
  const landing = pages[0];
  if (!landing) return null;

  const snapshot = await repos.pages.getPublishedSnapshot(landing.id);
  if (!snapshot) return null;

  return {
    projectName: project.name,
    slug: project.slug ?? slug,
    state: snapshot.state,
    publishedAt: snapshot.publishedAt,
  };
}
