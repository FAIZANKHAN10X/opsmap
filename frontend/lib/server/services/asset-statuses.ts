import {
  ConflictError,
  NotFoundError,
  ValidationAppError,
} from "@/lib/server/errors";
import {
  AssetStatusRepository,
  type AssetStatusRow,
} from "@/lib/server/repositories/asset-statuses";
import { normalizeHexColor, normalizeSlug } from "@/lib/server/validation";
import { DEFAULT_ASSET_STATUSES } from "@/lib/server/constants";
import { audit } from "@/lib/server/audit";

export type AssetStatusCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  color: string;
  sort_order?: number;
};

export type AssetStatusUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  color?: string;
  sort_order?: number;
};

function requireName(name: string, field = "name"): string {
  const cleaned = name.trim();
  if (!cleaned) throw new ValidationAppError("name is required", [{ field, message: "name is required" }]);
  return cleaned;
}

export class AssetStatusService {
  constructor(private readonly repo: AssetStatusRepository) {}

  async get(assetStatusId: string): Promise<AssetStatusRow> {
    const item = await this.repo.getById(assetStatusId);
    if (!item) throw new NotFoundError("ASSET_STATUS_NOT_FOUND", "Asset status not found.");
    return item;
  }

  async list(opts: { page: number; limit: number }): Promise<{ items: AssetStatusRow[]; total: number }> {
    return this.repo.list({ page: opts.page, limit: opts.limit });
  }

  async create(payload: AssetStatusCreateInput): Promise<AssetStatusRow> {
    const slug = normalizeSlug(payload.slug);
    const name = requireName(payload.name);
    const color = normalizeHexColor(payload.color);
    if (await this.repo.existsSlug(slug)) {
      throw new ConflictError("ASSET_STATUS_SLUG_EXISTS", "An asset status with this slug already exists.");
    }
    return this.repo.create({
      id: crypto.randomUUID(),
      name,
      slug,
      description: payload.description ?? null,
      color,
      sort_order: payload.sort_order ?? 0,
    }).then((status) => {
      audit("asset_status.created", { asset_status_id: status.id, name, slug });
      return status;
    });
  }

  async update(assetStatusId: string, payload: AssetStatusUpdateInput): Promise<AssetStatusRow> {
    const item = await this.get(assetStatusId);
    const data: Partial<{
      name: string;
      slug: string;
      description: string | null;
      color: string;
      sort_order: number;
    }> = {};

    if (payload.name !== undefined) data.name = requireName(payload.name);
    if (payload.slug !== undefined) {
      const slug = normalizeSlug(payload.slug);
      if (slug !== item.slug && (await this.repo.existsSlug(slug, item.id))) {
        throw new ConflictError("ASSET_STATUS_SLUG_EXISTS", "An asset status with this slug already exists.");
      }
      data.slug = slug;
    }
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.color !== undefined) data.color = normalizeHexColor(payload.color);
    if (payload.sort_order !== undefined) data.sort_order = payload.sort_order;

    return this.repo.update(item.id, data).then((updated) => {
      audit("asset_status.updated", { asset_status_id: item.id, changes: Object.keys(data) });
      return updated;
    });
  }

  async delete(assetStatusId: string): Promise<void> {
    const item = await this.get(assetStatusId);
    const inUse = await this.repo.countAssetsUsing(assetStatusId);
    if (inUse > 0) {
      throw new ValidationAppError(
        `Cannot delete status while ${inUse} asset(s) still use it.`,
        [
          {
            field: "id",
            message: "Reassign assets before deleting this status.",
          },
        ],
      );
    }
    await this.repo.softDelete(item.id);
    audit("asset_status.deleted", { asset_status_id: item.id });
  }

  /** Create any missing default statuses. Idempotent — never overwrites. */
  async seedDefaults(): Promise<AssetStatusRow[]> {
    const created: AssetStatusRow[] = [];
    for (const item of DEFAULT_ASSET_STATUSES) {
      if (await this.repo.existsSlug(item.slug)) continue;
      const status = await this.repo.create({
        id: crypto.randomUUID(),
        name: item.name,
        slug: item.slug,
        description: item.description,
        color: item.color,
        sort_order: item.sort_order,
      });
      audit("asset_status.seeded", { asset_status_id: status.id, slug: status.slug });
      created.push(status);
    }
    return created;
  }
}