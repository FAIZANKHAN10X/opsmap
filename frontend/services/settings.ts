/**
 * Settings service — delegates to Server Actions backed by Supabase.
 * Read-only integration status only; Settings exposes no write actions.
 */

import type { ApiResponse } from "@/types/api";

import {
  getSupabaseIntegrationStatus as getSupabaseIntegrationStatusAction,
  type SupabaseIntegrationStatus,
} from "@/actions/settings";

export async function getSupabaseIntegrationStatus(): Promise<
  SupabaseIntegrationStatus
> {
  const res = (await getSupabaseIntegrationStatusAction()) as ApiResponse<SupabaseIntegrationStatus>;
  if (!res.success) {
    throw new Error(res.error?.message || "Failed to read Supabase status.");
  }
  return res.data;
}