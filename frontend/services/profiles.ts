/**
 * Profile/user service — delegates to Server Actions backed by Supabase.
 * Mirrors GET /api/v1/profiles (users/roles surface).
 */

import type { ApiListSuccess, ApiSuccess, ProfileSummary } from "@/types/domain";

import {
  listUsers as listUsersAction,
  setUserRole as setUserRoleAction,
  type SetUserRoleInput,
} from "@/actions/profiles";
import { unwrapAction, unwrapListAction } from "@/services/helpers";

export async function listUsers(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiListSuccess<ProfileSummary>> {
  return unwrapListAction(await listUsersAction(params));
}

export async function setUserRole(
  input: SetUserRoleInput,
): Promise<ApiSuccess<null>> {
  return unwrapAction(await setUserRoleAction(input));
}