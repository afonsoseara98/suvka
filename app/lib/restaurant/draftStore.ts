import { randomBytes } from "crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { slugify } from "@/app/lib/publishService";
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

  constructor(private readonly ttlMs: number = DRAFT_TTL_MS, private readonly now: () => number = Date.now) {}

  async create(input: RestaurantInput, landing: LandingPage): Promise<Draft> {
    this.evictExpired();

    const draft: Draft = { id: previewId(input.name), input, landing, createdAt: this.now() };
    this.drafts.set(draft.id, draft);
    return draft;
  }

  async get(id: string): Promise<Draft | null> {
    const draft = this.drafts.get(id);
    if (!draft) return null;

    if (this.now() - draft.createdAt > this.ttlMs) {
      this.drafts.delete(id);
      return null;
    }

    return draft;
  }

  async delete(id: string): Promise<void> {
    this.drafts.delete(id);
  }

  async update(id: string, landing: LandingPage): Promise<void> {
    const draft = this.drafts.get(id);
    if (draft) this.drafts.set(id, { ...draft, landing });
  }

  // Swept on write rather than on a timer: a background interval keeps a server process
  // awake and has to be torn down in tests, for a map that is only ever a few hundred
  // entries.
  private evictExpired(): void {
    const cutoff = this.now() - this.ttlMs;
    for (const [id, draft] of this.drafts) {
      if (draft.createdAt < cutoff) this.drafts.delete(id);
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
  constructor(private readonly client: PrismaClient, private readonly ttlMs: number = DRAFT_TTL_MS) {}

  async create(input: RestaurantInput, landing: LandingPage): Promise<Draft> {
    // Opportunistic sweep on write, same as the in-memory store: no timer to keep alive and
    // no cron to install for a table that is only ever a few hundred rows.
    await this.client.draft
      .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - this.ttlMs) } } })
      .catch(() => undefined);

    const row = await this.client.draft.create({
      data: {
        id: previewId(input.name),
        input: input as unknown as Prisma.InputJsonValue,
        landing: landing as unknown as Prisma.InputJsonValue,
      },
    });

    return { id: row.id, input, landing, createdAt: row.createdAt.getTime() };
  }

  async get(id: string): Promise<Draft | null> {
    if (!id) return null;

    const row = await this.client.draft.findUnique({ where: { id } });
    if (!row) return null;

    // Expiry is enforced on read as well as by the sweep, so a row the sweep has not
    // reached yet is still gone as far as anyone asking is concerned.
    if (Date.now() - row.createdAt.getTime() > this.ttlMs) {
      await this.delete(id);
      return null;
    }

    return {
      id: row.id,
      input: row.input as unknown as RestaurantInput,
      landing: row.landing as unknown as LandingPage,
      createdAt: row.createdAt.getTime(),
    };
  }

  async delete(id: string): Promise<void> {
    await this.client.draft.delete({ where: { id } }).catch(() => undefined);
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
