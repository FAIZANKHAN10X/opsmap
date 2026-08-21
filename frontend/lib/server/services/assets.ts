import {
  NotFoundError,
  ValidationAppError,
} from "@/lib/server/errors";
import { AssetRepository, type AssetRow, type AssetListFilters, type AssetUpdate } from "@/lib/server/repositories/assets";
import { AssetTypeRepository } from "@/lib/server/repositories/asset-types";
import { AssetStatusRepository } from "@/lib/server/repositories/asset-statuses";
import { ProjectRepository } from "@/lib/server/repositories/projects";
import { NotificationService } from "@/lib/server/services/notifications";
import { audit } from "@/lib/server/audit";
import { assertPagination } from "@/lib/server/pagination";
import { normalizeAssignees, normalizeOperationalMetadata, requireUuid } from "@/lib/server/validation";
import { requireRole, type Actor } from "@/lib/server/authorize";
import type { Json } from "@/types/database";

export type AssetCreateInput = {
  project_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  asset_type_id?: string | null;
  asset_status_id?: string | null;
  owner?: string | null;
  notes?: string | null;
  assignees?: string[];
  metadata?: Record<string, unknown>;
};

export type AssetUpdateInput = {
  name?: string;
  code?: string | null;
  description?: string | null;
  asset_type_id?: string | null;
  asset_status_id?: string | null;
  owner?: string | null;
  notes?: string | null;
  assignees?: string[];
  metadata?: Record<string, unknown>;
};

export class AssetService {
  private readonly repo: AssetRepository;
  private readonly projects: ProjectRepository;
  private readonly assetTypes: AssetTypeRepository;
  private readonly assetStatuses: AssetStatusRepository;
  private readonly notifications: NotificationService;

  constructor(
    client: ConstructorParameters<typeof AssetRepository>[0],
    adminClient: ConstructorParameters<typeof NotificationService>[0],
    private readonly opts: { actor?: Actor | null } = {},
  ) {
    this.repo = new AssetRepository(client);
    this.projects = new ProjectRepository(client);
    this.assetTypes = new AssetTypeRepository(client);
    this.assetStatuses = new AssetStatusRepository(client);
    this.notifications = new NotificationService(client, adminClient);
  }

  async get(assetId: string): Promise<AssetRow> {
    requireUuid(assetId, "asset_id");
    const asset = await this.repo.getById(assetId);
    if (!asset) throw new NotFoundError("ASSET_NOT_FOUND", "Asset not found.");
    return asset;
  }

  async list(opts: AssetListFilters): Promise<{ items: AssetRow[]; total: number }> {
    assertPagination(opts.page, opts.limit);
    if (opts.project_id) {
      requireUuid(opts.project_id, "project_id");
      await this._requireProject(opts.project_id);
    }
    if (opts.asset_type_id) requireUuid(opts.asset_type_id, "asset_type_id");
    if (opts.asset_status_id) requireUuid(opts.asset_status_id, "asset_status_id");
    return this.repo.listFiltered(opts);
  }

  async create(payload: AssetCreateInput): Promise<AssetRow> {
    requireRole(this.opts.actor ?? null, "operator", "create", "asset");
    requireUuid(payload.project_id, "project_id");
    if (payload.asset_type_id) requireUuid(payload.asset_type_id, "asset_type_id");
    if (payload.asset_status_id) requireUuid(payload.asset_status_id, "asset_status_id");
    await this._requireProject(payload.project_id);
    await this._validateTypeAndStatus(payload.asset_type_id ?? null, payload.asset_status_id ?? null);
    const assignees = normalizeAssignees(payload.assignees);
    const name = payload.name.trim();
    if (!name) throw new ValidationAppError("name is required", [{ field: "name", message: "name is required" }]);

    const actorId = this.opts.actor?.id ?? null;
    const asset = await this.repo.create({
      id: crypto.randomUUID(),
      project_id: payload.project_id,
      name,
      code: payload.code?.trim() || null,
      description: payload.description ?? null,
      asset_type_id: payload.asset_type_id ?? null,
      asset_status_id: payload.asset_status_id ?? null,
      owner: payload.owner?.trim() || null,
      notes: payload.notes ?? null,
      assignees: assignees as unknown as Json,
      metadata: normalizeOperationalMetadata(payload.metadata) as unknown as Json,
      created_by: actorId,
      updated_by: actorId,
    });

    if (assignees.length > 0) {
      await this.notifications.notifyAssetAssignments(asset, {
        newAssignees: assignees,
        previousAssignees: [],
      });
    }
    audit("asset.created", {
      asset_id: asset.id,
      project_id: asset.project_id,
      name: asset.name,
      code: asset.code,
      created_by: actorId ?? undefined,
    });
    return asset;
  }

  async update(assetId: string, payload: AssetUpdateInput): Promise<AssetRow> {
    requireRole(this.opts.actor ?? null, "operator", "update", "asset");
    requireUuid(assetId, "asset_id");
    const asset = await this.get(assetId);
    await this._requireProject(asset.project_id);

    const previousAssignees = Array.isArray(asset.assignees) ? (asset.assignees as string[]) : [];
    const data: AssetUpdate = {};

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) throw new ValidationAppError("name cannot be empty", [{ field: "name", message: "name cannot be empty" }]);
      data.name = name;
    }
    if (payload.code !== undefined) data.code = payload.code?.trim() || null;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.owner !== undefined) data.owner = payload.owner?.trim() || null;
    if (payload.notes !== undefined) data.notes = payload.notes;
    if (payload.metadata !== undefined) data.metadata = normalizeOperationalMetadata(payload.metadata) as unknown as Json;

    let assigneesChanged = false;
    if (payload.assignees !== undefined) {
      data.assignees = normalizeAssignees(payload.assignees) as unknown as Json;
      assigneesChanged = true;
    }

    const nextType =
      payload.asset_type_id !== undefined ? payload.asset_type_id : asset.asset_type_id;
    const nextStatus =
      payload.asset_status_id !== undefined ? payload.asset_status_id : asset.asset_status_id;
    if (payload.asset_type_id !== undefined || payload.asset_status_id !== undefined) {
      await this._validateTypeAndStatus(nextType, nextStatus);
    }
    if (payload.asset_type_id !== undefined) data.asset_type_id = nextType;
    if (payload.asset_status_id !== undefined) data.asset_status_id = nextStatus;
    data.updated_by = this.opts.actor?.id ?? null;

    const updated = await this.repo.update(asset.id, data);

    if (assigneesChanged) {
      await this.notifications.notifyAssetAssignments(updated, {
        newAssignees: Array.isArray(updated.assignees) ? (updated.assignees as string[]) : [],
        previousAssignees,
      });
    }
    audit("asset.updated", {
      asset_id: updated.id,
      changes: Object.keys(data),
      updated_by: data.updated_by ?? undefined,
    });
    return updated;
  }

  async delete(assetId: string): Promise<void> {
    requireRole(this.opts.actor ?? null, "manager", "delete", "asset");
    requireUuid(assetId, "asset_id");
    await this.get(assetId);
    await this.repo.softDelete(assetId);
    audit("asset.deleted", { asset_id: assetId, deleted_by: this.opts.actor?.id ?? undefined });
  }

  private async _requireProject(projectId: string) {
    const project = await this.projects.getById(projectId);
    if (!project) throw new NotFoundError("PROJECT_NOT_FOUND", "Project not found.");
  }

  private async _validateTypeAndStatus(
    assetTypeId: string | null,
    assetStatusId: string | null,
  ): Promise<void> {
    if (assetTypeId) {
      const type = await this.assetTypes.getById(assetTypeId);
      if (!type) throw new NotFoundError("ASSET_TYPE_NOT_FOUND", "Asset type not found.");
    }
    if (assetStatusId) {
      const status = await this.assetStatuses.getById(assetStatusId);
      if (!status) throw new NotFoundError("ASSET_STATUS_NOT_FOUND", "Asset status not found.");
    }
  }
}