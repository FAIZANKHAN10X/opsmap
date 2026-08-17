import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/services/email", () => ({
  sendEmail: vi.fn(() => Promise.resolve({ status: "ok", mode: "log_only" })),
}));

import { createFakeClient } from "../helpers/fakeClient";
import { AssetService } from "@/lib/server/services/assets";
import { NotFoundError, ValidationAppError } from "@/lib/server/errors";

const PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const TYPE = "223e4567-e89b-12d3-a456-426614174001";
const STATUS = "323e4567-e89b-12d3-a456-426614174002";
const ASSET = "423e4567-e89b-12d3-a456-426614174003";

function assetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ASSET,
    project_id: PROJECT,
    asset_type_id: null,
    asset_status_id: STATUS,
    name: "Laptop 1",
    code: "LAP-001",
    description: null,
    owner: "Ops",
    notes: null,
    assignees: [],
    metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

function makeService() {
  const client = createFakeClient({
    projects: [
      { id: PROJECT, name: "Main", slug: "main", status: "active", deleted_at: null },
    ],
    asset_types: [{ id: TYPE, name: "Laptop", slug: "laptop", deleted_at: null }],
    asset_statuses: [{ id: STATUS, name: "Available", slug: "available", deleted_at: null }],
    assets: [assetRow({ assignees: ["Sam", "Alex"] })],
    notifications: [],
  });
  const admin = createFakeClient({ notifications: [] });
  const service = new AssetService(client, admin);
  return { client, admin, service };
}

describe("AssetService", () => {
  it("rejects assets for a missing project", async () => {
    const { service } = makeService();
    const err = await service
      .create({ project_id: "99999999-0000-0000-0000-000000000000", name: "X", slug: "x" } as never)
      .catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe("PROJECT_NOT_FOUND");
  });

  it("rejects unknown asset types and statuses", async () => {
    const { service } = makeService();
    const typeErr = await service
      .create({ project_id: PROJECT, name: "X", asset_type_id: "99999999-0000-0000-0000-000000000000" })
      .catch((e) => e);
    expect(typeErr.code).toBe("ASSET_TYPE_NOT_FOUND");

    const statusErr = await service
      .create({ project_id: PROJECT, name: "X", asset_status_id: "99999999-0000-0000-0000-000000000000" })
      .catch((e) => e);
    expect(statusErr.code).toBe("ASSET_STATUS_NOT_FOUND");
  });

  it("rejects empty names", async () => {
    const { service } = makeService();
    await expect(service.create({ project_id: PROJECT, name: "  " })).rejects.toThrow(
      ValidationAppError,
    );
  });

  it("normalizes assignees on create and creates assignment notifications", async () => {
    const { admin, service } = makeService();
    const created = await service.create({
      project_id: PROJECT,
      name: "Printer",
      code: " PRN-1 ",
      asset_status_id: STATUS,
      assignees: [" Alex ", "", "Alex", "Sam"],
    });
    expect(created.name).toBe("Printer");
    expect(created.code).toBe("PRN-1");
    expect(created.assignees).toEqual(["Alex", "Sam"]);

    const { data } = await admin.from("notifications").select("*");
    const notifications = data as Array<{ recipient: string; kind: string; recipient_email: string | null }>;
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.recipient)).toEqual(["Alex", "Sam"]);
    expect(notifications.every((n) => n.kind === "assignment")).toBe(true);
  });

  it("does not create notifications when there are no assignees", async () => {
    const { admin, service } = makeService();
    await service.create({ project_id: PROJECT, name: "Printer" });
    const { data } = await admin.from("notifications").select("*");
    expect(data).toHaveLength(0);
  });

  it("clears type/status on explicit null update", async () => {
    const { service } = makeService();
    const updated = await service.update(ASSET, { asset_type_id: null, asset_status_id: null });
    expect(updated.asset_type_id).toBeNull();
    expect(updated.asset_status_id).toBeNull();
  });

  it("notifies only newly added assignees on update", async () => {
    const { admin, service } = makeService();
    const updated = await service.update(ASSET, {
      assignees: ["Sam", "Alex", "Newbie"],
    });
    expect(updated.assignees).toEqual(["Sam", "Alex", "Newbie"]);

    const { data } = await admin.from("notifications").select("*");
    const notifications = data as Array<{ recipient: string }>;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].recipient).toBe("Newbie");
  });

  it("does not notify when assignees are unchanged", async () => {
    const { admin, service } = makeService();
    await service.update(ASSET, { assignees: [] });
    const { data } = await admin.from("notifications").select("*");
    expect(data).toHaveLength(0);
  });

  it("soft deletes assets", async () => {
    const { service } = makeService();
    await service.delete(ASSET);
    await expect(service.get(ASSET)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("validates the project exists when listing with a project filter", async () => {
    const { service } = makeService();
    const err = await service
      .list({ page: 1, limit: 25, project_id: "99999999-0000-0000-0000-000000000000" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe("PROJECT_NOT_FOUND");
  });

  it("lists assets for a project excluding soft-deleted rows", async () => {
    const { service } = makeService();
    const result = await service.list({ page: 1, limit: 25, project_id: PROJECT });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(ASSET);
  });

  it("filters assets by multiple type slugs", async () => {
    const client = createFakeClient({
      projects: [
        { id: PROJECT, name: "Main", slug: "main", status: "active", deleted_at: null },
      ],
      asset_types: [
        { id: TYPE, name: "Laptop", slug: "laptop", deleted_at: null },
        { id: "99999999-0000-0000-0000-0000000000aa", name: "Server", slug: "server", deleted_at: null },
        { id: "99999999-0000-0000-0000-0000000000bb", name: "Desk", slug: "desk", deleted_at: null },
      ],
      asset_statuses: [{ id: STATUS, name: "Available", slug: "available", deleted_at: null }],
      assets: [
        assetRow({ id: "1", asset_type_id: TYPE }),
        assetRow({ id: "2", asset_type_id: "99999999-0000-0000-0000-0000000000aa" }),
        assetRow({ id: "3", asset_type_id: "99999999-0000-0000-0000-0000000000bb" }),
      ],
      notifications: [],
    });
    const service = new AssetService(client, client);
    const result = await service.list({
      page: 1,
      limit: 25,
      project_id: PROJECT,
      type_slugs: ["laptop", "desk"],
    });
    expect(result.items.map((a) => a.id).sort()).toEqual(["1", "3"]);
  });
});