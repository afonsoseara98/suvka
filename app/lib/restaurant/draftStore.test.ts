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

// AS FOTOGRAFIAS DE UM RASCUNHO ABANDONADO
//
// O `deleteMany` apagava a linha e deixava os ficheiros para sempre: até 6 × 10 MB por cada
// pré-visualização que alguém começou e não terminou. E o disco que enche é o mesmo que
// guarda as fotografias dos restaurantes que PAGAM - a única coisa neste produto que não se
// gera outra vez.
describe("as fotografias vão com o rascunho, mas só quando ele morre", () => {
  function fotos() {
    const removidas: string[] = [];
    return { removidas, remove: async (key: string) => void removidas.push(key) };
  }

  function comGaleria(urls: string[]): LandingPage {
    return { ...landing, gallery: urls.map((url) => ({ url, alt: "", credit: null })) } as unknown as LandingPage;
  }

  it("expirar leva as fotografias dele", async () => {
    const photos = fotos();
    let agora = 0;
    const store = new InMemoryDraftStore(1000, () => agora, photos);

    const draft = await store.create(input, comGaleria(["/uploads/abc.jpg", "/uploads/def.jpg"]));
    agora = 2000;

    expect(await store.get(draft.id)).toBeNull();
    expect(photos.removidas).toEqual(["abc.jpg", "def.jpg"]);
  });

  // O CASO QUE DESTRUÍA AS FOTOGRAFIAS DE UM CLIENTE
  //
  // Publicar TAMBÉM apaga o rascunho (app/api/restaurant/publish/route.ts). Se a limpeza
  // vivesse no delete(), publicar destruía as fotografias que o restaurante acabou de pôr
  // no site - e as de quem paga.
  it("ser reclamado NÃO leva as fotografias", async () => {
    const photos = fotos();
    const store = new InMemoryDraftStore(1000, () => 0, photos);

    const draft = await store.create(input, comGaleria(["/uploads/abc.jpg"]));
    await store.delete(draft.id);

    expect(photos.removidas).toEqual([]);
  });

  // As do banco de imagens vivem no servidor da Pexels e não são nossas para apagar.
  it("só apaga as que são nossas", async () => {
    const photos = fotos();
    let agora = 0;
    const store = new InMemoryDraftStore(1000, () => agora, photos);

    const draft = await store.create(
      input,
      comGaleria(["/uploads/minha.jpg", "https://images.pexels.com/photos/1/x.jpeg"])
    );
    agora = 2000;
    await store.get(draft.id);

    expect(photos.removidas).toEqual(["minha.jpg"]);
  });

  it("uma remoção que falhe não impede a expiração", async () => {
    const store = new InMemoryDraftStore(1000, () => 0, {
      remove: async () => {
        throw new Error("disco em baixo");
      },
    });

    const draft = await store.create(input, comGaleria(["/uploads/abc.jpg"]));
    // O pior caso volta a ser o de hoje - um ficheiro a mais - e não um rascunho eterno.
    await expect(new InMemoryDraftStore(1000, () => 2000).get(draft.id)).resolves.toBeNull();
  });
});
