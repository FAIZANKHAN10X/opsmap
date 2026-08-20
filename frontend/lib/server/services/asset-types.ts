import { ConflictError, NotFoundError, ValidationAppError } from "@/lib/server/errors";
import { AssetTypeRepository, type AssetTypeRow } from "@/lib/server/repositories/asset-types";
import { normalizeSlug } from "@/lib/server/validation";
import { DEFAULT_ASSET_TYPES } from "@/lib/server/constants";
import { audit } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/authorize";

export type AssetTypeCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
};

export type AssetTypeUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
};

function requireName(name: string, field = "name"): string {
  const cleaned = name.trim();
  if (!cleaned) throw new ValidationAppError("name is required", [{ field, message: "name is required" }]);
  return cleaned;
}

export class AssetTypeService {
  constructor(
    private readonly repo: AssetTypeRepository,
    private readonly opts: { actor?: Actor | null } = {},
  ) {}

  async get(assetTypeId: string): Promise<AssetTypeRow> {
    const item = await this.repo.getById(assetTypeId);
    if (!item) throw new NotFoundError("ASSET_TYPE_NOT_FOUND", "Asset type not found.");
    return item;
  }

  async list(opts: { page: number; limit: number }): Promise<{ items: AssetTypeRow[]; total: number }> {
    return this.repo.list({ page: opts.page, limit: opts.limit });
  }

  async create(payload: AssetTypeCreateInput): Promise<AssetTypeRow> {
    const slug = normalizeSlug(payload.slug);
    const name = requireName(payload.name);
    if (await this.repo.existsSlug(slug)) {
      throw new ConflictError("ASSET_TYPE_SLUG_EXISTS", "An asset type with this slug already exists.");
    }
    const actorId = this.opts.actor?.id ?? null;
    return this.repo.create({
      id: crypto.randomUUID(),
      name,
      slug,
      description: payload.description ?? null,
      sort_order: payload.sort_order ?? 0,
      created_by: actorId,
      updated_by: actorId,
    }).then((type) => {
      audit("asset_type.created", { asset_type_id: type.id, name, slug, created_by: actorId ?? undefined });
      return type;
    });
  }

  async update(assetTypeId: string, payload: AssetTypeUpdateInput): Promise<AssetTypeRow> {
    const item = await this.get(assetTypeId);
    const data: Partial<{
      name: string;
      slug: string;
      description: string | null;
      sort_order: number;
      updated_by: string | null;
    }> = {};

    if (payload.name !== undefined) data.name = requireName(payload.name);
    if (payload.slug !== undefined) {
      const slug = normalizeSlug(payload.slug);
      if (slug !== item.slug && (await this.repo.existsSlug(slug, item.id))) {
        throw new ConflictError("ASSET_TYPE_SLUG_EXISTS", "An asset type with this slug already exists.");
      }
      data.slug = slug;
    }
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.sort_order !== undefined) data.sort_order = payload.sort_order;
    data.updated_by = this.opts.actor?.id ?? null;

    return this.repo.update(item.id, data).then((updated) => {
      audit("asset_type.updated", {
        asset_type_id: item.id,
        changes: Object.keys(data),
        updated_by: data.updated_by ?? undefined,
      });
      return updated;
    });
  }

  /** Create any missing default asset types. Idempotent — never overwrites. */
  async seedDefaults(): Promise<AssetTypeRow[]> {
    const created: AssetTypeRow[] = [];
    for (const item of DEFAULT_ASSET_TYPES) {
      if (await this.repo.existsSlug(item.slug)) continue;
      const type = await this.repo.create({
        id: crypto.randomUUID(),
        name: item.name,
        slug: item.slug,
        description: item.description,
        sort_order: item.sort_order,
      });
      audit("asset_type.seeded", { asset_type_id: type.id, slug: type.slug });
      created.push(type);
    }
    return created;
  }
}