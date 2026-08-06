import { describe, it, expect, vi } from "vitest";
import { PexelsImageProvider, type FetchLike } from "./pexelsProvider";
import { NullImageProvider, createImageProvider, resolveImageSafely } from "./index";
import type { VisualIntent } from "@/app/ai/types/visual";

// Every test here runs against a fake fetch. Nothing in this file contacts a real image
// API - proving our own code works is not a reason to spend someone else's quota.
function intent(overrides: Partial<VisualIntent> = {}): VisualIntent {
  return {
    treatment: "photo",
    subject: "fine dining plated dish in a warm restaurant dining room",
    alternateSubjects: ["plated dish in a warm restaurant dining room", "restaurant interior with set tables"],
    alt: "Fine dining plated dish in a warm restaurant dining room",
    orientation: "landscape",
    variantSeed: 0,
    scene: "website",
    ...overrides,
  };
}

function photo(overrides: Record<string, unknown> = {}) {
  return {
    width: 1200,
    height: 800,
    url: "https://pexels.com/photo/1",
    alt: "a vendor caption",
    photographer: "Ana Silva",
    photographer_url: "https://pexels.com/@ana",
    src: { large2x: "https://images.pexels.com/large2x.jpg", large: "https://images.pexels.com/large.jpg" },
    ...overrides,
  };
}

function fakeFetch(handler: (url: string) => unknown, ok = true): FetchLike {
  return vi.fn(async (url: string) => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => handler(url),
  })) as unknown as FetchLike;
}

describe("PexelsImageProvider", () => {
  it("resolves the first matching subject into a concrete image", async () => {
    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl: fakeFetch(() => ({ photos: [photo()] })) });
    const result = await provider.resolve(intent());

    expect(result).not.toBeNull();
    expect(result!.url).toBe("https://images.pexels.com/large2x.jpg");
  });

  it("reports the dimensions of the file it actually serves, not the original photo", () => {
    // Pexels' named variants are fixed-size crops: `large2x` is always 940x650 whatever
    // the source measured. Reporting the original (here 1200x800, and in real responses
    // often a perfect square) reserves a layout box of the wrong shape for the image that
    // arrives - which is the entire purpose of carrying dimensions at all.
    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl: fakeFetch(() => ({ photos: [photo()] })) });
    return provider.resolve(intent()).then((result) => {
      expect(result!.width).toBe(940);
      expect(result!.height).toBe(650);
    });
  });

  it("serves the portrait crop, with portrait dimensions, when the layout asked for one", () => {
    const provider = new PexelsImageProvider({
      apiKey: "k",
      fetchImpl: fakeFetch(() => ({ photos: [photo({ src: { portrait: "https://images.pexels.com/portrait.jpg" } })] })),
    });

    return provider.resolve(intent({ orientation: "portrait" })).then((result) => {
      expect(result!.url).toBe("https://images.pexels.com/portrait.jpg");
      expect(result!.width).toBe(800);
      expect(result!.height).toBe(1200);
    });
  });

  it("prefers our own alt text over the vendor's caption", async () => {
    // Ours describes what this page means to show, for this business. Theirs is generic
    // and is the only thing a screen reader or crawler would otherwise get.
    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl: fakeFetch(() => ({ photos: [photo()] })) });
    const result = await provider.resolve(intent());
    expect(result!.alt).toBe("Fine dining plated dish in a warm restaurant dining room");
  });

  it("falls back to the vendor caption only when our alt is empty", async () => {
    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl: fakeFetch(() => ({ photos: [photo()] })) });
    const result = await provider.resolve(intent({ alt: "   " }));
    expect(result!.alt).toBe("a vendor caption");
  });

  it("captures attribution even though this license does not require it", async () => {
    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl: fakeFetch(() => ({ photos: [photo()] })) });
    const result = await provider.resolve(intent());
    expect(result!.credit).toEqual({ name: "Ana Silva", url: "https://pexels.com/@ana", source: "Pexels" });
  });

  it("walks down to a broader subject when the specific one finds nothing", async () => {
    const seen: string[] = [];
    const fetchImpl = fakeFetch((url) => {
      seen.push(decodeURIComponent(url));
      // Only the third, most generic query has a result.
      return seen.length < 3 ? { photos: [] } : { photos: [photo()] };
    });

    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl });
    const result = await provider.resolve(intent());

    expect(result).not.toBeNull();
    expect(seen).toHaveLength(3);
    expect(seen[0]).toContain("fine dining");
    expect(seen[2]).toContain("restaurant interior");
  });

  it("sends the orientation the intent asked for", async () => {
    let requested = "";
    const provider = new PexelsImageProvider({
      apiKey: "k",
      fetchImpl: fakeFetch((url) => {
        requested = url;
        return { photos: [photo()] };
      }),
    });

    await provider.resolve(intent({ orientation: "square" }));
    expect(requested).toContain("orientation=square");
  });

  it("authenticates with the configured key", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ photos: [photo()] }) }));
    const provider = new PexelsImageProvider({ apiKey: "secret-key", fetchImpl: fetchImpl as unknown as FetchLike });

    await provider.resolve(intent());
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: { Authorization: "secret-key" } }));
  });

  it("returns null rather than throwing when the API errors", async () => {
    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl: fakeFetch(() => ({}), false) });
    await expect(provider.resolve(intent())).resolves.toBeNull();
  });

  it("returns null rather than throwing when the network fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    }) as unknown as FetchLike;

    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl });
    await expect(provider.resolve(intent())).resolves.toBeNull();
  });

  it("returns null when a photo carries no usable source url", async () => {
    const provider = new PexelsImageProvider({
      apiKey: "k",
      fetchImpl: fakeFetch(() => ({ photos: [photo({ src: {} })] })),
    });
    await expect(provider.resolve(intent())).resolves.toBeNull();
  });

  it("gives up instead of hanging a generation the user is waiting on", async () => {
    const fetchImpl = ((_url: string, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })) as unknown as FetchLike;

    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl, timeoutMs: 10 });
    await expect(provider.resolve(intent())).resolves.toBeNull();
  });
});

describe("image provider selection", () => {
  it("runs with no key configured", async () => {
    // A working product with nothing configured is the requirement, not a fallback: this
    // is what every local checkout and the whole test suite runs on.
    const provider = createImageProvider({} as NodeJS.ProcessEnv);
    expect(provider.name).toBe("null");
    await expect(provider.resolve(intent())).resolves.toBeNull();
  });

  it("treats a blank key as no key", async () => {
    expect(createImageProvider({ PEXELS_API_KEY: "   " } as unknown as NodeJS.ProcessEnv).name).toBe("null");
  });

  it("uses the stock provider once a key exists", () => {
    expect(createImageProvider({ PEXELS_API_KEY: "abc" } as unknown as NodeJS.ProcessEnv).name).toBe("pexels");
  });
});

describe("resolveImageSafely", () => {
  it("never looks up an image for a software scene", async () => {
    const provider = { name: "spy", resolve: vi.fn() };
    const result = await resolveImageSafely(provider, intent({ treatment: "software-scene" }));

    expect(result).toBeNull();
    expect(provider.resolve).not.toHaveBeenCalled();
  });

  it("swallows a provider that throws so generation still completes", async () => {
    // A picture is worth a lot; it is not worth losing a page the user waited on.
    const broken = {
      name: "broken",
      resolve: async () => {
        throw new Error("boom");
      },
    };
    await expect(resolveImageSafely(broken, intent())).resolves.toBeNull();
  });

  it("passes through a real result untouched", async () => {
    const provider = new PexelsImageProvider({ apiKey: "k", fetchImpl: fakeFetch(() => ({ photos: [photo()] })) });
    const result = await resolveImageSafely(provider, intent());
    expect(result!.url).toBe("https://images.pexels.com/large2x.jpg");
  });

  it("NullImageProvider is honest about having nothing", async () => {
    await expect(new NullImageProvider().resolve()).resolves.toBeNull();
  });
});

// The subject is a function of the industry, so every dentist asks Pexels the same
// question and - taking the top result - every dentist got the same photograph. Measured
// over the 20-business corpus, one photo was shared by three medical businesses and
// another by both trades. A pipeline built on 26 continuous axes so that no two pages look
// alike cannot then hand competitors identical hero imagery.
describe("PexelsImageProvider - variant selection", () => {
  const CANDIDATES = Array.from({ length: 15 }, (_, i) =>
    photo({ src: { large2x: `https://images.pexels.com/photo-${i}.jpg` }, photographer: `Photographer ${i}` })
  );

  function urlFor(variantSeed: number) {
    const provider = new PexelsImageProvider({
      apiKey: "k",
      fetchImpl: fakeFetch(() => ({ photos: CANDIDATES })),
    });
    return provider.resolve(intent({ variantSeed })).then((r) => r!.url);
  }

  it("gives two businesses with different DNA different photographs", async () => {
    expect(await urlFor(3)).not.toBe(await urlFor(9));
  });

  it("is stable - the same business gets the same photograph every time", async () => {
    expect(await urlFor(7)).toBe(await urlFor(7));
  });

  it("stays inside the candidate list for any seed", async () => {
    const urls = CANDIDATES.map((c) => c.src.large2x);
    for (const seed of [0, 1, 14, 15, 16, 1_000_003, 2_147_483_647]) {
      expect(urls).toContain(await urlFor(seed));
    }
  });

  it("asks for a page of candidates rather than a single result", async () => {
    let requested = "";
    const provider = new PexelsImageProvider({
      apiKey: "k",
      fetchImpl: fakeFetch((url) => {
        requested = url;
        return { photos: CANDIDATES };
      }),
    });

    await provider.resolve(intent());
    expect(requested).toContain("per_page=15");
  });

  it("still resolves when the API returns fewer candidates than the seed", async () => {
    const provider = new PexelsImageProvider({
      apiKey: "k",
      fetchImpl: fakeFetch(() => ({ photos: [photo()] })),
    });
    await expect(provider.resolve(intent({ variantSeed: 987654 }))).resolves.not.toBeNull();
  });
});
