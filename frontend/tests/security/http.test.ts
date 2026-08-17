import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  errorJson,
  listJson,
  methodNotAllowedJson,
  okJson,
  serviceUnavailableJson,
  unauthorizedJson,
} from "@/lib/server/http";
import {
  AppError,
  NotFoundError,
  ValidationAppError,
} from "@/lib/server/errors";

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});

describe("errorJson", () => {
  it("returns the AppError envelope with its status code", async () => {
    const res = errorJson(new AppError("DATABASE_ERROR", "connection refused", 500));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: { code: "DATABASE_ERROR", message: "connection refused" } });
  });

  it("maps NotFoundError to 404", async () => {
    const res = errorJson(new NotFoundError("DOCUMENT_NOT_FOUND", "Document not found."));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("includes validation field details", async () => {
    const res = errorJson(
      new ValidationAppError("Invalid input.", [{ field: "name", message: "required" }]),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.fields).toEqual([{ field: "name", message: "required" }]);
  });

  it("never leaks the message of unexpected errors", async () => {
    const res = errorJson(new Error("pg password = hunter2 in conn string"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("An unexpected error occurred.");
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(consoleError).toHaveBeenCalledWith("unhandled_error", expect.any(Error));
  });
});

describe("envelope helpers", () => {
  it("okJson wraps data", async () => {
    const res = okJson({ ok: 1 });
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { ok: 1 }, message: null });
  });

  it("listJson includes pagination", async () => {
    const res = listJson([1], { page: 1, limit: 10, total: 1, pages: 1 });
    const body = await res.json();
    expect(body.pagination).toEqual({ page: 1, limit: 10, total: 1, pages: 1 });
  });

  it("methodNotAllowedJson returns 405", async () => {
    const res = methodNotAllowedJson();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("unauthorizedJson returns 401", async () => {
    const res = unauthorizedJson();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("serviceUnavailableJson returns 503 with the message", async () => {
    const res = serviceUnavailableJson("Supabase is not configured.");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.message).toBe("Supabase is not configured.");
  });
});