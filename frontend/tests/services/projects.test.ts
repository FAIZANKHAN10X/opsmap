import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFakeClient } from "../helpers/fakeClient";
import { ProjectRepository } from "@/lib/server/repositories/projects";
import { ProjectService } from "@/lib/server/services/projects";
import { ConflictError, NotFoundError, ValidationAppError } from "@/lib/server/errors";

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const OTHER_UUID = "223e4567-e89b-12d3-a456-426614174000";
const adminActor = { id: "actor-admin", email: "admin@example.com", fullName: null, role: "admin" as const };

function makeService(rows: unknown[] = []) {
  const client = createFakeClient({
    projects: rows.map((r) => ({ ...(r as object) })),
  });
  return { client, service: new ProjectService(new ProjectRepository(client), { actor: adminActor }) };
}

describe("ProjectService", () => {
  it("creates with a normalized slug and default status", async () => {
    const { service } = makeService();
    const created = await service.create({ name: "  My Project ", slug: "My_Project" });
    expect(created.name).toBe("My Project");
    expect(created.slug).toBe("my-project");
    expect(created.status).toBe("active");
    expect(created.id).toBeTruthy();
  });

  it("rejects empty names", async () => {
    const { service } = makeService();
    await expect(service.create({ name: "   ", slug: "alpha" })).rejects.toThrow(ValidationAppError);
  });

  it("throws PROJECT_SLUG_EXISTS on slug conflict", async () => {
    const { service } = makeService([
      { id: UUID, name: "A", slug: "alpha", status: "active", deleted_at: null },
    ]);
    const err = await service.create({ name: "B", slug: "Alpha" }).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.code).toBe("PROJECT_SLUG_EXISTS");
  });

  it("validates status against the allowed set", async () => {
    const { service } = makeService();
    const err = await service.create({ name: "A", slug: "alpha", status: "bogus" }).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.fields[0].field).toBe("status");
  });

  it("updates slug only when changed, allowing the same slug", async () => {
    const { service } = makeService([
      { id: UUID, name: "A", slug: "alpha", status: "active", deleted_at: null },
    ]);
    const updated = await service.update(UUID, { slug: "alpha" });
    expect(updated.slug).toBe("alpha");
  });

  it("throws slug conflict on update to another project's slug", async () => {
    const { service } = makeService([
      { id: UUID, name: "A", slug: "alpha", status: "active", deleted_at: null },
      { id: OTHER_UUID, name: "B", slug: "beta", status: "active", deleted_at: null },
    ]);
    const err = await service.update(OTHER_UUID, { slug: "alpha" }).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
  });

  it("returns 404 for missing projects", async () => {
    const { service } = makeService();
    await expect(service.get(UUID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("soft deletes projects", async () => {
    const { client, service } = makeService([
      { id: UUID, name: "A", slug: "alpha", status: "active", deleted_at: null },
    ]);
    await service.delete(UUID);
    await expect(service.get(UUID)).rejects.toBeInstanceOf(NotFoundError);
    const { data } = await client.from("projects").select("*").is("deleted_at", null);
    expect(data).toHaveLength(0);
  });
});