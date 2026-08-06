import type { ResolvedImage, VisualIntent } from "@/app/ai/types/visual";

// IMAGE PROVIDER
//
// Same discipline as app/lib/repositories: one interface, swappable implementations, so
// the pipeline never names a vendor. Which stock library (or, later, which image model)
// supplies the picture is an operational decision that must stay reversible - it is not
// allowed to become an assumption baked into the generator.
//
// Resolution is deliberately allowed to fail. A generated page with a clean editorial
// hero is a good page; a generated page blocked on a third-party API is not a page at
// all. Every implementation returns null rather than throwing, and the renderer treats
// null as a legitimate design (see HeroPhoto / HeroTextBlock).
export interface ImageProvider {
  // Human-readable, for logs and for the milestone report. Never shown to end users.
  readonly name: string;

  resolve(intent: VisualIntent): Promise<ResolvedImage | null>;
}
