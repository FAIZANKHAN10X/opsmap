import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFakeClient } from "../helpers/fakeClient";
import { AssetTypeRepository } from "@/lib/server/repositories/asset-types";
import { AssetTypeService } from "@/lib/server/services/asset-types";
import { ConflictError, ValidationAppError } from "@/lib/server/errors";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

function makeService(rows: unknown[] = []) {
  const client = createFakeClient({
    asset_types: rows.map((r) => ({ ...(r as object) })),
  });
  const adminActor = { id: 'actor-admin', email: 'admin@example.com', fullName: null, role: 'admin' as const };
  return { service: new AssetTypeService(new AssetTypeRepository(client), { actor: adminActor }) };
}

describe("AssetTypeService", () => {
  it("creates with normalized slug and default sort order", async () => {
    const { service } = makeService();
    const created = await service.create({ name: "Laptop", slug: "Laptop_Type" });
    expect(created.slug).toBe("laptop-type");
    expect(created.sort_order).toBe(0);
  });

  it("throws ASSET_TYPE_SLUG_EXISTS on conflict", async () => {
    const { service } = makeService([{ id: UUID, name: "A", slug: "laptop", deleted_at: null }]);
    const err = await service.create({ name: "B", slug: "laptop" }).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.code).toBe("ASSET_TYPE_SLUG_EXISTS");
  });

  it("rejects empty names", async () => {
    const { service } = makeService();
    await expect(service.create({ name: " ", slug: "x" })).rejects.toThrow(ValidationAppError);
  });

  it("allows updating to the same slug without conflict", async () => {
    const { service } = makeService([{ id: UUID, name: "A", slug: "laptop", deleted_at: null }]);
    const updated = await service.update(UUID, { slug: "laptop", name: "Laptop Pro" });
    expect(updated.slug).toBe("laptop");
    expect(updated.name).toBe("Laptop Pro");
  });

  it("seedDefaults is idempotent and never overwrites", async () => {
    const { service } = makeService();
    const first = await service.seedDefaults();
    expect(first.length).toBeGreaterThan(0);
    expect(first.some((t) => t.slug === "villa")).toBe(true);
    const second = await service.seedDefaults();
    expect(second.length).toBe(0);
  });

  it("seedDefaults leaves existing types untouched", async () => {
    const { service } = makeService([
      { id: UUID, name: "Apartment", slug: "apartment", description: null, sort_order: 3, deleted_at: null },
    ]);
    const created = await service.seedDefaults();
    expect(created.map((t) => t.slug)).toContain("villa");
    const list = await service.list({ page: 1, limit: 100 });
    // canonical taxonomy: villa, house, land, commercial, other (+ existing apartment)
    expect(list.total).toBe(6);
    const slugs = list.items.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of ["villa", "house", "apartment", "land", "commercial", "other"]) {
      expect(slugs).toContain(slug);
    }
  });
});