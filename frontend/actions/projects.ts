"use server";

import { revalidatePath } from "next/cache";

import type { Project } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { requireRole } from "@/lib/server/authorize";
import { toProject } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import { ProjectRepository } from "@/lib/server/repositories/projects";
import { ProjectService } from "@/lib/server/services/projects";

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

const PROJECT_ROUTES = [
  "/dashboard",
  "/dashboard/projects",
  "/dashboard/development",
] as const;

function revalidateProjectRoutes() {
  for (const path of PROJECT_ROUTES) revalidatePath(path);
}

export async function listProjects(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return runListAction<Project>(async () => {
    const { client } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const service = new ProjectService(new ProjectRepository(client));
    const { items, total } = await service.list({ page, limit, status: params?.status ?? null });
    return { items: items.map(toProject), total, page, limit };
  });
}

export async function getProject(id: string) {
  return runAction<Project>(async () => {
    const { client } = await withServerContext();
    const service = new ProjectService(new ProjectRepository(client));
    return toProject(await service.get(id));
  });
}

export async function createProject(payload: ProjectCreateInput) {
  return runAction<Project>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "create", "project");
    const service = new ProjectService(new ProjectRepository(ctx.client), { actor });
    const project = await service.create(payload);
    revalidateProjectRoutes();
    return toProject(project);
  });
}

export async function updateProject(id: string, payload: ProjectUpdateInput) {
  return runAction<Project>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "update", "project");
    const service = new ProjectService(new ProjectRepository(ctx.client), { actor });
    const project = await service.update(id, payload);
    revalidateProjectRoutes();
    return toProject(project);
  });
}

export async function deleteProject(id: string) {
  return runAction<null>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "delete", "project");
    const service = new ProjectService(new ProjectRepository(ctx.client), { actor });
    await service.delete(id);
    revalidateProjectRoutes();
    return null;
  });
}