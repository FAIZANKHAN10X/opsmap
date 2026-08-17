import type { PaginationMeta } from "@/types/domain";

import { ValidationAppError } from "@/lib/server/errors";

export const DEFAULT_PAGE = 1;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;

/**
 * PaginationMeta.from_totals equivalent. Mirrors the Python schema:
 * pages = ceil(total / limit) if limit > 0 and total > 0 else 0.
 */
export function paginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const pages =
    limit > 0 && total > 0 ? Math.ceil(total / limit) : 0;
  return { page, limit, total, pages };
}

/**
 * Parse and validate page/limit query values. Throws a 422 VALIDATION_ERROR
 * (matching FastAPI query validation) when out of range.
 */
export function parsePagination(
  rawPage: unknown,
  rawLimit: unknown,
  defaultLimit = 25,
): { page: number; limit: number } {
  const page = rawPage === undefined || rawPage === null ? DEFAULT_PAGE : Number(rawPage);
  const limit =
    rawLimit === undefined || rawLimit === null ? defaultLimit : Number(rawLimit);

  const fields: Array<{ field: string; message: string }> = [];
  if (!Number.isInteger(page) || page < 1) {
    fields.push({ field: "page", message: "page must be an integer >= 1" });
  }
  if (!Number.isInteger(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
    fields.push({
      field: "limit",
      message: `limit must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}`,
    });
  }
  if (fields.length > 0) {
    throw new ValidationAppError("Invalid pagination parameters.", fields);
  }
  return { page, limit };
}