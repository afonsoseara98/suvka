import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryRepositories } from "./memory";
import type { RepositoryBundle } from "./types";
import type { SectionInstance, PageState } from "@/app/editor/pageState";
import type { BusinessProfile } from "@/app/ai/types";
import type { BrandingData } from "@/app/types/landing";
import type { ProjectSettings, Asset } from "@/app/editor/project";
import { neutralStrategyDna } from "@/app/ai/testFixtures";

// Contract tests for the repository interfaces (app/lib/repositories/types.ts), run
// against the in-memory implementations - no live database needed. Any future
// implementation (the Prisma one included) is expected to satisfy the exact same
// behavior asserted here; this file is effectively the spec.

const BUSINESS_PROFILE: BusinessProfile = {
  industry: "startup",
  businessModel: "saas",
  primaryGoal: "book_demo",
  audience: "Startup founders",
  tone: "modern",
  priceLevel: "medium",
};

const BRAND: BrandingData = {
  primaryColor: "#111",
  secondaryColor: "#222",
  accentColor: "#333",
  fontHeading: "Inter",
  fontBody: "Inter",
  logoPrompt: "a logo",
};

const SETTINGS: ProjectSettings = { publishing: { published: false } };

const BASE_STATE: PageState = {
  id: "page-fixture",
  dna: neutralStrategyDna(),
  site: {
    seo: { title: "", description: "", keywords: [], ogTitle: "", ogDescription: "" },
    branding: BRAND,
    images: { heroPrompt: "", ogImagePrompt: "" },
  },
  sections: [],
};

function section(overrides: Partial<SectionInstance> & Pick<SectionInstance, "id" | "type">): SectionInstance {
  return {
    variant: "default",
    content: null,
    layout: { prominence: "standard", rhythm: "standard" },
    themeOverrides: {},
    visibility: "visible",
    locked: false,
    metadata: { createdBy: "template", createdAt: 0, updatedAt: 0 },
    version: 0,
    ...overrides,
  };
}

let repos: RepositoryBundle;

beforeEach(() => {
  repos = createInMemoryRepositories();
});

describe("ProjectRepository", () => {
  it("creates a project and finds it by id", async () => {
    const created = await repos.projects.create({
      ownerId: "user-1",
      name: "Acme",
      businessProfile: BUSINESS_PROFILE,
      brand: BRAND,
      settings: SETTINGS,
    });
    expect(created.id).toBeTruthy();
    const found = await repos.projects.findById(created.id);
    expect(found).toEqual(created);
  });

  it("returns null for an unknown id", async () => {
    expect(await repos.projects.findById("nope")).toBeNull();
  });

  it("lists only the projects owned by the given owner", async () => {
    await repos.projects.create({ ownerId: "user-1", name: "A", businessProfile: BUSINESS_PROFILE, brand: BRAND, settings: SETTINGS });
    await repos.projects.create({ ownerId: "user-2", name: "B", businessProfile: BUSINESS_PROFILE, brand: BRAND, settings: SETTINGS });
    const listed = await repos.projects.listByOwner("user-1");
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("A");
  });

  it("updates a project with a partial patch, bumping updatedAt", async () => {
    const created = await repos.projects.create({ ownerId: "user-1", name: "Acme", businessProfile: BUSINESS_PROFILE, brand: BRAND, settings: SETTINGS });
    await new Promise((r) => setTimeout(r, 2));
    const updated = await repos.projects.update(created.id, { name: "Acme Inc" });
    expect(updated.name).toBe("Acme Inc");
    expect(updated.brand).toEqual(BRAND);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
  });

  it("throws when updating an unknown project", async () => {
    await expect(repos.projects.update("nope", { name: "x" })).rejects.toThrow();
  });

  it("deletes a project", async () => {
    const created = await repos.projects.create({ ownerId: "user-1", name: "Acme", businessProfile: BUSINESS_PROFILE, brand: BRAND, settings: SETTINGS });
    await repos.projects.delete(created.id);
    expect(await repos.projects.findById(created.id)).toBeNull();
  });

  it("deleting an unknown project is a no-op, not an error", async () => {
    await expect(repos.projects.delete("nope")).resolves.toBeUndefined();
  });
});

function newPage(overrides: { id: string; projectId: string; name: string; slug: string; baseState?: PageState }) {
  return { baseState: BASE_STATE, ...overrides };
}

describe("PageRepository", () => {
  it("adds a page and retrieves it", async () => {
    const page = await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    expect(await repos.pages.getPage("landing")).toEqual(page);
    expect(page.cursor).toBe(0);
  });

  it("persists and retrieves the base state", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    expect(await repos.pages.getBaseState("landing")).toEqual(BASE_STATE);
  });

  it("returns null base state for an unknown page", async () => {
    expect(await repos.pages.getBaseState("nope")).toBeNull();
  });

  it("rejects a duplicate page id", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    await expect(
      repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Dup", slug: "/dup" }))
    ).rejects.toThrow();
  });

  it("lists pages for a project in insertion order", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    await repos.pages.addPage(newPage({ id: "about", projectId: "proj-1", name: "About", slug: "/about" }));
    const listed = await repos.pages.listPages("proj-1");
    expect(listed.map((p) => p.id)).toEqual(["landing", "about"]);
  });

  it("renames a page", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    await repos.pages.renamePage("landing", "Home");
    expect((await repos.pages.getPage("landing"))?.name).toBe("Home");
  });

  it("reorders pages, clamping an out-of-range index", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    await repos.pages.addPage(newPage({ id: "about", projectId: "proj-1", name: "About", slug: "/about" }));
    await repos.pages.reorderPages("proj-1", "about", 0);
    expect((await repos.pages.listPages("proj-1")).map((p) => p.id)).toEqual(["about", "landing"]);
  });

  it("removes a page", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    await repos.pages.removePage("landing");
    expect(await repos.pages.getPage("landing")).toBeNull();
    expect(await repos.pages.listPages("proj-1")).toEqual([]);
  });

  it("sets the cursor", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    await repos.pages.setCursor("landing", 3);
    expect((await repos.pages.getPage("landing"))?.cursor).toBe(3);
  });
});

describe("SectionRepository", () => {
  it("replaceAll then list round-trips the sections, ordered", async () => {
    const sections = [section({ id: "hero-0", type: "hero" }), section({ id: "stats-1", type: "stats" })];
    await repos.sections.replaceAll("landing", sections);
    expect(await repos.sections.list("landing")).toEqual(sections);
  });

  it("a second replaceAll fully replaces the previous sections", async () => {
    await repos.sections.replaceAll("landing", [section({ id: "hero-0", type: "hero" })]);
    await repos.sections.replaceAll("landing", [section({ id: "footer-0", type: "footer" })]);
    const listed = await repos.sections.list("landing");
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe("footer-0");
  });

  it("returns an empty array for a page with no sections yet", async () => {
    expect(await repos.sections.list("unknown-page")).toEqual([]);
  });

  it("list returns an isolated copy - mutating it doesn't affect the stored rows", async () => {
    await repos.sections.replaceAll("landing", [section({ id: "hero-0", type: "hero" })]);
    const listed = await repos.sections.list("landing");
    listed[0].variant = "mutated";
    expect((await repos.sections.list("landing"))[0].variant).not.toBe("mutated");
  });
});

describe("OperationLogRepository", () => {
  it("writes each record at the caller-supplied index", async () => {
    await repos.operationLog.append("landing", [{ operations: [], actor: "user", timestamp: 1 }], 0);
    await repos.operationLog.append("landing", [{ operations: [], actor: "ai", timestamp: 2 }], 1);
    const log = await repos.operationLog.list("landing");
    expect(log.map((r) => r.index)).toEqual([0, 1]);
    expect(log.map((r) => r.actor)).toEqual(["user", "ai"]);
  });

  it("a single append call with multiple records assigns consecutive indices from startIndex", async () => {
    await repos.operationLog.append(
      "landing",
      [
        { operations: [], actor: "user", timestamp: 1 },
        { operations: [], actor: "user", timestamp: 2 },
      ],
      0
    );
    const log = await repos.operationLog.list("landing");
    expect(log.map((r) => r.index)).toEqual([0, 1]);
  });

  // Guards the invariant Postgres enforces with @@unique([pageId, index]): the caller
  // (dispatchAndPersist) derives startIndex from the page cursor it just claimed, so
  // reusing an occupied index means the concurrency guard upstream failed. Better to
  // fail loudly in tests than to produce a log with duplicate indices that replays wrong.
  it("rejects a startIndex that would collide with an existing entry", async () => {
    await repos.operationLog.append("landing", [{ operations: [], actor: "user", timestamp: 1 }], 0);
    await expect(
      repos.operationLog.append("landing", [{ operations: [], actor: "user", timestamp: 2 }], 0)
    ).rejects.toThrow();
  });

  it("returns an empty log for a page with no operations yet", async () => {
    expect(await repos.operationLog.list("unknown-page")).toEqual([]);
  });

  it("preserves label when provided and omits it correctly when not", async () => {
    await repos.operationLog.append("landing", [{ operations: [], actor: "user", timestamp: 1, label: "Changed variant" }], 0);
    await repos.operationLog.append("landing", [{ operations: [], actor: "user", timestamp: 2 }], 1);
    const log = await repos.operationLog.list("landing");
    expect(log[0].label).toBe("Changed variant");
    expect(log[1].label).toBeUndefined();
  });

  it("truncateAfter discards every entry from keepCount onward", async () => {
    await repos.operationLog.append(
      "landing",
      [
        { operations: [], actor: "user", timestamp: 1 },
        { operations: [], actor: "user", timestamp: 2 },
        { operations: [], actor: "user", timestamp: 3 },
      ],
      0
    );
    await repos.operationLog.truncateAfter("landing", 1);
    const log = await repos.operationLog.list("landing");
    expect(log.map((r) => r.index)).toEqual([0]);
  });

  it("a subsequent append after truncateAfter reuses the freed index", async () => {
    await repos.operationLog.append(
      "landing",
      [
        { operations: [], actor: "user", timestamp: 1 },
        { operations: [], actor: "user", timestamp: 2 },
      ],
      0
    );
    await repos.operationLog.truncateAfter("landing", 1);
    await repos.operationLog.append("landing", [{ operations: [], actor: "user", timestamp: 3 }], 1);
    const log = await repos.operationLog.list("landing");
    expect(log.map((r) => r.index)).toEqual([0, 1]);
    expect(log[1].timestamp).toBe(3);
  });

  it("truncateAfter with keepCount >= length is a no-op", async () => {
    await repos.operationLog.append("landing", [{ operations: [], actor: "user", timestamp: 1 }], 0);
    await repos.operationLog.truncateAfter("landing", 10);
    expect(await repos.operationLog.list("landing")).toHaveLength(1);
  });
});

describe("PageRepository - advanceCursor (optimistic lock)", () => {
  it("advances and reports success when the expected cursor matches", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    expect(await repos.pages.advanceCursor("landing", 0)).toBe(true);
    expect((await repos.pages.getPage("landing"))?.cursor).toBe(1);
  });

  it("refuses and reports failure when another writer already advanced it", async () => {
    await repos.pages.addPage(newPage({ id: "landing", projectId: "proj-1", name: "Landing", slug: "/" }));
    expect(await repos.pages.advanceCursor("landing", 0)).toBe(true);
    // Second writer still believes the cursor is 0 - it must lose, and must not move it.
    expect(await repos.pages.advanceCursor("landing", 0)).toBe(false);
    expect((await repos.pages.getPage("landing"))?.cursor).toBe(1);
  });

  it("reports failure for an unknown page instead of throwing", async () => {
    expect(await repos.pages.advanceCursor("nope", 0)).toBe(false);
  });
});

describe("AssetRepository", () => {
  const asset: Asset = { id: "logo-1", type: "logo", prompt: "a bold logo" };

  it("adds and lists assets for a project", async () => {
    await repos.assets.add("proj-1", asset);
    expect(await repos.assets.list("proj-1")).toEqual([asset]);
  });

  it("rejects a duplicate asset id within the same project", async () => {
    await repos.assets.add("proj-1", asset);
    await expect(repos.assets.add("proj-1", asset)).rejects.toThrow();
  });

  it("removes an asset", async () => {
    await repos.assets.add("proj-1", asset);
    await repos.assets.remove("logo-1");
    expect(await repos.assets.list("proj-1")).toEqual([]);
  });

  it("removing an unknown asset id is a no-op, not an error", async () => {
    await expect(repos.assets.remove("nope")).resolves.toBeUndefined();
  });

  it("scopes listing to the given project only", async () => {
    await repos.assets.add("proj-1", asset);
    expect(await repos.assets.list("proj-2")).toEqual([]);
  });
});
