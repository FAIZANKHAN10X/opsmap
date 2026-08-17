"use server";

import type { Project } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
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
    const { client } = await withServerContext();
    const service = new ProjectService(new ProjectRepository(client));
    return toProject(await service.create(payload));
  });
}

export async function updateProject(id: string, payload: ProjectUpdateInput) {
  return runAction<Project>(async () => {
    const { client } = await withServerContext();
    const service = new ProjectService(new ProjectRepository(client));
    return toProject(await service.update(id, payload));
  });
}

export async function deleteProject(id: string) {
  return runAction<null>(async () => {
    const { client } = await withServerContext();
    const service = new ProjectService(new ProjectRepository(client));
    await service.delete(id);
    return null;
  });
}