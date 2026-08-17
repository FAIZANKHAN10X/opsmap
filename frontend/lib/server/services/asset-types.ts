import { ConflictError, NotFoundError, ValidationAppError } from "@/lib/server/errors";
import { AssetTypeRepository, type AssetTypeRow } from "@/lib/server/repositories/asset-types";
import { normalizeSlug } from "@/lib/server/validation";
import { audit } from "@/lib/server/audit";

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
  constructor(private readonly repo: AssetTypeRepository) {}

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
    return this.repo.create({
      id: crypto.randomUUID(),
      name,
      slug,
      description: payload.description ?? null,
      sort_order: payload.sort_order ?? 0,
    }).then((type) => {
      audit("asset_type.created", { asset_type_id: type.id, name, slug });
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

    return this.repo.update(item.id, data).then((updated) => {
      audit("asset_type.updated", { asset_type_id: item.id, changes: Object.keys(data) });
      return updated;
    });
  }
}