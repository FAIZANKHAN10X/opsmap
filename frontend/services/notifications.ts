/**
 * Notification service — list, mark read, unread count. Delegates to Server
 * Actions backed by Supabase. Reads are RLS-scoped to the signed-in user;
 * creation happens server-side via the admin client (assignment alerts).
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  AppNotification,
  NotificationKind,
  NotificationSeverity,
} from "@/types/domain";

import {
  getUnreadNotificationCount,
  listNotifications as listNotificationsAction,
  markAllNotificationsRead as markAllNotificationsReadAction,
  markNotificationRead as markNotificationReadAction,
} from "@/actions/notifications";
import { unwrapAction, unwrapListAction } from "@/services/helpers";

export type ListNotificationsParams = {
  page?: number;
  limit?: number;
  unread_only?: boolean;
  kind?: NotificationKind | string;
};

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<ApiListSuccess<AppNotification>> {
  return unwrapListAction(
    await listNotificationsAction({
      page: params.page,
      limit: params.limit,
      unread_only: params.unread_only,
      kind: params.kind,
    }),
  );
}

export async function getUnreadCount(): Promise<ApiSuccess<{ count: number }>> {
  return unwrapAction(await getUnreadNotificationCount());
}

export async function markNotificationRead(
  id: string,
  read = true,
): Promise<ApiSuccess<AppNotification>> {
  return unwrapAction(await markNotificationReadAction(id, read));
}

export async function markAllNotificationsRead(): Promise<ApiSuccess<{ count: number }>> {
  return unwrapAction(await markAllNotificationsReadAction());
}

export type { NotificationSeverity, NotificationKind };