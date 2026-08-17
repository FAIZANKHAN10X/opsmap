import "server-only";

import { NextResponse } from "next/server";

import type { ApiListSuccess, PaginationMeta } from "@/types/domain";
import type { ApiResponse } from "@/types/api";
import { toErrorDetail } from "@/lib/server/errors";

function responseJson<T>(body: ApiResponse<T> | ApiListSuccess<T>, status: number) {
  return NextResponse.json(body, { status });
}

export function okJson<T>(data: T, message: string | null = null): NextResponse {
  return responseJson({ success: true, data, message }, 200);
}

export function listJson<T>(
  data: T[],
  pagination: PaginationMeta,
  message: string | null = null,
): NextResponse {
  return responseJson({ success: true, data, pagination, message }, 200);
}

export function errorJson(e: unknown): NextResponse {
  const detail = toErrorDetail(e);
  const status = e instanceof Error ? (e as { statusCode?: number }).statusCode ?? 500 : 500;
  return responseJson({ success: false, error: detail }, status);
}

export function methodNotAllowedJson(): NextResponse {
  return responseJson(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } },
    405,
  );
}

export function unauthorizedJson(): NextResponse {
  return responseJson(
    {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    },
    401,
  );
}

export function serviceUnavailableJson(message = "Service unavailable."): NextResponse {
  return responseJson(
    { success: false, error: { code: "SERVICE_UNAVAILABLE", message } },
    503,
  );
}