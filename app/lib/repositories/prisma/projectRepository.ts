import type { Prisma } from "@prisma/client";
import type { ProjectRepository, ProjectRecord, NewProjectInput, ProjectPatch } from "../types";
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
