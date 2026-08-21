import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFakeClient } from "../helpers/fakeClient";
import { AssetStatusRepository } from "@/lib/server/repositories/asset-statuses";
import { AssetStatusService } from "@/lib/server/services/asset-statuses";
import { ConflictError, NotFoundError, ValidationAppError } from "@/lib/server/errors";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

function makeService(rows: unknown[] = [], assetRows: unknown[] = []) {
  const client = createFakeClient({
    asset_statuses: rows.map((r) => ({ ...(r as object) })),
    assets: assetRows.map((r) => ({ ...(r as object) })),
  });
  const adminActor = { id: 'actor-admin', email: 'admin@example.com', fullName: null, role: 'admin' as const };
  return { client, service: new AssetStatusService(new AssetStatusRepository(client), { actor: adminActor }) };
}

describe("AssetStatusService", () => {
  it("normalizes slug and color on create", async () => {
    const { service } = makeService();
    const created = await service.create({
      name: " Available ",
      slug: "AVAILABLE_STATE",
      color: "#FFF",
    });
    expect(created.name).toBe("Available");
    expect(created.slug).toBe("available-state");
    expect(created.color).toBe("#fff");
  });

  it("throws ASSET_STATUS_SLUG_EXISTS on conflict", async () => {
    const { service } = makeService([
      { id: UUID, name: "A", slug: "available", color: "#22c55e", deleted_at: null },
    ]);
    const err = await service.create({ name: "B", slug: "available", color: "#fff" }).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.code).toBe("ASSET_STATUS_SLUG_EXISTS");
  });

  it("validates color format", async () => {
    const { service } = makeService();
    await expect(
      service.create({ name: "A", slug: "a", color: "not-a-color" }),
    ).rejects.toThrow(ValidationAppError);
  });

  it("blocks delete while assets still use the status", async () => {
    const { service } = makeService(
      [{ id: UUID, name: "In Use", slug: "in-use", color: "#fff", deleted_at: null }],
      [{ id: "a1", asset_status_id: UUID, deleted_at: null }],
    );
    const err = await service.delete(UUID).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.message).toContain("Cannot delete status while 1 asset(s) still use it.");
    expect(err.fields).toEqual([{ field: "id", message: "Reassign assets before deleting this status." }]);
  });

  it("ignores soft-deleted assets when checking usage", async () => {
    const { service } = makeService(
      [{ id: UUID, name: "In Use", slug: "in-use", color: "#fff", deleted_at: null }],
      [{ id: "a1", asset_status_id: UUID, deleted_at: "2026-01-01T00:00:00Z" }],
    );
    await service.delete(UUID); // should not throw
  });

  it("soft deletes an unused status", async () => {
    const { client, service } = makeService([
      { id: UUID, name: "A", slug: "a", color: "#fff", deleted_at: null },
    ]);
    await service.delete(UUID);
    await expect(service.get(UUID)).rejects.toBeInstanceOf(NotFoundError);
    const { data } = await client.from("asset_statuses").select("*").is("deleted_at", null);
    expect(data).toHaveLength(0);
  });

  it("seedDefaults is idempotent and never overwrites", async () => {
    const { service } = makeService();
    const first = await service.seedDefaults();
    expect(first.length).toBeGreaterThan(0);
    const second = await service.seedDefaults();
    expect(second.length).toBe(0);
    const slugs = first.map((s) => s.slug);
    expect(slugs).toContain("available");
    expect(slugs).toContain("offline");
  });
});