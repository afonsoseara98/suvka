import { randomUUID } from "crypto";
import type { ProjectRepository, ProjectRecord, NewProjectInput, ProjectPatch } from "../types";

// In-memory ProjectRepository - the local-dev fallback / test double for the real
// Prisma-backed one (app/lib/repositories/prisma/projectRepository.ts). Same role
// InMemoryRateLimiter plays for RateLimiter in app/lib/rateLimit.ts: correct only for a
// single process, never durable, never shared across instances - exactly right for
// tests, wrong for production.
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, ProjectRecord>();

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
