/**
 * Project service — delegates to Server Actions backed by Supabase.
 * Mirrors GET /api/v1/projects.
 */

import type { ApiListSuccess, ApiSuccess, Project } from "@/types/domain";

import {
  createProject as createProjectAction,
  deleteProject as deleteProjectAction,
  getProject as getProjectAction,
  listProjects as listProjectsAction,
  updateProject as updateProjectAction,
  type ProjectCreateInput,
  type ProjectUpdateInput,
} from "@/actions/projects";
import { unwrapAction, unwrapListAction } from "@/services/helpers";

export async function listProjects(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ApiListSuccess<Project>> {
  return unwrapListAction(await listProjectsAction(params));
}

export async function getProject(id: string): Promise<ApiSuccess<Project>> {
  return unwrapAction(await getProjectAction(id));
}

export async function createProject(
  input: ProjectCreateInput,
): Promise<ApiSuccess<Project>> {
  return unwrapAction(await createProjectAction(input));
}

export async function updateProject(
  id: string,
  input: ProjectUpdateInput,
): Promise<ApiSuccess<Project>> {
  return unwrapAction(await updateProjectAction(id, input));
}

export async function deleteProject(id: string): Promise<void> {
  unwrapAction(await deleteProjectAction(id));
}