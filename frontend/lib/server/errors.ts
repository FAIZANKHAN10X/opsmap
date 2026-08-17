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

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/**
 * Wrap an unexpected database error without leaking the raw message to
 * clients. The real cause is logged server-side for debugging; the thrown
 * AppError carries only a generic, safe message.
 */
export function toDatabaseError(error: { message: string }): AppError {
  console.error("database_error", error);
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