import { randomUUID } from "crypto";
import type {
  ProjectRepository,
  ProjectRecord,
  NewProjectInput,
  ProjectPatch,
  PublishedSiteRef,
  PageRepository,
} from "../types";

// In-memory ProjectRepository - the local-dev fallback / test double for the real
// Prisma-backed one (app/lib/repositories/prisma/projectRepository.ts). Same role
// InMemoryRateLimiter plays for RateLimiter in app/lib/rateLimit.ts: correct only for a
// single process, never durable, never shared across instances - exactly right for
// tests, wrong for production.
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, ProjectRecord>();

  // listPublished() is the one question here that spans two tables, and the Prisma side
  // answers it with a join. The in-memory bundle has no joins, so the page store is
  // handed in (see createInMemoryRepositories) - without it this repository would have
  // to guess at what "published" means, and a test double that disagrees with the real
  // one about that is worse than no test double.
  constructor(private readonly pages?: PageRepository) {}

  async create(input: NewProjectInput): Promise<ProjectRecord> {
    const now = new Date();
    const record: ProjectRecord = {
      id: randomUUID(),
      ownerId: input.ownerId,
      name: input.name,
      slug: null,
      businessProfile: input.businessProfile,
      brand: input.brand,
      settings: input.settings,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<ProjectRecord | null> {
    return this.projects.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<ProjectRecord | null> {
    return Array.from(this.projects.values()).find((p) => p.slug === slug) ?? null;
  }

  async listByOwner(ownerId: string): Promise<ProjectRecord[]> {
    return Array.from(this.projects.values()).filter((p) => p.ownerId === ownerId);
  }

  async listPublished(): Promise<PublishedSiteRef[]> {
    if (!this.pages) {
      throw new Error("InMemoryProjectRepository.listPublished() needs the page store - construct it via createInMemoryRepositories()");
    }

    const published: PublishedSiteRef[] = [];
    for (const project of this.projects.values()) {
      if (!project.slug || !project.settings.publishing.published) continue;

      // The landing page, resolved the same way loadPublishedSite() resolves it.
      const [landing] = await this.pages.listPages(project.id);
      if (!landing) continue;

      const snapshot = await this.pages.getPublishedSnapshot(landing.id);
      if (!snapshot) continue;

      published.push({ slug: project.slug, publishedAt: snapshot.publishedAt });
    }
    return published;
  }

  async update(id: string, patch: ProjectPatch): Promise<ProjectRecord> {
    const existing = this.projects.get(id);
    if (!existing) {
      throw new Error(`No project with id "${id}"`);
    }
    // Mirrors the @@unique([slug]) constraint the Prisma implementation gets for free,
    // so slug collisions surface in tests the same way they would in production.
    if (patch.slug !== undefined) {
      const taken = Array.from(this.projects.values()).some((p) => p.id !== id && p.slug === patch.slug);
      if (taken) {
        throw new Error(`Slug "${patch.slug}" is already taken`);
      }
    }

    const next: ProjectRecord = { ...existing, ...patch, updatedAt: new Date() };
    this.projects.set(id, next);
    return next;
  }

  async delete(id: string): Promise<void> {
    this.projects.delete(id);
  }
}
