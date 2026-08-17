/**
 * Client-side assertion helpers for Server Action results.
 * Server actions return the API envelope; on failure the success flag is false
 * with an error detail. These helpers convert failures back to thrown Errors so
 * components keep their existing try/catch + message handling.
 */

import type { ApiResponse } from "@/types/api";
import type { ApiListSuccess } from "@/types/domain";

type Success<T> = Extract<ApiResponse<T>, { success: true }>;

export function unwrapAction<T>(res: ApiResponse<T>): Success<T> {
  if (!res.success) {
    throw new Error(res.error?.message || "Request failed.");
  }
  return res;
}

export function unwrapListAction<T>(res: ApiListSuccess<T>): ApiListSuccess<T> {
  const maybe = res as unknown as { success?: boolean; error?: { message?: string } };
  if (maybe.success === false) {
    throw new Error(maybe.error?.message || "Request failed.");
  }
  return res;
}