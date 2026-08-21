import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/services/email", () => ({
  sendEmail: vi.fn(() => Promise.resolve({ status: "ok", mode: "log_only" })),
}));

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { NotificationService } from "@/lib/server/services/notifications";
import { ValidationAppError } from "@/lib/server/errors";
import { sendEmail } from "@/lib/server/services/email";

function makeService() {
  const store = createSharedStore({ notifications: [] });
  const client = createFakeClientFromStore(store);
  const admin = createFakeClientFromStore(store);
  const service = new NotificationService(client, admin);
  return { client, admin, service };
}

function makeServiceWith(
  rows: Array<Record<string, unknown>>,
) {
  const store = createSharedStore({ notifications: rows });
  const client = createFakeClientFromStore(store);
  const admin = createFakeClientFromStore(store);
  const service = new NotificationService(client, admin);
  return { client, admin, service };
}

const ASSET = {
  id: "a1",
  project_id: "p1",
  asset_type_id: null,
  asset_status_id: "s1",
  name: "Laptop 1",
  code: "LAP-001",
  description: null,
  owner: null,
  notes: null,
  assignees: [],
  metadata: {},
  latitude: null,
  longitude: null,
  created_by: null,
  updated_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

describe("NotificationService", () => {
  it("validates severity", async () => {
    const { service } = makeService();
    const err = await service
      .create({ severity: "urgent", title: "T", message: "M" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.fields[0].field).toBe("severity");
  });

  it("validates kind", async () => {
    const { service } = makeService();
    const err = await service
      .create({ kind: "spam", title: "T", message: "M" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.fields[0].field).toBe("kind");
  });

  it("requires title and message", async () => {
    const { service } = makeService();
    await expect(service.create({ title: "  ", message: "M" })).rejects.toThrow(ValidationAppError);
    await expect(service.create({ title: "T", message: "" })).rejects.toThrow(ValidationAppError);
  });

  it("stores a normalizes severity/kind and defaults to info/system", async () => {
    const { admin, service } = makeService();
    const created = await service.create({ title: "  Hi  ", message: "Body" });
    expect(created.severity).toBe("info");
    expect(created.kind).toBe("system");
    expect(created.title).toBe("Hi");
    const { data } = await admin.from("notifications").select("*");
    expect(data).toHaveLength(1);
  });

  it("rejects unknown kinds in list", async () => {
    const { service } = makeService();
    const err = await service.list({ page: 1, limit: 25, kind: "bogus" }).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.fields).toEqual([{ field: "kind", message: "Unknown notification kind." }]);
  });

  it("notifies only added assignees and flags email recipients", async () => {
    const { admin, service } = makeService();
    const created = await service.notifyAssetAssignments(ASSET, {
      newAssignees: ["Sam", "alex@example.com", "Bob"],
      previousAssignees: ["Sam"],
    });
    expect(created).toHaveLength(2);
    expect(created.map((n) => n.recipient)).toEqual(["alex@example.com", "Bob"]);
    expect(created[0].recipient_email).toBe("alex@example.com");
    expect(created[1].recipient_email).toBeNull();
    expect(created[0].kind).toBe("assignment");

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alex@example.com",
        subject: "Assigned to LAP-001",
      }),
    );

    const { data } = await admin.from("notifications").select("*");
    expect(data).toHaveLength(2);
  });

  it("returns [] and creates nothing when no assignees are added", async () => {
    const { admin, service } = makeService();
    const created = await service.notifyAssetAssignments(ASSET, {
      newAssignees: ["Sam"],
      previousAssignees: ["Sam"],
    });
    expect(created).toHaveLength(0);
    const { data } = await admin.from("notifications").select("*");
    expect(data).toHaveLength(0);
  });

  it("marks notifications read/unread", async () => {
    const { client, service } = makeService();
    const created = await service.create({ title: "T", message: "M" });
    const read = await service.markRead(created.id);
    expect(read.read_at).not.toBeNull();
    const unread = await service.markRead(created.id, false);
    expect(unread.read_at).toBeNull();

    const { count } = await client.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    expect(count).toBe(1);
  });

  it("returns NOTIFICATION_NOT_FOUND for missing notifications", async () => {
    const { service } = makeService();
    const err = await service
      .get("99999999-0000-0000-0000-000000000000")
      .catch((e) => e);
    expect(err.code).toBe("NOTIFICATION_NOT_FOUND");
  });

  it("counts unread notifications", async () => {
    const { service } = makeServiceWith([
      { id: "n1", read_at: null },
      { id: "n2", read_at: null },
      { id: "n3", read_at: "2026-01-02T00:00:00Z" },
    ]);
    expect(await service.unreadCount()).toBe(2);
  });

  it("marks all unread notifications read and returns the count", async () => {
    const { service } = makeServiceWith([
      { id: "n1", read_at: null },
      { id: "n2", read_at: null },
      { id: "n3", read_at: "2026-01-02T00:00:00Z" },
    ]);
    expect(await service.markAllRead()).toBe(2);
    expect(await service.unreadCount()).toBe(0);
  });

  it("lists unread notifications with kind filters and pagination", async () => {
    const rows = [
      { id: "n1", kind: "assignment", read_at: null, created_at: "2026-01-03T00:00:00Z", title: "A", message: "m", severity: "info" },
      { id: "n2", kind: "system", read_at: null, created_at: "2026-01-02T00:00:00Z", title: "B", message: "m", severity: "info" },
      { id: "n3", kind: "assignment", read_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", title: "C", message: "m", severity: "info" },
    ];
    const { service } = makeServiceWith(rows);

    const unread = await service.list({ page: 1, limit: 25, unread_only: true });
    expect(unread.total).toBe(2);
    expect(unread.items.map((n) => n.id)).toEqual(["n1", "n2"]);

    const assignments = await service.list({ page: 1, limit: 25, kind: "assignment" });
    expect(assignments.total).toBe(2);

    const firstPage = await service.list({ page: 1, limit: 1 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0].id).toBe("n1");
  });

  it("persists recipient, entity and metadata on create", async () => {
    const { admin, service } = makeService();
    const created = await service.create({
      severity: "warning",
      kind: "system",
      title: "Disk almost full",
      message: "Usage above 90%.",
      recipient: "ops@example.com",
      recipient_email: "ops@example.com",
      entity_type: "asset",
      entity_id: "123e4567-e89b-12d3-a456-426614174000",
      metadata: { asset_name: "Printer" },
    });
    expect(created.recipient).toBe("ops@example.com");
    expect(created.recipient_email).toBe("ops@example.com");
    expect(created.entity_type).toBe("asset");
    expect(created.metadata).toEqual({ asset_name: "Printer" });

    const { data } = await admin.from("notifications").select("*");
    expect(data).toHaveLength(1);
  });
});