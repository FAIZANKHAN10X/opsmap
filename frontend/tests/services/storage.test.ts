import { describe, expect, it, vi } from "vitest";

const { adminMocks } = vi.hoisted(() => ({
  adminMocks: { client: {} as Record<string, unknown> },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMocks.client,
}));

import { safeFilename, SupabaseStorage } from "@/lib/server/storage";
import { AppError } from "@/lib/server/errors";

describe("safeFilename", () => {
  it("keeps the basename and strips directory traversal", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename("a/b/c/report.pdf")).toBe("report.pdf");
  });

  it("replaces characters outside the allowed set with underscores", () => {
    expect(safeFilename("a:b*c?.txt")).toBe("a_b_c_.txt");
    expect(safeFilename("report (final) + v1.txt")).toBe("report (final) + v1.txt");
  });

  it("strips leading/trailing dots, underscores and whitespace", () => {
    expect(safeFilename("  .._notes.pdf_ ")).toBe("notes.pdf");
  });

  it("caps at 180 characters", () => {
    expect(safeFilename("x".repeat(200) + ".pdf").length).toBe(180);
  });

  it("falls back to 'file' for empty or symbol-only input", () => {
    expect(safeFilename("")).toBe("file");
    expect(safeFilename("....")).toBe("file");
  });
});

describe("SupabaseStorage.buildRelativePath", () => {
  it("mirrors the Python LocalFileStorage layout", () => {
    const storage = new SupabaseStorage();
    expect(storage.buildRelativePath("a1", "d1", "invoice.pdf")).toBe(
      "assets/a1/documents/d1_invoice.pdf",
    );
  });

  it("sanitizes traversal and invalid characters in the stored path", () => {
    const storage = new SupabaseStorage();
    expect(storage.buildRelativePath("a1", "d1", "../../secret.txt")).toBe(
      "assets/a1/documents/d1_secret.txt",
    );
  });
});

describe("SupabaseStorage failure paths", () => {
  function errorStorage() {
    adminMocks.client = {
      storage: {
        from: () => ({
          upload: async () => ({ error: { message: "denied" } }),
          download: async () => ({ error: { message: "denied" } }),
          remove: async () => ({ error: { message: "denied" } }),
        }),
      },
    };
    return new SupabaseStorage();
  }

  it("throws a useful STORAGE_UPLOAD_FAILED AppError when save fails", async () => {
    const storage = errorStorage();
    const err = await storage.save("x", new Uint8Array(), "text/plain").catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("STORAGE_UPLOAD_FAILED");
    expect(err.statusCode).toBe(502);
  });

  it("throws a useful STORAGE_READ_FAILED AppError when read fails", async () => {
    const storage = errorStorage();
    const err = await storage.read("x").catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("STORAGE_READ_FAILED");
  });

  it("throws a useful STORAGE_DELETE_FAILED AppError when remove fails", async () => {
    const storage = errorStorage();
    const err = await storage.delete("x").catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("STORAGE_DELETE_FAILED");
  });
});