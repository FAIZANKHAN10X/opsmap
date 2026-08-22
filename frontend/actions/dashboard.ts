"use server";

import type { DashboardData, ProjectSummary } from "@/types/domain";

import { runAction, withServerContext } from "@/lib/server/action-context";
import { buildProjectDashboardData, buildProjectSummary } from "@/lib/server/services/dashboard";
import { buildDemoDashboardData, buildDemoProjectSummary } from "@/lib/demo/provider";

export async function getProjectSummary(projectId: string, demo?: boolean) {
  return runAction<ProjectSummary>(async () => {
    const { client } = await withServerContext();
    if (demo) return buildDemoProjectSummary(client);
    return buildProjectSummary(client, projectId);
  });
}

export async function getDashboardData(projectId: string, demo?: boolean) {
  return runAction<DashboardData>(async () => {
    const { client } = await withServerContext();
    if (demo) return buildDemoDashboardData(client);
    return buildProjectDashboardData(client, projectId);
  });
}