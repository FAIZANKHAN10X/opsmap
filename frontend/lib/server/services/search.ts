import { NotFoundError, ValidationAppError } from "@/lib/server/errors";
import { AssetRepository, type AssetRow, type AssetListFilters } from "@/lib/server/repositories/assets";
import { ProjectRepository } from "@/lib/server/repositories/projects";
import { assertPagination } from "@/lib/server/pagination";
import { requireUuid } from "@/lib/server/validation";

export type SearchSuggestion = {
  id: string;
  name: string;
  code: string | null;
  project_id: string;
  owner: string | null;
  asset_status_id: string | null;
  label: string;
};

export class SearchService {
  private readonly assets: AssetRepository;
  private readonly projects: ProjectRepository;

  constructor(client: ConstructorParameters<typeof AssetRepository>[0]) {
    this.assets = new AssetRepository(client);
    this.projects = new ProjectRepository(client);
  }

  async searchAssets(opts: Omit<AssetListFilters, "page" | "limit"> & {
    q?: string | null;
    status?: string | null;
    page?: number;
    limit?: number;
  }): Promise<{ items: AssetRow[]; total: number }> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 25;
    assertPagination(page, limit);
    if (opts.project_id) {
      requireUuid(opts.project_id, "project_id");
      if (!(await this.projects.getById(opts.project_id))) {
        throw new NotFoundError("PROJECT_NOT_FOUND", "Project not found.");
      }
    }
    if (opts.asset_type_id) requireUuid(opts.asset_type_id, "asset_type_id");
    if (opts.asset_status_id) requireUuid(opts.asset_status_id, "asset_status_id");
    if (
      opts.created_after &&
      opts.created_before &&
      new Date(opts.created_after) > new Date(opts.created_before)
    ) {
      throw new ValidationAppError("created_after must be before created_before.", [
        {
          field: "created_after",
          message: "Must be earlier than created_before.",
        },
      ]);
    }

    return this.assets.listFiltered({
      page,
      limit,
      project_id: opts.project_id ?? null,
      asset_type_id: opts.asset_type_id ?? null,
      asset_status_id: opts.asset_status_id ?? null,
      type_slug: opts.type_slug ?? null,
      status_slug: opts.status ?? null,
      search: opts.q ?? opts.search ?? null,
      owner: opts.owner ?? null,
      assigned_to: opts.assigned_to ?? null,
      created_after: opts.created_after ?? null,
      created_before: opts.created_before ?? null,
      sort: opts.sort ?? "created_at",
      order: opts.order ?? "desc",
    });
  }

  async suggestions(
    q: string,
    opts: { project_id?: string | null; limit?: number },
  ): Promise<SearchSuggestion[]> {
    if (opts.project_id) {
      requireUuid(opts.project_id, "project_id");
      if (!(await this.projects.getById(opts.project_id))) {
        throw new NotFoundError("PROJECT_NOT_FOUND", "Project not found.");
      }
    }
    const assets = await this.assets.suggest(q, {
      project_id: opts.project_id ?? null,
      limit: opts.limit ?? 8,
    });
    return assets.map((asset) => {
      const codePart = asset.code ? `${asset.code} \u00b7 ` : "";
      const ownerPart = asset.owner ? ` \u2014 ${asset.owner}` : "";
      return {
        id: asset.id,
        name: asset.name,
        code: asset.code,
        project_id: asset.project_id,
        owner: asset.owner,
        asset_status_id: asset.asset_status_id,
        label: `${codePart}${asset.name}${ownerPart}`,
      };
    });
  }
}