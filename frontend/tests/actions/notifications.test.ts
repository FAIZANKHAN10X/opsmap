import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => true,
}));

const { ctx } = vi.hoisted(() => ({
  ctx: { client: null as unknown, admin: null as unknown },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ctx.client,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ctx.admin,
}));

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import {
  createNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";

function makeContext(tables: Record<string, unknown[]>) {
  const store = createSharedStore(tables as never);
  ctx.client = createFakeClientFromStore(store);
  ctx.admin = createFakeClientFromStore(store);
  return store;
}

function note(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    severity: "info",
    kind: "system",
    title: "Saved",
    message: "Project updated.",
    recipient: null,
    recipient_email: null,
    entity_type: null,
    entity_id: null,
    read_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("notification actions", () => {
  it("createNotification returns a success envelope with mapped fields", async () => {
    makeContext({ notifications: [] });
    const res = await createNotification({
      severity: "success",
      kind: "system",
      title: "Saved",
      message: "Project updated successfully.",
      recipient: "ops@example.com",
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.severity).toBe("success");
    expect(res.data.recipient).toBe("ops@example.com");
  });

  it("createNotification maps invalid severity to the error envelope", async () => {
    makeContext({ notifications: [] });
    const res = await createNotification({
      severity: "critical",
      kind: "system",
      title: "X",
      message: "Y",
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("VALIDATION_ERROR");
  });

  it("listNotifications paginates and filters by kind", async () => {
    const notifications = [
      note("n1", { kind: "system" }),
      note("n2", { kind: "assignment" }),
      note("n3", { kind: "system", read_at: "2026-01-02T00:00:00Z" }),
    ];
    makeContext({ notifications });
    const res = await listNotifications({ page: 1, limit: 10, kind: "system" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(2);
    expect(res.pagination.total).toBe(2);
    expect(res.data[0].is_read).toBe(false);
  });

  it("markNotificationRead flips read state and reports read_at", async () => {
    makeContext({ notifications: [note("n1")] });
    const res = await markNotificationRead("n1", true);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.is_read).toBe(true);
    expect(res.data.read_at).toBeDefined();
  });

  it("markAllNotificationsRead returns the count of updated rows", async () => {
    makeContext({ notifications: [note("n1"), note("n2"), note("n3", { read_at: "2026-01-02T00:00:00Z" })] });
    const res = await markAllNotificationsRead();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.count).toBe(2);
  });

  it("getUnreadNotificationCount returns the unread total", async () => {
    makeContext({ notifications: [note("n1"), note("n2", { read_at: "2026-01-02T00:00:00Z" })] });
    const res = await getUnreadNotificationCount();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.count).toBe(1);
  });
});