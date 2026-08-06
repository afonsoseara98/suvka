import type { SectionRepository } from "../types";
import type { SectionInstance } from "@/app/editor/pageState";

export class InMemorySectionRepository implements SectionRepository {
  private readonly sectionsByPage = new Map<string, SectionInstance[]>();

  async replaceAll(pageId: string, sections: readonly SectionInstance[]): Promise<void> {
    // Deep-copy via JSON round-trip - protects the stored "row" from later in-place
    // mutation of the caller's array/objects, the same isolation a real database row
    // gives you for free.
    this.sectionsByPage.set(pageId, JSON.parse(JSON.stringify(sections)));
  }

  async list(pageId: string): Promise<SectionInstance[]> {
    return JSON.parse(JSON.stringify(this.sectionsByPage.get(pageId) ?? []));
  }
}
