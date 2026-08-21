import { ConflictError, NotFoundError } from "@/lib/server/errors";
import { ProjectRepository, type ProjectRow } from "@/lib/server/repositories/projects";
import { normalizeSlug, requireUuid } from "@/lib/server/validation";
import { ALLOWED_PROJECT_STATUSES } from "@/lib/server/constants";
import { ValidationAppError } from "@/lib/server/errors";
import { audit } from "@/lib/server/audit";
import { assertPagination } from "@/lib/server/pagination";
import { requireRole, type Actor } from "@/lib/server/authorize";

export type ProjectCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  status?: string;
};

export type ProjectUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: string;
};

function validateStatus(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!ALLOWED_PROJECT_STATUSES.has(normalized)) {
    throw new ValidationAppError(
      `status must be one of: ${[...ALLOWED_PROJECT_STATUSES].sort().join(", ")}`,
      [{ field: "status", message: `status must be one of: ${[...ALLOWED_PROJECT_STATUSES].sort().join(", ")}` }],
    );
  }
  return normalized;
}

export class ProjectService {
  constructor(
    private readonly repo: ProjectRepository,
    private readonly opts: { actor?: Actor | null } = {},
  ) {}

  async get(projectId: string): Promise<ProjectRow> {
    requireUuid(projectId, "project_id");
    const project = await this.repo.getById(projectId);
    if (!project) throw new NotFoundError("PROJECT_NOT_FOUND", "Project not found.");
    return project;
  }

  async list(opts: {
    page: number;
    limit: number;
    status?: string | null;
  }): Promise<{ items: ProjectRow[]; total: number }> {
    assertPagination(opts.page, opts.limit);
    return this.repo.list({ page: opts.page, limit: opts.limit, status: opts.status ?? undefined });
  }

  async create(payload: ProjectCreateInput): Promise<ProjectRow> {
    requireRole(this.opts.actor ?? null, "manager", "create", "project");
    const slug = normalizeSlug(payload.slug);
    const name = payload.name.trim();
    if (!name) throw new ValidationAppError("name is required", [{ field: "name", message: "name is required" }]);
    if (await this.repo.existsSlug(slug)) {
      throw new ConflictError("PROJECT_SLUG_EXISTS", "A project with this slug already exists.");
    }
    const status = validateStatus(payload.status) ?? "active";
    const actorId = this.opts.actor?.id ?? null;
    const project = await this.repo.create({
      id: crypto.randomUUID(),
      name,
      slug,
      description: payload.description ?? null,
      status,
      created_by: actorId,
      updated_by: actorId,
    });
    audit("project.created", { project_id: project.id, name, slug, created_by: actorId ?? undefined });
    return project;
  }

  async update(projectId: string, payload: ProjectUpdateInput): Promise<ProjectRow> {
    requireRole(this.opts.actor ?? null, "manager", "update", "project");
    requireUuid(projectId, "project_id");
    const project = await this.get(projectId);
    const data: Partial<{
      name: string;
      slug: string;
      description: string | null;
      status: string;
      updated_by: string | null;
    }> = {};

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) throw new ValidationAppError("name cannot be empty", [{ field: "name", message: "name cannot be empty" }]);
      data.name = name;
    }
    if (payload.slug !== undefined) {
      const slug = normalizeSlug(payload.slug);
      if (slug !== project.slug && (await this.repo.existsSlug(slug, project.id))) {
        throw new ConflictError("PROJECT_SLUG_EXISTS", "A project with this slug already exists.");
      }
      data.slug = slug;
    }
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.status !== undefined) {
      data.status = validateStatus(payload.status) as string;
    }
    data.updated_by = this.opts.actor?.id ?? null;

    const updated = await this.repo.update(project.id, data);
    audit("project.updated", {
      project_id: project.id,
      changes: Object.keys(data),
      updated_by: data.updated_by ?? undefined,
    });
    return updated;
  }

  async delete(projectId: string): Promise<void> {
    requireRole(this.opts.actor ?? null, "manager", "delete", "project");
    requireUuid(projectId, "project_id");
    await this.get(projectId);
    await this.repo.softDelete(projectId);
    audit("project.deleted", { project_id: projectId, deleted_by: this.opts.actor?.id ?? undefined });
  }
}