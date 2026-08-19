import { describe, expect, it, vi } from "vitest";

import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationAppError,
  isAppError,
  toActionError,
  toDatabaseError,
  toErrorDetail,
} from "@/lib/server/errors";

describe("error classes", () => {
  it("NotFoundError is 404", () => {
    const e = new NotFoundError("PROJECT_NOT_FOUND", "Project not found.");
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe("PROJECT_NOT_FOUND");
  });

  it("ConflictError is 409", () => {
    const e = new ConflictError("PROJECT_SLUG_EXISTS", "A project with this slug already exists.");
    expect(e.statusCode).toBe(409);
  });

  it("ValidationAppError is 422 VALIDATION_ERROR with fields", () => {
    const e = new ValidationAppError("Invalid slug.", [
      { field: "slug", message: "Invalid slug." },
    ]);
    expect(e.statusCode).toBe(422);
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.fields).toEqual([{ field: "slug", message: "Invalid slug." }]);
  });

  it("AppError defaults to 400", () => {
    expect(new AppError("DATABASE_ERROR", "boom").statusCode).toBe(400);
  });
});

describe("toErrorDetail", () => {
  it("keeps code/message/fields for AppError", () => {
    const e = new ValidationAppError("x", [{ field: "a", message: "b" }]);
    expect(toErrorDetail(e)).toEqual({ code: "VALIDATION_ERROR", message: "x", fields: [{ field: "a", message: "b" }] });
  });

  it("omits fields when absent", () => {
    const e = new NotFoundError("N", "m");
    expect(toErrorDetail(e)).toEqual({ code: "N", message: "m" });
  });

  it("maps generic errors to INTERNAL_ERROR without leaking internals", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(toErrorDetail(new Error("boom"))).toEqual({ code: "INTERNAL_ERROR", message: "An unexpected error occurred." });
    expect(toErrorDetail("junk")).toEqual({ code: "INTERNAL_ERROR", message: "An unexpected error occurred." });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("toDatabaseError", () => {
  it("includes the Postgres message instead of a silent generic failure", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const err = toDatabaseError({
      code: "42703",
      message: "column profiles.role does not exist",
    });
    expect(err.code).toBe("DATABASE_ERROR");
    expect(err.message).toBe("The live database schema is missing a required column.");
    spy.mockRestore();
  });

  it("maps RLS/permission failures to FORBIDDEN", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const err = toDatabaseError({
      code: "42501",
      message: "new row violates row-level security policy for table \"assets\"",
    });
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toMatch(/row-level security/i);
    spy.mockRestore();
  });
});

describe("toActionError / isAppError", () => {
  it("produces the API_SPEC envelope", () => {
    const e = new NotFoundError("ASSET_NOT_FOUND", "Asset not found.");
    expect(toActionError(e)).toEqual({
      success: false,
      error: { code: "ASSET_NOT_FOUND", message: "Asset not found." },
    });
  });

  it("isAppError narrows AppError instances", () => {
    expect(isAppError(new ValidationAppError())).toBe(true);
    expect(isAppError(new Error())).toBe(false);
  });
});