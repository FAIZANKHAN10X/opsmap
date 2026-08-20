"use server";

import type { AppNotification } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { requireRole } from "@/lib/server/authorize";
import { toNotification } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import { NotificationService } from "@/lib/server/services/notifications";

export type NotificationCreateInput = {
  severity?: string;
  kind?: string;
  title: string;
  message: string;
  recipient?: string | null;
  recipient_email?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function listNotifications(params?: {
  page?: number;
  limit?: number;
  unread_only?: boolean;
  kind?: string;
}) {
  return runListAction<AppNotification>(async () => {
    const { client, admin } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const service = new NotificationService(client, admin);
    const { items, total } = await service.list({
      page,
      limit,
      unread_only: params?.unread_only ?? false,
      kind: params?.kind ?? null,
    });
    return { items: items.map(toNotification), total, page, limit };
  });
}

export async function getNotification(id: string) {
  return runAction<AppNotification>(async () => {
    const { client, admin } = await withServerContext();
    const service = new NotificationService(client, admin);
    return toNotification(await service.get(id));
  });
}

export async function createNotification(payload: NotificationCreateInput) {
  return runAction<AppNotification>(async () => {
    const { client, admin, actor } = await withServerContext();
    // Privileged insert bypassing RLS (service-role). Only admins may create
    // notifications from the client; assignment alerts run server-side.
    requireRole(actor, "admin", "create", "notification");
    const service = new NotificationService(client, admin);
    return toNotification(await service.create(payload));
  });
}

export async function markNotificationRead(id: string, read = true) {
  return runAction<AppNotification>(async () => {
    const { client, admin } = await withServerContext();
    const service = new NotificationService(client, admin);
    return toNotification(await service.markRead(id, read));
  });
}

export async function markAllNotificationsRead() {
  return runAction<{ count: number }>(async () => {
    const { client, admin } = await withServerContext();
    const service = new NotificationService(client, admin);
    const count = await service.markAllRead();
    return { count };
  });
}

export async function getUnreadNotificationCount() {
  return runAction<{ count: number }>(async () => {
    const { client, admin } = await withServerContext();
    const service = new NotificationService(client, admin);
    const count = await service.unreadCount();
    return { count };
  });
}