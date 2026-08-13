import { randomBytes } from "crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { slugify } from "@/app/lib/publishService";
import { photoStore, type PhotoStore } from "./photoStore";
import { photoKeysOf } from "./photoLimits";
import type { RestaurantInput } from "./input";
import type { LandingPage } from "@/app/types/landing";

// DRAFTS — a generated site that nobody owns yet
//
// The form used to sit behind a sign-in wall: a restaurant owner arriving from an ad had to
// create an account before seeing a single field of what they were being offered. That is
// where the first ones are lost, and it is measurable - it stopped us capturing a
// screenshot of our own form.
//
// So generation now happens for anyone, and the result lives here until someone claims it.
// A draft is deliberately NOT a row in the main database: an anonymous visitor who never
// comes back should leave nothing behind, and a table of abandoned sites is a table someone
// has to reason about, back up and eventually purge.
//
// Two implementations behind one interface. PrismaDraftStore is what runs - see its own
// note for why memory stopped being good enough. InMemoryDraftStore stays for the tests,
// which should not need a database to check an expiry rule.
export interface Draft {
  id: string;
  input: RestaurantInput;
  landing: LandingPage;
  createdAt: number;
  // Expiry runs from here. Viewing a draft renews it - see PrismaDraftStore.get.
  lastViewedAt: number;
}

export interface DraftStore {
  create(input: RestaurantInput, landing: LandingPage): Promise<Draft>;
  get(id: string): Promise<Draft | null>;
  delete(id: string): Promise<void>;
  // Writing a changed draft back. In memory the caller held a reference and mutation was
  // enough; against a database it has to be saved.
  update(id: string, landing: LandingPage): Promise<void>;
}

// Long enough that someone can show it to a business partner over dinner and come back;
// short enough that nothing is quietly retained about a person who never signed up.
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

// A link somebody will actually send to their business partner.
//
// A raw UUID is unguessable but unsendable - nobody forwards
// /preview/d/9ec347dc-5c8c-4cd7-b0cf-54e05bdd81e4 and expects to be taken seriously. A bare
// name is sendable but enumerable: anyone could walk the list, and worse, could generate a
// fake site for a real restaurant at the URL that restaurant would predict.
//
// Name plus a short random suffix is both. Six hex characters is 16 million per name -
// enough that guessing is pointless, short enough that the link still reads as the
// restaurant's own.
export function previewId(name: string): string {
  const base = slugify(name) || "site";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export class InMemoryDraftStore implements DraftStore {
  private readonly drafts = new Map<string, Draft>();

  constructor(
    private readonly ttlMs: number = DRAFT_TTL_MS,
    private readonly now: () => number = Date.now,
    // Opcional: sem ele, o comportamento é exactamente o de antes. Ver `expire`.
    private readonly photos?: Pick<PhotoStore, "remove">
  ) {}

  async create(input: RestaurantInput, landing: LandingPage): Promise<Draft> {
    this.evictExpired();

    const now = this.now();
    const draft: Draft = { id: previewId(input.name), input, landing, createdAt: now, lastViewedAt: now };
    this.drafts.set(draft.id, draft);
    return draft;
  }

  async get(id: string): Promise<Draft | null> {
    const draft = this.drafts.get(id);
    if (!draft) return null;

    if (this.now() - draft.lastViewedAt > this.ttlMs) {
      await this.expire(draft);
      return null;
    }

    const touched = { ...draft, lastViewedAt: this.now() };
    this.drafts.set(id, touched);
    return touched;
  }

  // APAGAR PORQUE FOI RECLAMADO NÃO É APAGAR PORQUE MORREU
  //
  // Isto é chamado quando alguém publica (ver app/api/restaurant/publish/route.ts): o
  // rascunho desaparece porque virou um projecto, e as fotografias passaram a pertencer ao
  // retrato publicado desse projecto.
  //
  // Apagar os ficheiros aqui destruía as fotografias de um restaurante que acabou de
  // publicar - e de um que paga. É por isso que a limpeza vive no `expire` e não neste
  // método, apesar de os dois acabarem por remover a mesma linha.
  async delete(id: string): Promise<void> {
    this.drafts.delete(id);
  }

  async update(id: string, landing: LandingPage): Promise<void> {
    const draft = this.drafts.get(id);
    if (draft) this.drafts.set(id, { ...draft, landing });
  }

  // Morreu de silêncio. Aqui as fotografias vão com ele: ninguém as reclamou, e ficar com
  // elas é uma fuga de disco permanente contra o mesmo disco que guarda as dos clientes.
  private async expire(draft: Draft): Promise<void> {
    this.drafts.delete(draft.id);
    if (!this.photos) return;

    for (const key of photoKeysOf(draft.landing.gallery)) {
      // Uma remoção que falhe não pode impedir a expiração: o pior caso volta a ser o de
      // hoje, um ficheiro a mais no disco, e não um rascunho eterno.
      await this.photos.remove(key).catch(() => undefined);
    }
  }

  // Swept on write rather than on a timer: a background interval keeps a server process
  // awake and has to be torn down in tests, for a map that is only ever a few hundred
  // entries.
  private evictExpired(): void {
    const cutoff = this.now() - this.ttlMs;
    for (const draft of this.drafts.values()) {
      if (draft.lastViewedAt < cutoff) void this.expire(draft);
    }
  }

  get size(): number {
    return this.drafts.size;
  }
}

// A draft that survives a deploy.
//
// The in-memory store above was honest about being temporary, and the cost of that showed
// up the moment there was a runbook: every restart silently destroyed the work of anyone
// mid-flow. They had filled the form, watched their restaurant appear and sent the link to
// a partner - and the link 404s. With two real restaurants in a closed beta that is not an
// edge case; it is what happens the first time we deploy during service.
//
// Still deliberately shallow. No owner, no relations, no cascade, deleted the moment
// someone claims it, swept after 24 hours - a visitor who never returns leaves one row that
// goes away on its own.
export class PrismaDraftStore implements DraftStore {
  constructor(
    private readonly client: PrismaClient,
    private readonly ttlMs: number = DRAFT_TTL_MS,
    private readonly photos: Pick<PhotoStore, "remove"> = photoStore
  ) {}

  async create(input: RestaurantInput, landing: LandingPage): Promise<Draft> {
    // Opportunistic sweep on write, same as the in-memory store: no timer to keep alive and
    // no cron to install for a table that is only ever a few hundred rows.
    //
    // Swept on lastViewedAt, so the clock measures silence rather than age.
    //
    // AS FOTOGRAFIAS VÃO COM O RASCUNHO
    //
    // O `deleteMany` sozinho apagava a linha e deixava os ficheiros para sempre: até 6 × 10
    // MB por cada pré-visualização que alguém começou e não terminou. E o disco que enche é
    // o mesmo que guarda as fotografias dos restaurantes que pagam.
    //
    // Por isso lê-se antes de apagar. A ordem é esta e não a contrária: se a leitura falhar,
    // não se apaga nada e tenta-se outra vez no próximo pedido - enquanto apagar primeiro
    // perdia para sempre a lista do que havia para limpar.
    await this.sweepExpired().catch(() => undefined);

    const row = await this.client.draft.create({
      data: {
        id: previewId(input.name),
        input: input as unknown as Prisma.InputJsonValue,
        landing: landing as unknown as Prisma.InputJsonValue,
      },
    });

    return { id: row.id, input, landing, createdAt: row.createdAt.getTime(), lastViewedAt: row.lastViewedAt.getTime() };
  }

  async get(id: string): Promise<Draft | null> {
    if (!id) return null;

    const row = await this.client.draft.findUnique({ where: { id } });
    if (!row) return null;

    // Expiry is enforced on read as well as by the sweep, so a row the sweep has not
    // reached yet is still gone as far as anyone asking is concerned.
    if (Date.now() - row.lastViewedAt.getTime() > this.ttlMs) {
      // Expirou, não foi reclamado: as fotografias vão com ele. Ver .
      await this.removePhotos(row.landing as unknown as LandingPage);
      await this.delete(id);
      return null;
    }

    // Looking at it counts as still wanting it. Someone who sends the link to a partner
    // and comes back the next evening finds their site where they left it, and the clock
    // starts again from that visit rather than from when they filled the form.
    //
    // Fire-and-forget on purpose: a failed touch means the draft expires on its original
    // schedule, which is the old behaviour - not a reason to fail the page load.
    void this.client.draft
      .update({ where: { id }, data: { lastViewedAt: new Date() } })
      .catch(() => undefined);

    return {
      id: row.id,
      input: row.input as unknown as RestaurantInput,
      landing: row.landing as unknown as LandingPage,
      createdAt: row.createdAt.getTime(),
      lastViewedAt: row.lastViewedAt.getTime(),
    };
  }

  // APAGAR PORQUE FOI RECLAMADO NÃO É APAGAR PORQUE MORREU
  //
  // Chamado quando alguém publica: o rascunho desaparece porque virou um projecto, e as
  // fotografias passaram a pertencer ao retrato publicado desse projecto. Apagar os
  // ficheiros aqui destruía as fotografias de um restaurante que acabou de publicar - e que
  // paga. É por isso que a limpeza vive no sweepExpired e não aqui.
  async delete(id: string): Promise<void> {
    await this.client.draft.delete({ where: { id } }).catch(() => undefined);
  }

  private async removePhotos(landing: LandingPage): Promise<void> {
    for (const key of photoKeysOf(landing.gallery)) {
      // Uma remoção que falhe não pode impedir a expiração: o pior caso volta a ser o de
      // hoje, um ficheiro a mais no disco, e não um rascunho eterno.
      await this.photos.remove(key).catch(() => undefined);
    }
  }

  private async sweepExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - this.ttlMs);

    // Ler ANTES de apagar. Ao contrário perdia-se para sempre a lista do que havia para
    // limpar, e um erro a meio deixava ficheiros órfãos sem ninguém que soubesse deles.
    const expirados = await this.client.draft.findMany({
      where: { lastViewedAt: { lt: cutoff } },
      select: { id: true, landing: true },
    });
    if (expirados.length === 0) return;

    await this.client.draft.deleteMany({ where: { id: { in: expirados.map((d) => d.id) } } });

    for (const rascunho of expirados) {
      await this.removePhotos(rascunho.landing as unknown as LandingPage);
    }
  }

  // The photo endpoints mutate the gallery on a draft they hold. In memory that was a
  // reference and the change stuck by itself; against a database it has to be written back.
  async update(id: string, landing: LandingPage): Promise<void> {
    await this.client.draft
      .update({ where: { id }, data: { landing: landing as unknown as Prisma.InputJsonValue } })
      .catch(() => undefined);
  }
}

const globalForDrafts = globalThis as unknown as { draftStore?: DraftStore };

export const draftStore: DraftStore = globalForDrafts.draftStore ?? new PrismaDraftStore(prisma);

if (process.env.NODE_ENV !== "production") {
  globalForDrafts.draftStore = draftStore;
}
