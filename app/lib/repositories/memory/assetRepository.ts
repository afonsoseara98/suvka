import type { AssetRepository } from "../types";
import type { Asset } from "@/app/editor/project";

export class InMemoryAssetRepository implements AssetRepository {
  private readonly assetsByProject = new Map<string, Asset[]>();
  private readonly projectByAsset = new Map<string, string>();

  async add(projectId: string, asset: Asset): Promise<void> {
    const existing = this.assetsByProject.get(projectId) ?? [];
    if (existing.some((a) => a.id === asset.id)) {
      throw new Error(`Asset id "${asset.id}" already exists in project "${projectId}"`);
    }
    this.assetsByProject.set(projectId, [...existing, asset]);
    this.projectByAsset.set(asset.id, projectId);
  }

  async remove(assetId: string): Promise<void> {
    const projectId = this.projectByAsset.get(assetId);
    if (!projectId) return;
    const existing = this.assetsByProject.get(projectId) ?? [];
    this.assetsByProject.set(
      projectId,
      existing.filter((a) => a.id !== assetId)
    );
    this.projectByAsset.delete(assetId);
  }

  async list(projectId: string): Promise<Asset[]> {
    return [...(this.assetsByProject.get(projectId) ?? [])];
  }
}
