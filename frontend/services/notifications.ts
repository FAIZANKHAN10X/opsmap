/**
 * Notification service — list, mark read, unread count (Phase 10).
 * Mock-backed until live API mode is enabled globally.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  AppNotification,
  NotificationKind,
  NotificationSeverity,
} from "@/types/domain";

import { isoNow, mockForceError, newId } from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

let MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: newId("ntf"),
    severity: "info",
    kind: "assignment",
    title: "Assigned to Dock A",
    message: "You were assigned to asset “Dock A” (DK-01).",
    recipient: "Alex Rivera",
    recipient_email: null,
    entity_type: "asset",
    entity_id: null,
    read_at: null,
    metadata: { asset_name: "Dock A" },
    created_at: isoNow(),
    updated_at: isoNow(),
    is_read: false,
  },
  {
    id: newId("ntf"),
    severity: "success",
    kind: "system",
    title: "Report ready",
    message: "Project summary report finished generating.",
    recipient: null,
    recipient_email: null,
    entity_type: null,
    entity_id: null,
    read_at: isoNow(),
    metadata: {},
    created_at: isoNow(),
    updated_at: isoNow(),
    is_read: true,
  },
];

export type ListNotificationsParams = {
  page?: number;
  limit?: number;
  unread_only?: boolean;
  recipient?: string;
  kind?: NotificationKind | string;
};

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<ApiListSuccess<AppNotification>> {
  if (USE_MOCK) {
    await delay(120);
    if (mockForceError) throw new Error("Failed to load notifications.");
    let data = [...MOCK_NOTIFICATIONS];
    if (params.unread_only) data = data.filter((n) => !n.is_read);
    if (params.recipient) {
      data = data.filter((n) => n.recipient === params.recipient);
    }
    if (params.kind) data = data.filter((n) => n.kind === params.kind);
    data.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const page = params.page ?? 1;
    const limit = params.limit ?? 25;
    const start = (page - 1) * limit;
    const slice = data.slice(start, start + limit);
    return {
      success: true,
      data: slice,
      pagination: {
        page,
        limit,
        total: data.length,
        pages: data.length === 0 ? 0 : Math.ceil(data.length / limit),
      },
      message: null,
    };
  }
  throw new Error("Live API not enabled");
}

export async function getUnreadCount(params?: {
  recipient?: string;
}): Promise<ApiSuccess<{ count: number }>> {
  if (USE_MOCK) {
    await delay(60);
    let data = MOCK_NOTIFICATIONS.filter((n) => !n.is_read);
    if (params?.recipient) {
      data = data.filter((n) => n.recipient === params.recipient);
    }
    return { success: true, data: { count: data.length }, message: null };
  }
  throw new Error("Live API not enabled");
}

export async function markNotificationRead(
  id: string,
  read = true,
): Promise<ApiSuccess<AppNotification>> {
  if (USE_MOCK) {
    await delay(80);
    const idx = MOCK_NOTIFICATIONS.findIndex((n) => n.id === id);
    if (idx < 0) throw new Error("Notification not found.");
    const stamp = isoNow();
    const updated: AppNotification = {
      ...MOCK_NOTIFICATIONS[idx],
      read_at: read ? stamp : null,
      is_read: read,
      updated_at: stamp,
    };
    MOCK_NOTIFICATIONS = [
      ...MOCK_NOTIFICATIONS.slice(0, idx),
      updated,
      ...MOCK_NOTIFICATIONS.slice(idx + 1),
    ];
    return { success: true, data: updated, message: null };
  }
  throw new Error("Live API not enabled");
}

export async function markAllNotificationsRead(params?: {
  recipient?: string;
}): Promise<ApiSuccess<{ count: number }>> {
  if (USE_MOCK) {
    await delay(100);
    const stamp = isoNow();
    let count = 0;
    MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS.map((n) => {
      if (n.is_read) return n;
      if (params?.recipient && n.recipient !== params.recipient) return n;
      count += 1;
      return { ...n, is_read: true, read_at: stamp, updated_at: stamp };
    });
    return { success: true, data: { count }, message: null };
  }
  throw new Error("Live API not enabled");
}

/** Test/helper: push a mock in-app notification (assignment simulation). */
export function pushMockNotification(input: {
  title: string;
  message: string;
  severity?: NotificationSeverity;
  kind?: NotificationKind;
  recipient?: string | null;
}): AppNotification {
  const stamp = isoNow();
  const note: AppNotification = {
    id: newId("ntf"),
    severity: input.severity ?? "info",
    kind: input.kind ?? "system",
    title: input.title,
    message: input.message,
    recipient: input.recipient ?? null,
    recipient_email: null,
    entity_type: null,
    entity_id: null,
    read_at: null,
    metadata: {},
    created_at: stamp,
    updated_at: stamp,
    is_read: false,
  };
  MOCK_NOTIFICATIONS = [note, ...MOCK_NOTIFICATIONS];
  return note;
}
