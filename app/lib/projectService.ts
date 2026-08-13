import type { LandingPage } from "@/app/types/landing";
import type { RestaurantInput } from "@/app/lib/restaurant/input";
import type { BusinessProfile } from "@/app/ai/types";
import type { RepositoryBundle, OperationRecordRow } from "./repositories/types";
import { fromLandingPage, type PageState } from "@/app/editor/pageState";
import { applyOperation, type Operation } from "@/app/editor/operations";
import type { OperationRecord } from "@/app/editor/history";
import type { Project, ProjectPage } from "@/app/editor/project";

// PROJECT SERVICE
//
// The one place a RepositoryBundle (app/lib/repositories/types.ts) is composed with the
// existing, UNMODIFIED pure reducers in app/editor/*. Nothing in app/editor/operations.ts
// or app/editor/history.ts changed to make persistence possible - this is a layer
// wrapped around them, not a rewrite. API routes call these functions; they never touch
// a repository or the Prisma client directly.

// Rebuilds a full PageHistory-shaped {states, records} pair by replaying a page's
// operation log on top of its base state - the same fold applyOperation already powers
// in-memory (app/editor/history.ts's dispatch), just driven by persisted rows instead of
// a live session. Every log entry (not just up to the current cursor) is replayed, so
// redo() still works after a reload even if the page was left mid-undo.
function replayHistory(baseState: PageState, log: readonly OperationRecordRow[]): { states: PageState[]; records: OperationRecord[] } {
  const states: PageState[] = [baseState];
  const records: OperationRecord[] = [];
  let current = baseState;

  for (const row of log) {
    for (const operation of row.operations) {
      current = applyOperation(current, operation);
    }
    states.push(current);
    records.push({ operations: row.operations, actor: row.actor, label: row.label, timestamp: row.timestamp });
  }

  return { states, records };
}

// The state a page's log had reached as of the LAST persisted cursor - not necessarily
// the tip of the log (a session can end mid-undo). New operations from dispatchAndPersist
// apply on top of this, exactly where the editor visually left off.
function stateAtCursor(baseState: PageState, log: readonly OperationRecordRow[], cursor: number): PageState {
  let current = baseState;
  for (const row of log.slice(0, cursor)) {
    for (const operation of row.operations) {
      current = applyOperation(current, operation);
    }
  }
  return current;
}

export async function loadProject(repos: RepositoryBundle, projectId: string): Promise<Project | null> {
  const projectRecord = await repos.projects.findById(projectId);
  if (!projectRecord) return null;

  const [pageRecords, assets] = await Promise.all([repos.pages.listPages(projectId), repos.assets.list(projectId)]);

  const pages: ProjectPage[] = [];
  for (const pageRecord of pageRecords) {
    const baseState = await repos.pages.getBaseState(pageRecord.id);
    if (!baseState) {
      throw new Error(`Page "${pageRecord.id}" is missing its base state`);
    }
    const log = await repos.operationLog.list(pageRecord.id);
    const { states, records } = replayHistory(baseState, log);
    const cursor = Math.max(0, Math.min(pageRecord.cursor, states.length - 1));

    pages.push({
      id: pageRecord.id,
      name: pageRecord.name,
      slug: pageRecord.slug,
      history: { states, records, cursor },
    });
  }

  return {
    id: projectRecord.id,
    name: projectRecord.name,
    businessProfile: projectRecord.businessProfile,
    brand: projectRecord.brand,
    assets,
    pages,
    settings: projectRecord.settings,
  };
}

export async function createProjectFromGeneration(
  repos: RepositoryBundle,
  ownerId: string,
  landing: LandingPage,
  businessProfile: BusinessProfile,
  meta: { name: string; pageName?: string; pageSlug?: string; restaurantInput?: RestaurantInput | null }
): Promise<Project> {
  const pageState = fromLandingPage(landing);

  // Three writes (project, page, sections) that only make sense together - a failure
  // between them used to leave an orphan project with no page, which loadProject then
  // returned as a project the editor couldn't open.
  const projectId = await repos.transaction(async (tx) => {
  const projectRecord = await tx.projects.create({
    ownerId,
    name: meta.name,
    businessProfile,
    brand: landing.site.branding,
    settings: { publishing: { published: false } },
    // Os nove campos, guardados com o projecto. Ficavam no Draft, que e apagado no momento
    // em que alguem reclama o site - e a partir dai ninguem, nem o dono nem nos, voltava a
    // ter o que ele escreveu.
    restaurantInput: meta.restaurantInput ?? null,
  });

  // Bug found while building the Dashboard's multi-project flow: this used to be the
  // literal string "landing" - fine for the in-memory pure-domain layer (app/editor/
  // project.ts's projectFromLandingPage, used only by its own tests, never by this
  // function), but Page.id is a GLOBAL primary key in Postgres (prisma/schema.prisma),
  // not scoped per-project. Every project's page collided on the same id, so only one
  // project could ever exist system-wide before the second creation's INSERT hit a
  // unique-constraint violation. Prefixing with the just-created project's own (already
  // globally-unique) id fixes this while keeping the id readable; `slug` (already
  // `@@unique([projectId, slug])`, correctly project-scoped) still carries the
  // human-facing "/" path.
  const pageId = `${projectRecord.id}-landing`;

    await tx.pages.addPage({
      id: pageId,
      projectId: projectRecord.id,
      name: meta.pageName ?? "Landing",
      slug: meta.pageSlug ?? "/",
      baseState: pageState,
    });

    await tx.sections.replaceAll(pageId, pageState.sections);

    return projectRecord.id;
  });

  // Read back outside the transaction: loadProject is pure reads, and keeping it out
  // keeps the write transaction as short as possible (a transaction held open across a
  // full project read is a connection held hostage under load).
  const project = await loadProject(repos, projectId);
  if (!project) {
    throw new Error("Failed to load project immediately after creating it");
  }
  return project;
}

// Deletes a project and everything under it. The Prisma repository's `delete` already
// cascades at the database level (schema.prisma's `onDelete: Cascade`), but the
// in-memory repository (tests, and any local-dev fallback with no DATABASE_URL) has no
// such mechanism - each repository only owns its own Map, by design (see
// app/lib/repositories/types.ts's header comment), so cascading across pages/sections/
// operation log/assets is this service's job, the same composition role
// createProjectFromGeneration already plays for creation. Safe to run against the Prisma
// repositories too: clearing children before the final cascading `projects.delete` is
// redundant there, never incorrect.
export async function deleteProject(repos: RepositoryBundle, projectId: string): Promise<void> {
  await repos.transaction(async (tx) => {
    const pages = await tx.pages.listPages(projectId);
    for (const page of pages) {
      await tx.sections.replaceAll(page.id, []);
      await tx.operationLog.truncateAfter(page.id, 0);
      await tx.pages.removePage(page.id);
    }

    const assets = await tx.assets.list(projectId);
    for (const asset of assets) {
      await tx.assets.remove(asset.id);
    }

    await tx.projects.delete(projectId);
  });
}

// Raised when another writer advanced the same page's cursor first. Distinct from
// OperationError (the operation itself was invalid) and from a generic failure: the
// operation was fine, it just lost a race, and the correct client response is to
// refetch and reapply rather than retry blindly or show a hard error.
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// Applies one or more Operations to a page and durably persists the result - the
// server-side counterpart to app/editor/history.ts's dispatch/dispatchBatch. The client
// already applied the same operation(s) locally for instant feedback (see
// docs/editor-architecture-report.md); this call is the durability write, not the
// source of the UI update, so its only observable effect for the caller is either
// success or a thrown error to surface as a "couldn't save" state.
//
// All four writes now commit or roll back together, and the cursor advance doubles as
// an optimistic lock. Before this, two edits in flight at once (trivially reachable -
// the editor fires each commit without awaiting the previous one) would both read
// cursor N, both truncate everything from N, and both try to append at index N: one hit
// the unique constraint and the other had already deleted its rival's entry. A crash
// between the append and the cursor update was just as bad in a quieter way - the
// operation was in the log but unreachable, so the edit silently vanished on reload and
// the next edit truncated it away for good.
export async function dispatchAndPersist(
  repos: RepositoryBundle,
  pageId: string,
  operations: Operation | Operation[],
  actor: "user" | "ai",
  label?: string,
  now: number = Date.now()
): Promise<PageState["sections"]> {
  const ops = Array.isArray(operations) ? operations : [operations];

  return repos.transaction(async (tx) => {
    const [baseState, pageRecord, log] = await Promise.all([
      tx.pages.getBaseState(pageId),
      tx.pages.getPage(pageId),
      tx.operationLog.list(pageId),
    ]);
    if (!baseState || !pageRecord) {
      throw new Error(`Page "${pageId}" not found`);
    }

    const cursor = pageRecord.cursor;

    let current = stateAtCursor(baseState, log, cursor);
    for (const operation of ops) {
      current = applyOperation(current, operation);
    }

    // Claim the slot FIRST. If this returns false another writer already took cursor
    // -> cursor+1, so nothing below should run: throwing here rolls the whole
    // transaction back before a single row is written.
    const won = await tx.pages.advanceCursor(pageId, cursor);
    if (!won) {
      throw new ConflictError(`Page "${pageId}" was modified by another change - reload and try again`);
    }

    // Standard undo/redo semantics, persisted: dispatching from a cursor that isn't at
    // the tip of the log discards the now-unreachable "redo" entries beyond it before
    // appending - mirrors app/editor/history.ts's truncateRedoTail exactly. The new
    // entry's index is exactly `cursor`, since everything from there on was just
    // truncated - no COUNT, and therefore no read-modify-write race.
    await tx.operationLog.truncateAfter(pageId, cursor);
    await tx.operationLog.append(pageId, [{ operations: ops, actor, label, timestamp: now }], cursor);
    await tx.sections.replaceAll(pageId, current.sections);

    return current.sections;
  });
}
