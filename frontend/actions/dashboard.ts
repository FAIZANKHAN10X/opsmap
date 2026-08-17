"use server";

import type { ProjectSummary } from "@/types/domain";

import { runAction, withServerContext } from "@/lib/server/action-context";
import { buildProjectSummary } from "@/lib/server/services/dashboard";

export async function getProjectSummary(projectId: string) {
  return runAction<ProjectSummary>(async () => {
    const { client } = await withServerContext();
    return buildProjectSummary(client, projectId);
  });
}