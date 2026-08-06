import type { Prisma } from "@prisma/client";
import type { AssetRepository } from "../types";
import type { Asset, AssetType } from "@/app/editor/project";

interface AssetRow {
  id: string;
  type: string;
  url: string | null;
  prompt: string | null;
  label: string | null;
}

function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    type: row.type as AssetType,
    url: row.url ?? undefined,
    prompt: row.prompt ?? undefined,
    label: row.label ?? undefined,
  };
}

export class PrismaAssetRepository implements AssetRepository {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  async add(projectId: string, asset: Asset): Promise<void> {
    await this.prisma.asset.create({
      data: {
        id: asset.id,
        projectId,
        type: asset.type,
        url: asset.url ?? null,
        prompt: asset.prompt ?? null,
        label: asset.label ?? null,
      },
    });
  }

  async remove(assetId: string): Promise<void> {
    // Matches the in-memory repository's contract: removing an unknown id is a no-op,
    // not an error (Prisma's `delete` would throw P2025 otherwise).
    await this.prisma.asset.deleteMany({ where: { id: assetId } });
  }

  async list(projectId: string): Promise<Asset[]> {
    const rows = await this.prisma.asset.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
    return rows.map(toAsset);
  }
}
