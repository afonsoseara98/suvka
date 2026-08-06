import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryRepositories } from "./repositories/memory";
import type { RepositoryBundle } from "./repositories/types";
import { createProjectFromGeneration, loadProject, dispatchAndPersist, deleteProject, ConflictError } from "./projectService";
import { currentState } from "@/app/editor/history";
import { neutralStrategyDna } from "@/app/ai/testFixtures";
import type { LandingPage } from "@/app/types/landing";
import type { BusinessProfile } from "@/app/ai/types";

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

let repos: RepositoryBundle;

beforeEach(() => {
  repos = createInMemoryRepositories();
});

describe("createProjectFromGeneration", () => {
  it("persists a project with one page seeded from the LandingPage", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    expect(project.pages).toHaveLength(1);
    expect(project.pages[0].id).toBe(`${project.id}-landing`);
    expect(project.businessProfile).toEqual(BUSINESS_PROFILE);
    expect(project.brand).toEqual(landingPage().site.branding);
  });

  it("the seeded page's history starts at cursor 0 with no records", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const history = project.pages[0].history;
    expect(history.cursor).toBe(0);
    expect(history.records).toEqual([]);
    expect(history.states).toHaveLength(1);
  });

  it("persists sections that can be read back via the repository directly", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const sections = await repos.sections.list(project.pages[0].id);
    expect(sections.map((s) => s.type)).toEqual(["hero", "stats", "footer"]);
  });

  it("regression: a second project (even for the same owner) does not collide on page id", async () => {
    const first = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "First" });
    const second = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Second" });
    expect(second.pages[0].id).not.toBe(first.pages[0].id);
    expect(await repos.pages.getPage(first.pages[0].id)).not.toBeNull();
    expect(await repos.pages.getPage(second.pages[0].id)).not.toBeNull();
  });
});

describe("loadProject", () => {
  it("returns null for an unknown project", async () => {
    expect(await loadProject(repos, "nope")).toBeNull();
  });

  it("reconstructs a project identical (modulo timestamps) to what was just created", async () => {
    const created = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const loaded = await loadProject(repos, created.id);
    expect(loaded?.id).toBe(created.id);
    expect(loaded?.pages[0].history.states[0].sections.map((s) => s.type)).toEqual(["hero", "stats", "footer"]);
  });
});

describe("deleteProject", () => {
  it("removes the project itself", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    await deleteProject(repos, project.id);
    expect(await repos.projects.findById(project.id)).toBeNull();
  });

  it("cascades to the project's pages, sections and operation log", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const pageId = project.pages[0].id;
    const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;
    await dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user");

    await deleteProject(repos, project.id);

    expect(await repos.pages.listPages(project.id)).toEqual([]);
    expect(await repos.pages.getPage(pageId)).toBeNull();
    expect(await repos.sections.list(pageId)).toEqual([]);
    expect(await repos.operationLog.list(pageId)).toEqual([]);
  });

  it("cascades to the project's assets", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    await repos.assets.add(project.id, { id: "logo-1", type: "logo", prompt: "a logo" });

    await deleteProject(repos, project.id);

    expect(await repos.assets.list(project.id)).toEqual([]);
  });

  it("does not affect other projects", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const other = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Other" });

    await deleteProject(repos, project.id);

    expect(await repos.projects.findById(other.id)).not.toBeNull();
    expect(await repos.pages.listPages(other.id)).toHaveLength(1);
  });
});

describe("dispatchAndPersist", () => {
  it("applies an operation, persists it, and returns the resulting sections", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const pageId = project.pages[0].id;
    const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;

    const sections = await dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user");
    expect(sections.find((s) => s.id === statsId)?.variant).toBe("inline");
  });

  it("a subsequent loadProject reflects the persisted operation", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const pageId = project.pages[0].id;
    const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;

    await dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user", "Changed variant");

    const reloaded = await loadProject(repos, project.id);
    const history = reloaded!.pages[0].history;
    expect(history.cursor).toBe(1);
    expect(history.records).toHaveLength(1);
    expect(history.records[0].label).toBe("Changed variant");
    expect(currentState(history).sections.find((s) => s.id === statsId)?.variant).toBe("inline");
  });

  it("applies a batch of operations as a single log entry", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const pageId = project.pages[0].id;
    const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;

    await dispatchAndPersist(
      repos,
      pageId,
      [
        { kind: "ChangeVariant", sectionId: statsId, variant: "inline" },
        { kind: "HideSection", sectionId: statsId },
      ],
      "ai",
      "AI batch"
    );

    const reloaded = await loadProject(repos, project.id);
    const history = reloaded!.pages[0].history;
    expect(history.records).toHaveLength(1);
    expect(history.records[0].operations).toHaveLength(2);
    const instance = currentState(history).sections.find((s) => s.id === statsId)!;
    expect(instance.variant).toBe("inline");
    expect(instance.visibility).toBe("hidden");
  });

  it("undo (moving the cursor back and persisting it), then a new dispatch, discards the redo tail", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const pageId = project.pages[0].id;
    const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;

    await dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user", "A");
    await dispatchAndPersist(repos, pageId, { kind: "HideSection", sectionId: statsId }, "user", "B");

    // Simulate "undo": move the cursor back to right after A, without touching the log.
    await repos.pages.setCursor(pageId, 1);

    // A fresh dispatch from here should discard B (the redo tail) and become the new
    // record at index 1.
    await dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "cards" }, "user", "C");

    const reloaded = await loadProject(repos, project.id);
    const history = reloaded!.pages[0].history;
    expect(history.records.map((r) => r.label)).toEqual(["A", "C"]);
    expect(currentState(history).sections.find((s) => s.id === statsId)?.variant).toBe("cards");
    expect(currentState(history).sections.find((s) => s.id === statsId)?.visibility).toBe("visible");
  });

  it("throws for an unknown page", async () => {
    await expect(dispatchAndPersist(repos, "nope", { kind: "HideSection", sectionId: "x" }, "user")).rejects.toThrow();
  });

  it("propagates an OperationError without persisting anything for an invalid operation", async () => {
    const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
    const pageId = project.pages[0].id;

    await expect(dispatchAndPersist(repos, pageId, { kind: "DeleteSection", sectionId: "does-not-exist" }, "user")).rejects.toThrow();
    expect(await repos.operationLog.list(pageId)).toEqual([]);
  });

  // Regression tests for the concurrency defect found in the due-diligence audit: two
  // edits in flight against the same page both read cursor N, both truncated from N,
  // and both appended at index N - one hit the unique constraint while the other had
  // already deleted its rival's row. The cursor advance is now an optimistic lock, so
  // the loser is told it lost instead of corrupting the log.
  describe("concurrent writers", () => {
    it("rejects a second writer that started from an already-consumed cursor", async () => {
      const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
      const pageId = project.pages[0].id;
      const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;

      await dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user", "A");

      // Simulate a writer that read the page BEFORE the edit above landed: it still
      // believes the cursor is 0, so its claim on that slot must fail.
      await repos.pages.setCursor(pageId, 0);
      const stale = repos.pages.advanceCursor(pageId, 1);
      expect(await stale).toBe(false);
    });

    // Patched on the repository INSTANCE, not on a spread copy of the bundle:
    // RepositoryBundle.transaction hands the callback the bundle it closed over, so an
    // override on a `{...repos}` copy would never be seen inside the transaction.
    function simulateLostRace(): void {
      repos.pages.advanceCursor = async () => false;
    }

    it("surfaces a lost race as ConflictError, not a generic failure", async () => {
      const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
      const pageId = project.pages[0].id;
      const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;

      simulateLostRace();

      await expect(
        dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user")
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("writes nothing at all when the cursor claim fails", async () => {
      const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
      const pageId = project.pages[0].id;
      const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;

      simulateLostRace();

      await expect(
        dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user")
      ).rejects.toThrow();

      // The log stays empty: the claim is made before any write, so a lost race leaves
      // no partial trace behind.
      expect(await repos.operationLog.list(pageId)).toEqual([]);
      expect((await repos.pages.getPage(pageId))?.cursor).toBe(0);
    });

    it("sequential writers each get their own log index, with no gaps", async () => {
      const project = await createProjectFromGeneration(repos, "user-1", landingPage(), BUSINESS_PROFILE, { name: "Acme" });
      const pageId = project.pages[0].id;
      const statsId = project.pages[0].history.states[0].sections.find((s) => s.type === "stats")!.id;

      await dispatchAndPersist(repos, pageId, { kind: "ChangeVariant", sectionId: statsId, variant: "inline" }, "user", "A");
      await dispatchAndPersist(repos, pageId, { kind: "HideSection", sectionId: statsId }, "user", "B");
      await dispatchAndPersist(repos, pageId, { kind: "ShowSection", sectionId: statsId }, "user", "C");

      const log = await repos.operationLog.list(pageId);
      expect(log.map((r) => r.index)).toEqual([0, 1, 2]);
      expect((await repos.pages.getPage(pageId))?.cursor).toBe(3);
    });
  });
});
