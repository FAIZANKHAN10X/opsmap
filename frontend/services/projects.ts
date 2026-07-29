/**
 * Project service.
 * Currently mock-backed; swap implementation to apiRequest when backend is wired.
 *
 * Future:
 *   GET /api/v1/projects
 *   GET /api/v1/projects/{id}
 */

import type { ApiListSuccess, ApiSuccess, Project } from "@/types/domain";

import { MOCK_PROJECTS, mockForceError } from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

export async function listProjects(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ApiListSuccess<Project>> {
  if (USE_MOCK) {
    await delay();
    if (mockForceError) {
      throw new Error("Failed to load projects.");
    }
    let data = MOCK_PROJECTS.filter((p) => p.status === "active");
    if (params?.status) {
      data = MOCK_PROJECTS.filter((p) => p.status === params.status);
    }
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 25;
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: data.length,
        pages: data.length === 0 ? 0 : 1,
      },
      message: null,
    };
  }

  // Future: return apiRequest<ApiListSuccess<Project>>(`/api/v1/projects?...`)
  throw new Error("Live API not enabled");
}

export async function getProject(id: string): Promise<ApiSuccess<Project>> {
  if (USE_MOCK) {
    await delay(200);
    const project = MOCK_PROJECTS.find((p) => p.id === id);
    if (!project) {
      throw new Error("Project not found.");
    }
    return { success: true, data: project, message: null };
  }

  throw new Error("Live API not enabled");
}
