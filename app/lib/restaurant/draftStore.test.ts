import { describe, it, expect } from "vitest";
import { InMemoryDraftStore, DRAFT_TTL_MS } from "./draftStore";
import type { RestaurantInput } from "./input";
import type { LandingPage } from "@/app/types/landing";

const input = { name: "Taberna do Bairro" } as RestaurantInput;
const landing = { hero: { title: "Taberna do Bairro" } } as unknown as LandingPage;

describe("draft store", () => {
  it("returns what was stored", async () => {
    const store = new InMemoryDraftStore();
    const draft = await store.create(input, landing);
    expect((await store.get(draft.id))?.input.name).toBe("Taberna do Bairro");
  });

  it("gives a link somebody can actually send, that nobody can guess", async () => {
    // Both properties matter and they pull against each other. A raw UUID is unguessable
    // and unsendable; a bare name is sendable and would let anyone generate a fake site
    // for a real restaurant at the URL that restaurant would predict.
    const store = new InMemoryDraftStore();
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add((await store.create(input, landing)).id);

    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id, "reads as the restaurant's own").toMatch(/^taberna-do-bairro-[0-9a-f]{6}$/);
    }
  });

  it("still produces a usable id for a name that slugifies to nothing", async () => {
    const store = new InMemoryDraftStore();
    const draft = await store.create({ name: "***" } as RestaurantInput, landing);
    expect(draft.id).toMatch(/^site-[0-9a-f]{6}$/);
  });

  it("forgets a draft nobody claimed", async () => {
    let now = 1_000_000;
    const store = new InMemoryDraftStore(DRAFT_TTL_MS, () => now);
    const draft = await store.create(input, landing);

    now += DRAFT_TTL_MS - 1000;
    expect(await store.get(draft.id)).not.toBeNull();

    now += 2000;
    expect(await store.get(draft.id)).toBeNull();
  });

  it("answers the same way for an expired draft and one that never existed", async () => {
    // A different response for a real-but-expired id would confirm the id was once valid.
    let now = 1_000_000;
    const store = new InMemoryDraftStore(DRAFT_TTL_MS, () => now);
    const draft = await store.create(input, landing);
    now += DRAFT_TTL_MS + 1;

    expect(await store.get(draft.id)).toBeNull();
    expect(await store.get("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("stops holding drafts that have aged out", async () => {
    // Nothing should be retained about a visitor who never came back.
    let now = 1_000_000;
    const store = new InMemoryDraftStore(DRAFT_TTL_MS, () => now);
    for (let i = 0; i < 5; i++) await store.create(input, landing);
    expect(store.size).toBe(5);

    now += DRAFT_TTL_MS + 1;
    await store.create(input, landing);
    expect(store.size).toBe(1);
  });

  it("drops a draft once it has been claimed", async () => {
    const store = new InMemoryDraftStore();
    const draft = await store.create(input, landing);
    await store.delete(draft.id);
    expect(await store.get(draft.id)).toBeNull();
  });
});
