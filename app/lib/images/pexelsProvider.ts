import type { ResolvedImage, VisualIntent } from "@/app/ai/types/visual";
import type { ImageProvider } from "./types";

// Pexels chosen over Unsplash/Wikimedia/Openverse on LICENSE, not on catalogue size.
// Noctra publishes COMMERCIAL sites for paying customers: the moment a generated page
// carries a CC-BY photo whose attribution the customer never saw, we have handed them a
// legal exposure they did not ask for. The Pexels license permits commercial use with no
// attribution required, which is the only footing on which shipping images into someone
// else's business site is defensible. Credit is still captured and rendered - being
// entitled to omit it is not a reason to.
const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search";
const CANDIDATES_PER_QUERY = 15;

// The subset of the Pexels response this depends on. Typed narrowly on purpose: a
// provider that destructures the whole vendor payload turns every upstream field rename
// into a runtime break here.
interface PexelsPhoto {
  width: number;
  height: number;
  url: string;
  alt: string | null;
  photographer: string;
  photographer_url: string;
  src: { large2x?: string; large?: string; portrait?: string; original?: string };
}

interface PexelsSearchResponse {
  photos?: PexelsPhoto[];
}

// Injected rather than reaching for the global. Two reasons: it keeps this unit testable
// with a fake (this project does not call paid third-party APIs to prove its own code
// works), and it lets a caller supply a fetch with its own timeout/retry policy without
// this file growing one.
export type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface PexelsProviderOptions {
  apiKey: string;
  fetchImpl?: FetchLike;
  // Generation already spends several seconds inside an LLM call. An image lookup that
  // hangs must not be what makes a user abandon the product, so a slow provider is
  // treated exactly like an absent one.
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 4000;

function orientationParam(intent: VisualIntent): string {
  switch (intent.orientation) {
    case "portrait":
      return "portrait";
    case "square":
      return "square";
    default:
      return "landscape";
  }
}

// Pexels' named `src` variants are FIXED-SIZE crops, not scaled copies of the original:
// `large2x`/`large` are always 940x650 and `portrait` is always 800x1200, whatever the
// source photo measured. Reporting `photo.width`/`photo.height` therefore describes a
// file we never serve - and since those dimensions are what reserves the layout box, a
// 4256x4256 original behind a 940x650 crop reserved a square hole for a landscape image.
// The dimensions returned here are the ones the browser will actually receive.
const VARIANTS = {
  landscape: { key: "large2x", width: 940, height: 650 },
  square: { key: "large2x", width: 940, height: 650 },
  portrait: { key: "portrait", width: 800, height: 1200 },
} as const;

function pickSource(photo: PexelsPhoto, orientation: VisualIntent["orientation"]) {
  const variant = VARIANTS[orientation] ?? VARIANTS.landscape;
  const url = photo.src[variant.key as keyof PexelsPhoto["src"]];
  if (url) return { url, width: variant.width, height: variant.height };

  // Only reachable if Pexels stops emitting a variant it has always emitted. The original
  // is the one source whose dimensions we genuinely know.
  if (photo.src.original) return { url: photo.src.original, width: photo.width, height: photo.height };
  return null;
}

export class PexelsImageProvider implements ImageProvider {
  readonly name = "pexels";

  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor({ apiKey, fetchImpl, timeoutMs }: PexelsProviderOptions) {
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async resolve(intent: VisualIntent): Promise<ResolvedImage | null> {
    // Walk from the most evocative phrasing down to the plain industry noun. A miss on
    // "fine dining plated dish in a warm restaurant dining room" should still produce a
    // restaurant photo, not an empty hero.
    const queries = [intent.subject, ...intent.alternateSubjects];

    for (const query of queries) {
      const photos = await this.search(query, orientationParam(intent));
      if (photos.length === 0) continue;

      // The seed picks WHICH of the equally-valid matches this business gets. The subject
      // is a function of the industry, so without this every dentist would receive the
      // single top result - see VisualIntent.variantSeed.
      const photo = photos[intent.variantSeed % photos.length];

      const source = pickSource(photo, intent.orientation);
      if (!source) continue;

      return {
        ...source,
        // The intent's alt text describes what the page MEANS to show and is written for
        // this business; the vendor's is a generic caption. Prefer ours, fall back to
        // theirs only if ours is somehow empty.
        alt: intent.alt.trim() || photo.alt?.trim() || query,
        credit: { name: photo.photographer, url: photo.photographer_url, source: "Pexels" },
      };
    }

    return null;
  }

  private async search(query: string, orientation: string): Promise<PexelsPhoto[]> {
    // A page of candidates rather than the single best match, so `variantSeed` has
    // something to choose between. 15 is enough that two businesses in the same industry
    // realistically differ, and small enough to stay one fast request.
    const url = `${PEXELS_ENDPOINT}?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${CANDIDATES_PER_QUERY}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        headers: { Authorization: this.apiKey },
        signal: controller.signal,
      });

      if (!response.ok) return [];

      const body = (await response.json()) as PexelsSearchResponse;
      return body.photos ?? [];
    } catch {
      // Network failure, timeout, malformed JSON - all the same outcome to a caller: no
      // picture. Never let an image lookup take down a generation the user is waiting on.
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}
