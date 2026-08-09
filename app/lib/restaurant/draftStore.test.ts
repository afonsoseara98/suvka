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

  it("forgets a draft nobody came back to", async () => {
    // Written without an intermediate read on purpose: looking at a draft now renews it,
    // so checking it just before the deadline would be what kept it alive.
    let now = 1_000_000;
    const store = new InMemoryDraftStore(DRAFT_TTL_MS, () => now);
    const draft = await store.create(input, landing);

    now += DRAFT_TTL_MS + 1;
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

// Expiry used to run from creation, so a restaurant that made a site on Monday evening and
// came back on Tuesday to show a business partner found a 404 - having abandoned nothing.
describe("looking at a draft keeps it alive", () => {
  it("renews the clock on every view", async () => {
    let now = 1_000_000;
    const store = new InMemoryDraftStore(DRAFT_TTL_MS, () => now);
    const draft = await store.create(input, landing);

    // Visited every twenty hours for three days.
    for (let day = 0; day < 3; day++) {
      now += 20 * 60 * 60 * 1000;
      expect(await store.get(draft.id), `day ${day}`).not.toBeNull();
    }
  });

  it("still expires once nobody has looked for a full day", async () => {
    let now = 1_000_000;
    const store = new InMemoryDraftStore(DRAFT_TTL_MS, () => now);
    const draft = await store.create(input, landing);

    now += 20 * 60 * 60 * 1000;
    expect(await store.get(draft.id)).not.toBeNull();

    // Silence from that visit, not from creation.
    now += DRAFT_TTL_MS + 1;
    expect(await store.get(draft.id)).toBeNull();
  });

  it("sweeps on silence rather than on age", async () => {
    let now = 1_000_000;
    const store = new InMemoryDraftStore(DRAFT_TTL_MS, () => now);
    const old = await store.create(input, landing);

    now += 20 * 60 * 60 * 1000;
    await store.get(old.id);

    // Old enough to be swept if age were the rule, recent enough that it is not.
    now += 10 * 60 * 60 * 1000;
    await store.create(input, landing);
    expect(await store.get(old.id)).not.toBeNull();
  });
});
