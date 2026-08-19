import type { ApiErrorResponse } from "@/types/api";

export type ErrorField = { field: string; message: string };

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly fields?: ErrorField[];

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    fields?: ErrorField[],
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409);
    this.name = "ConflictError";
  }
}

export class ValidationAppError extends AppError {
  constructor(message = "Validation failed.", fields?: ErrorField[]) {
    super("VALIDATION_ERROR", message, 422, fields);
    this.name = "ValidationAppError";
  }
}

/** Caller is authenticated but lacks the required role/permission. */
export class ForbiddenError extends AppError {
  constructor(
    code = "FORBIDDEN",
    message = "You do not have permission to perform this action.",
  ) {
    super(code, message, 403);
    this.name = "ForbiddenError";
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/**
 * Wrap an unexpected database error without leaking the raw message to
 * clients. The real cause is logged server-side for debugging; the thrown
 * AppError carries only a generic, safe message.
 */
export function toDatabaseError(error: {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}): AppError {
  console.error("database_error", error);
  const pgCode = error.code ?? "";

  if (pgCode === "42501" || /permission denied|row-level security/i.test(error.message)) {
    return new AppError(
      "FORBIDDEN",
      "The database rejected this write (permission or row-level security).",
      403,
    );
  }
  if (pgCode === "23503") {
    return new AppError(
      "CONFLICT",
      "A related record is missing. Select a real development and try again.",
      409,
    );
  }
  if (pgCode === "23502") {
    return new ValidationAppError("A required field was empty.");
  }
  if (pgCode === "22P02" || /invalid input syntax for type uuid/i.test(error.message)) {
    return new ValidationAppError(
      "An identifier was not valid. Select a real development and try again.",
    );
  }
  if (pgCode === "42703") {
    return new AppError(
      "DATABASE_ERROR",
      "The live database schema is missing a required column.",
      500,
    );
  }
  return new AppError("DATABASE_ERROR", "The database request failed.", 500);
}

export function toErrorDetail(e: unknown): {
  code: string;
  message: string;
  fields?: ErrorField[];
} {
  if (isAppError(e)) {
    return {
      code: e.code,
      message: e.message,
      ...(e.fields ? { fields: e.fields } : {}),
    };
  }
  // Unexpected errors: log the real cause server-side, but never leak the
  // message to clients (it may contain sensitive implementation details).
  console.error("unhandled_error", e);
  return { code: "INTERNAL_ERROR", message: "An unexpected error occurred." };
}

export function toActionError(e: unknown): ApiErrorResponse {
  return { success: false, error: toErrorDetail(e) };
}