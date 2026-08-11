import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { InMemoryBenchmarkStore, FileBenchmarkStore, type BenchmarkStore } from "./store";
import type { GenerationRecord, ScoreRecord } from "./types";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

function landingPageFixture() {
  return {
    dna: {} as never,
    site: {
      seo: { title: "T", description: "D", keywords: [], ogTitle: "", ogDescription: "" },
      branding: { primaryColor: "", secondaryColor: "", accentColor: "", fontHeading: "", fontBody: "", logoPrompt: "" },
      images: { heroPrompt: "", ogImagePrompt: "" },
    },
    sections: [],
    hero: {
      badge: "",
      title: "",
      highlightWord: "",
      subtitle: "",
      primaryCTA: "",
      secondaryCTA: "",
      imageStyle: "abstract" as const,
      imagePrompt: "",
      stats: [],
    },
    stats: [],
    features: [],
    benefits: [],
    testimonials: [],
    pricing: [],
    faq: [],
    footer: { company: "", email: "", copyright: "" },
  };
}

function generation(overrides: Partial<GenerationRecord> = {}): GenerationRecord {
  return {
    businessId: "advogado",
    source: "suvka",
    promptUsed: "A small law firm...",
    model: "gpt-4.1-mini",
    landingPage: landingPageFixture(),
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function score(overrides: Partial<ScoreRecord> = {}): ScoreRecord {
  return {
    businessId: "advogado",
    source: "suvka",
    criterion: "clarezaProposta",
    score: 8,
    scoredAt: new Date(0).toISOString(),
    ...overrides,
  };
}

// Contract tests, run against both implementations - the same discipline
// app/lib/repositories/memory.test.ts already established for the persistence layer.
function describeBenchmarkStoreContract(name: string, createStore: () => Promise<BenchmarkStore>) {
  describe(`BenchmarkStore contract - ${name}`, () => {
    let store: BenchmarkStore;

    beforeEach(async () => {
      store = await createStore();
    });

    it("saves and lists generations for a business", async () => {
      await store.saveGeneration(generation({ source: "suvka" }));
      await store.saveGeneration(generation({ source: "chatgpt" }));

      const listed = await store.listGenerations("advogado");
      expect(listed.map((g) => g.source).sort()).toEqual(["chatgpt", "suvka"]);
    });

    it("upserts a generation - saving the same (businessId, source) twice replaces it", async () => {
      await store.saveGeneration(generation({ source: "suvka", model: "gpt-4.1-mini" }));
      await store.saveGeneration(generation({ source: "suvka", model: "gpt-4.1-mini-v2" }));

      const listed = await store.listGenerations("advogado");
      expect(listed).toHaveLength(1);
      expect(listed[0].model).toBe("gpt-4.1-mini-v2");
    });

    it("returns an empty array for a business with no generations yet", async () => {
      expect(await store.listGenerations("unknown-business")).toEqual([]);
    });

    it("saves and lists scores across businesses", async () => {
      await store.saveScore(score({ businessId: "advogado", criterion: "clarezaProposta" }));
      await store.saveScore(score({ businessId: "dentista", criterion: "probabilidadeConversao" }));

      const scores = await store.listScores();
      expect(scores).toHaveLength(2);
    });

    it("upserts a score - saving the same (businessId, source, criterion) twice replaces it", async () => {
      await store.saveScore(score({ criterion: "clarezaProposta", score: 5 }));
      await store.saveScore(score({ criterion: "clarezaProposta", score: 9 }));

      const scores = await store.listScores();
      expect(scores).toHaveLength(1);
      expect(scores[0].score).toBe(9);
    });

    it("keeps scores for different criteria independent", async () => {
      await store.saveScore(score({ criterion: "clarezaProposta", score: 5 }));
      await store.saveScore(score({ criterion: "probabilidadeConversao", score: 9 }));

      const scores = await store.listScores();
      expect(scores).toHaveLength(2);
    });
  });
}

describeBenchmarkStoreContract("InMemoryBenchmarkStore", async () => new InMemoryBenchmarkStore());

describe("FileBenchmarkStore - temp directory round trip", () => {
  let dir: string;
  let store: FileBenchmarkStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "suvka-benchmark-"));
    store = new FileBenchmarkStore(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("persists a generation to disk and reads it back", async () => {
    await store.saveGeneration(generation({ source: "claude" }));
    const listed = await store.listGenerations("advogado");
    expect(listed).toHaveLength(1);
    expect(listed[0].source).toBe("claude");
  });

  it("creates the directory if it doesn't exist yet", async () => {
    const nested = new FileBenchmarkStore(path.join(dir, "nested", "deeper"));
    await expect(nested.saveGeneration(generation())).resolves.toBeUndefined();
  });

  it("returns empty results, not an error, when the directory doesn't exist yet", async () => {
    const empty = new FileBenchmarkStore(path.join(dir, "never-created"));
    expect(await empty.listGenerations("advogado")).toEqual([]);
    expect(await empty.listScores()).toEqual([]);
  });
});

describeBenchmarkStoreContract("FileBenchmarkStore", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "suvka-benchmark-contract-"));
  return new FileBenchmarkStore(dir);
});
