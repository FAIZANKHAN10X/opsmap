import {
  ConflictError,
  NotFoundError,
  ValidationAppError,
} from "@/lib/server/errors";
import {
  AssetStatusRepository,
  type AssetStatusRow,
} from "@/lib/server/repositories/asset-statuses";
import { normalizeHexColor, normalizeSlug, requireName, requireUuid } from "@/lib/server/validation";
import { DEFAULT_ASSET_STATUSES } from "@/lib/server/constants";
import { audit } from "@/lib/server/audit";
import { assertPagination } from "@/lib/server/pagination";
import { requireRole, type Actor } from "@/lib/server/authorize";

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

export class AssetStatusService {
  constructor(
    private readonly repo: AssetStatusRepository,
    private readonly opts: { actor?: Actor | null } = {},
  ) {}

  async get(assetStatusId: string): Promise<AssetStatusRow> {
    requireUuid(assetStatusId, "asset_status_id");
    const item = await this.repo.getById(assetStatusId);
    if (!item) throw new NotFoundError("ASSET_STATUS_NOT_FOUND", "Asset status not found.");
    return item;
  }

  async list(opts: { page: number; limit: number }): Promise<{ items: AssetStatusRow[]; total: number }> {
    assertPagination(opts.page, opts.limit);
    return this.repo.list({ page: opts.page, limit: opts.limit });
  }

  async create(payload: AssetStatusCreateInput): Promise<AssetStatusRow> {
    requireRole(this.opts.actor ?? null, "manager", "create", "asset status");
    const slug = normalizeSlug(payload.slug);
    const name = requireName(payload.name);
    const color = normalizeHexColor(payload.color);
    if (await this.repo.existsSlug(slug)) {
      throw new ConflictError("ASSET_STATUS_SLUG_EXISTS", "An asset status with this slug already exists.");
    }
    const actorId = this.opts.actor?.id ?? null;
    return this.repo.create({
      id: crypto.randomUUID(),
      name,
      slug,
      description: payload.description ?? null,
      color,
      sort_order: payload.sort_order ?? 0,
      created_by: actorId,
      updated_by: actorId,
    }).then((status) => {
      audit("asset_status.created", { asset_status_id: status.id, name, slug, created_by: actorId ?? undefined });
      return status;
    });
  }

  async update(assetStatusId: string, payload: AssetStatusUpdateInput): Promise<AssetStatusRow> {
    requireRole(this.opts.actor ?? null, "manager", "update", "asset status");
    requireUuid(assetStatusId, "asset_status_id");
    const item = await this.get(assetStatusId);
    const data: Partial<{
      name: string;
      slug: string;
      description: string | null;
      color: string;
      sort_order: number;
      updated_by: string | null;
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
    data.updated_by = this.opts.actor?.id ?? null;

    return this.repo.update(item.id, data).then((updated) => {
      audit("asset_status.updated", {
        asset_status_id: item.id,
        changes: Object.keys(data),
        updated_by: data.updated_by ?? undefined,
      });
      return updated;
    });
  }

  async delete(assetStatusId: string): Promise<void> {
    requireRole(this.opts.actor ?? null, "manager", "delete", "asset status");
    requireUuid(assetStatusId, "asset_status_id");
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
    audit("asset_status.deleted", { asset_status_id: item.id, deleted_by: this.opts.actor?.id ?? undefined });
  }

  /** Create any missing default statuses. Idempotent — never overwrites. */
  async seedDefaults(): Promise<AssetStatusRow[]> {
    requireRole(this.opts.actor ?? null, "manager", "seed", "asset statuses");
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