import type { Prisma } from "@prisma/client";
import type { ProjectRepository, ProjectRecord, NewProjectInput, ProjectPatch, PublishedSiteRef } from "../types";
import type { BusinessProfile } from "@/app/ai/types";
import type { BrandingData } from "@/app/types/landing";
import type { ProjectSettings } from "@/app/editor/project";

interface ProjectRow {
  id: string;
  ownerId: string;
  name: string;
  slug: string | null;
  businessProfile: unknown;
  brand: unknown;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    slug: row.slug,
    businessProfile: row.businessProfile as BusinessProfile,
    brand: row.brand as BrandingData,
    settings: row.settings as ProjectSettings,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  async create(input: NewProjectInput): Promise<ProjectRecord> {
    const row = await this.prisma.project.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        businessProfile: input.businessProfile as object,
        brand: input.brand as object,
        settings: input.settings as object,
      },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<ProjectRecord | null> {
    const row = await this.prisma.project.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async findBySlug(slug: string): Promise<ProjectRecord | null> {
    const row = await this.prisma.project.findUnique({ where: { slug } });
    return row ? toRecord(row) : null;
  }

  async listByOwner(ownerId: string): Promise<ProjectRecord[]> {
    const rows = await this.prisma.project.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } });
    return rows.map(toRecord);
  }

  // The same three conditions loadPublishedSite() applies, in one query instead of one
  // query per site: a slug (claimed on first publish, never released), the publishing
  // flag, and a snapshot on the landing page - which is the FIRST page by `order`, not
  // any page, exactly as the public route resolves it.
  //
  // `slug: { not: null }` narrows the scan to projects that have been published at least
  // once; `published` is read in JS off the settings we already have to select, which
  // keeps the check on the same ProjectSettings type the rest of the app uses instead of
  // a JSON-path filter that no type checker would verify against it.
  async listPublished(): Promise<PublishedSiteRef[]> {
    const rows = await this.prisma.project.findMany({
      where: { slug: { not: null } },
      select: {
        slug: true,
        settings: true,
        pages: { orderBy: { order: "asc" }, take: 1, select: { publishedAt: true } },
      },
    });

    const published: PublishedSiteRef[] = [];
    for (const row of rows) {
      const settings = row.settings as unknown as ProjectSettings;
      const publishedAt = row.pages[0]?.publishedAt;
      if (row.slug && settings.publishing.published && publishedAt) {
        published.push({ slug: row.slug, publishedAt });
      }
    }
    return published;
  }

  async update(id: string, patch: ProjectPatch): Promise<ProjectRecord> {
    const row = await this.prisma.project.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
        ...(patch.businessProfile !== undefined ? { businessProfile: patch.businessProfile as object } : {}),
        ...(patch.brand !== undefined ? { brand: patch.brand as object } : {}),
        ...(patch.settings !== undefined ? { settings: patch.settings as object } : {}),
      },
    });
    return toRecord(row);
  }

  // schema.prisma declares `onDelete: Cascade` on Page/Asset's relation to Project (and
  // transitively on Section/OperationLogEntry/PageVersionTag's relation to Page) - this
  // one delete removes the entire project tree at the database level.
  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }
}
