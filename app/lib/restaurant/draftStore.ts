import { randomBytes } from "crypto";
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
// The in-memory implementation is honest about what it is. Drafts vanish when the server
// restarts, which is the correct trade for something with a 24-hour life: the alternative
// is a schema, a migration and a cleanup job for data whose whole purpose is to be
// temporary. When there is more than one server process, DraftStore is the seam a Redis
// implementation drops into - the same shape as RateLimiter's InMemory/Upstash pair.
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

// One shared instance, cached on globalThis for the same reason the Prisma client is: Next
// hot-reloads modules on every save in development, and a fresh store per reload would
// throw away the draft the developer is looking at.
const globalForDrafts = globalThis as unknown as { draftStore?: DraftStore };

export const draftStore: DraftStore = globalForDrafts.draftStore ?? new InMemoryDraftStore();

if (process.env.NODE_ENV !== "production") {
  globalForDrafts.draftStore = draftStore;
}
