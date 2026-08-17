"use server";

import type { ProjectSummary } from "@/types/domain";

import { runAction, withServerContext } from "@/lib/server/action-context";
import { buildProjectSummary } from "@/lib/server/services/dashboard";
import { buildDemoProjectSummary } from "@/lib/demo/provider";

export async function getProjectSummary(projectId: string, demo?: boolean) {
  return runAction<ProjectSummary>(async () => {
    const { client } = await withServerContext();
    if (demo) return buildDemoProjectSummary(client);
    return buildProjectSummary(client, projectId);
  });
}