import type { BusinessProfile } from "@/app/ai/types";
import type { BrandingData } from "@/app/types/landing";
import type { SectionInstance, PageState } from "@/app/editor/pageState";
import type { Operation } from "@/app/editor/operations";
import type { ProjectSettings, Asset } from "@/app/editor/project";
import type { RestaurantInput } from "@/app/lib/restaurant/input";

// REPOSITORY INTERFACES
//
// The only contract the rest of the app depends on for persistence - never the Prisma
// client directly (see app/lib/projectService.ts, the one place these get composed with
// the pure app/editor/* reducers). Each interface has two implementations:
//   - app/lib/repositories/memory/*.ts   - in-memory, used by tests and as a local-dev
//     fallback with no DATABASE_URL set, the same role InMemoryRateLimiter already
//     plays for RateLimiter (app/lib/rateLimit.ts).
//   - app/lib/repositories/prisma/*.ts   - real, thin Prisma-backed CRUD.
//
// Record types below intentionally reuse the app's own domain types (BusinessProfile,
// BrandingData, SectionInstance, Operation, ...) for JSON-shaped fields rather than
// `unknown`/a separate parallel DTO - both sides of the (de)serialization are ours to
// control, so there's nothing to protect against by inventing a second set of types.

export interface ProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  // null until the project is published for the first time - see prisma/schema.prisma.
  slug: string | null;
  businessProfile: BusinessProfile;
  brand: BrandingData;
  settings: ProjectSettings;
  // Os nove campos do formulário, quando o site veio de lá. null para tudo o que foi criado
  // antes de isto existir e para os sites que não são restaurantes - ver schema.prisma.
  restaurantInput: RestaurantInput | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewProjectInput {
  ownerId: string;
  name: string;
  businessProfile: BusinessProfile;
  brand: BrandingData;
  settings: ProjectSettings;
  restaurantInput?: RestaurantInput | null;
}

export interface ProjectPatch {
  name?: string;
  slug?: string;
  businessProfile?: BusinessProfile;
  brand?: BrandingData;
  settings?: ProjectSettings;
}

// Just enough to put a site in the sitemap: the address and when it last changed. No
// snapshot - the sitemap needs neither, and loading every published PageState to emit a
// list of URLs would make one crawler request read every restaurant's page in full.
export interface PublishedSiteRef {
  slug: string;
  publishedAt: Date;
}

export interface ProjectRepository {
  create(input: NewProjectInput): Promise<ProjectRecord>;
  findById(id: string): Promise<ProjectRecord | null>;
  // The public lookup: the only way an anonymous visitor's request reaches a project.
  findBySlug(slug: string): Promise<ProjectRecord | null>;
  listByOwner(ownerId: string): Promise<ProjectRecord[]>;
  // Every site a stranger can reach today - the sitemap's read path. Must agree exactly
  // with what loadPublishedSite() would return for each slug: a URL listed here that
  // 404s is a Search Console error, and a published site missing from here is a
  // restaurant that never gets found.
  listPublished(): Promise<PublishedSiteRef[]>;
  update(id: string, patch: ProjectPatch): Promise<ProjectRecord>;
  // Cascades to the project's pages/sections/operation log/version tags/assets - the
  // Prisma implementation relies on schema.prisma's `onDelete: Cascade` on every one of
  // those relations; the in-memory implementation mirrors that by deleting the same rows
  // itself, so both implementations leave the store in the same state.
  delete(id: string): Promise<void>;
}

export interface PageRecord {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  cursor: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewPageInput {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  // The full PageState exactly as generated - persisted once, unchanged afterward. See
  // prisma/schema.prisma's Page.baseState for why: it's PageHistory.states[0], the seed
  // loadProject() replays the operation log on top of to reconstruct full undo/redo
  // across sessions, not just within one.
  baseState: PageState;
}

export interface PageRepository {
  addPage(input: NewPageInput): Promise<PageRecord>;
  getPage(pageId: string): Promise<PageRecord | null>;
  getBaseState(pageId: string): Promise<PageState | null>;
  listPages(projectId: string): Promise<PageRecord[]>;
  renamePage(pageId: string, name: string): Promise<void>;
  reorderPages(projectId: string, pageId: string, toIndex: number): Promise<void>;
  removePage(pageId: string): Promise<void>;
  setCursor(pageId: string, cursor: number): Promise<void>;
  // Optimistic lock for the edit path: advances the cursor to `expectedCursor + 1` ONLY
  // if it is still exactly `expectedCursor`, and reports whether it won. This is what
  // makes two concurrent edits to the same page safe - the loser is told it lost
  // (ConflictError -> HTTP 409) instead of silently overwriting the winner's operation
  // at the same log index. In Postgres READ COMMITTED the second UPDATE blocks on the
  // first transaction's row lock, then re-evaluates its WHERE against the committed
  // value, so exactly one of two racing callers can ever see a row count of 1.
  advanceCursor(pageId: string, expectedCursor: number): Promise<boolean>;
  // Publishing writes a materialized copy of the page as it looks right now; passing
  // null unpublishes. Kept separate from setCursor so editing can never accidentally
  // change what the public sees - that separation is the entire point of the feature.
  setPublishedSnapshot(pageId: string, snapshot: PublishedSnapshot | null): Promise<void>;
  getPublishedSnapshot(pageId: string): Promise<PublishedSnapshot | null>;
}

export interface PublishedSnapshot {
  state: PageState;
  // Which operation-log position this snapshot was taken at - provenance only, never
  // replayed to serve a request.
  index: number;
  publishedAt: Date;
}

// The CURRENT materialized sections for a page - see prisma/schema.prisma's Section
// model header comment for why this is a real table, not a JSON blob.
export interface SectionRepository {
  replaceAll(pageId: string, sections: readonly SectionInstance[]): Promise<void>;
  list(pageId: string): Promise<SectionInstance[]>;
}

// Mirrors app/editor/history.ts's OperationRecord field-for-field, plus the log
// position (`index`) that field doesn't need in-memory (array position serves that role
// there) but a persisted, independently-queryable log does.
export interface OperationRecordRow {
  index: number;
  operations: readonly Operation[];
  actor: "user" | "ai";
  label?: string;
  timestamp: number;
}

export interface OperationLogRepository {
  // `startIndex` is passed explicitly rather than derived from a COUNT inside the
  // implementation. The old count-then-insert derivation was a read-modify-write race:
  // two concurrent appends to the same page both counted N and both tried to write
  // index N, violating @@unique([pageId, index]). The caller always knows the correct
  // index without a query - it is exactly the page's current cursor, since everything
  // at or beyond it was just truncated (see projectService.ts's dispatchAndPersist).
  append(pageId: string, records: readonly Omit<OperationRecordRow, "index">[], startIndex: number): Promise<void>;
  list(pageId: string): Promise<OperationRecordRow[]>;
  // Discards every entry with index >= keepCount - the persisted equivalent of
  // app/editor/history.ts's truncateRedoTail: dispatching after an undo must drop the
  // now-orphaned "future" entries before appending, the same standard undo/redo
  // semantics the in-memory PageHistory already enforces.
  truncateAfter(pageId: string, keepCount: number): Promise<void>;
}

export interface AssetRepository {
  add(projectId: string, asset: Asset): Promise<void>;
  remove(assetId: string): Promise<void>;
  list(projectId: string): Promise<Asset[]>;
}

export interface RepositoryBundle {
  projects: ProjectRepository;
  pages: PageRepository;
  sections: SectionRepository;
  operationLog: OperationLogRepository;
  assets: AssetRepository;
  // Runs `fn` against a bundle whose writes all commit or all roll back together.
  // Multi-write flows (dispatchAndPersist, createProjectFromGeneration, deleteProject)
  // used to issue 3-4 independent awaits: a crash midway left the database in a state
  // no code path could produce - e.g. an operation appended to the log but the cursor
  // never advanced, so the next load replayed past it and the edit silently vanished.
  // Nesting is a no-op (the inner call reuses the outer transaction) so a transactional
  // helper stays safe to call from inside another one.
  transaction<T>(fn: (repos: RepositoryBundle) => Promise<T>): Promise<T>;
}
