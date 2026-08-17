/**
 * Project service — delegates to Server Actions backed by Supabase.
 * Mirrors GET /api/v1/projects.
 */

import type { ApiListSuccess, ApiSuccess, Project } from "@/types/domain";

import {
  getProject as getProjectAction,
  listProjects as listProjectsAction,
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