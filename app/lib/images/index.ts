import type { ResolvedImage, VisualIntent } from "@/app/ai/types/visual";
import type { ImageProvider } from "./types";
import { PexelsImageProvider } from "./pexelsProvider";

export type { ImageProvider } from "./types";
export { PexelsImageProvider } from "./pexelsProvider";

// The honest "no pictures configured" implementation. Not a stub and not a placeholder
// generator: it reports that no photograph is available, and the renderer answers that
// with a deliberate editorial hero rather than a fake one. See HeroTextBlock.
export class NullImageProvider implements ImageProvider {
  readonly name = "null";

  async resolve(): Promise<ResolvedImage | null> {
    return null;
  }
}

// One place a provider is constructed, mirroring app/lib/repos.ts. Absence of a key is a
// supported configuration, not an error: the product must run end to end - generate,
// edit, publish - with nothing configured, which is also what keeps the test suite and
// every local dev environment free of third-party dependencies.
export function createImageProvider(env: NodeJS.ProcessEnv = process.env): ImageProvider {
  const apiKey = env.PEXELS_API_KEY?.trim();
  if (!apiKey) return new NullImageProvider();
  return new PexelsImageProvider({ apiKey });
}

// Resolution is best-effort by contract. A provider that throws (a bug in a future
// implementation, not a network failure - those are already swallowed) must not be able
// to fail a generation the user has been waiting several seconds for.
export async function resolveImageSafely(
  provider: ImageProvider,
  intent: VisualIntent
): Promise<ResolvedImage | null> {
  if (intent.treatment !== "photo") return null;

  try {
    return await provider.resolve(intent);
  } catch {
    return null;
  }
}
