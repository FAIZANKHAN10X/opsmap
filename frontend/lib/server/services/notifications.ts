import { NotFoundError, ValidationAppError } from "@/lib/server/errors";
import {
  NotificationRepository,
  type NotificationRow,
} from "@/lib/server/repositories/notifications";
import { sendEmail } from "@/lib/server/services/email";
import { looksLikeEmail } from "@/lib/server/validation";
import { audit } from "@/lib/server/audit";
import { NOTIFICATION_KINDS, NOTIFICATION_SEVERITIES } from "@/lib/server/constants";
import type { AssetRow } from "@/lib/server/repositories/assets";
import type { Client } from "@/lib/server/repositories/base";

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

export class NotificationService {
  private readonly repo: NotificationRepository;

  constructor(
    client: Client,
    adminClient: Client,
  ) {
    this.repo = new NotificationRepository(client, adminClient);
  }

  async get(notificationId: string): Promise<NotificationRow> {
    const notification = await this.repo.getById(notificationId);
    if (!notification) throw new NotFoundError("NOTIFICATION_NOT_FOUND", "Notification not found.");
    return notification;
  }

  async list(opts: {
    page: number;
    limit: number;
    unread_only?: boolean;
    recipient?: string | null;
    kind?: string | null;
  }): Promise<{ items: NotificationRow[]; total: number }> {
    if (opts.kind && !NOTIFICATION_KINDS.has(opts.kind)) {
      throw new ValidationAppError("Invalid kind.", [
        { field: "kind", message: "Unknown notification kind." },
      ]);
    }
    return this.repo.list({
      page: opts.page,
      limit: opts.limit,
      kind: opts.kind ?? undefined,
      unread_only: opts.unread_only,
      recipient: opts.recipient ?? undefined,
    });
  }

  async unreadCount(opts?: { recipient?: string | null }): Promise<number> {
    return this.repo.countUnread({ recipient: opts?.recipient ?? undefined });
  }

  /** Privileged create (service-role). Used by system/assignment alerts. */
  async create(payload: NotificationCreateInput): Promise<NotificationRow> {
    const severity = (payload.severity ?? "info").trim().toLowerCase();
    if (!NOTIFICATION_SEVERITIES.has(severity)) {
      throw new ValidationAppError(
        `severity must be one of: ${[...NOTIFICATION_SEVERITIES].sort().join(", ")}`,
        [{ field: "severity", message: `severity must be one of: ${[...NOTIFICATION_SEVERITIES].sort().join(", ")}` }],
      );
    }
    const kind = (payload.kind ?? "system").trim().toLowerCase();
    if (!NOTIFICATION_KINDS.has(kind)) {
      throw new ValidationAppError(
        `kind must be one of: ${[...NOTIFICATION_KINDS].sort().join(", ")}`,
        [{ field: "kind", message: `kind must be one of: ${[...NOTIFICATION_KINDS].sort().join(", ")}` }],
      );
    }
    const title = payload.title.trim();
    const message = payload.message.trim();
    if (!title) throw new ValidationAppError("required", [{ field: "title", message: "required" }]);
    if (!message) throw new ValidationAppError("required", [{ field: "message", message: "required" }]);

    const notification = await this.repo.create({
      id: crypto.randomUUID(),
      severity,
      kind,
      title: title.slice(0, 255),
      message,
      recipient: payload.recipient ?? null,
      recipient_email: payload.recipient_email ?? null,
      entity_type: payload.entity_type ?? null,
      entity_id: payload.entity_id ?? null,
      metadata: (payload.metadata ?? {}) as never,
    });
    audit("notification.created", {
      notification_id: notification.id,
      kind: notification.kind,
      severity: notification.severity,
      recipient_email: notification.recipient_email ?? undefined,
      entity_type: notification.entity_type ?? undefined,
      entity_id: notification.entity_id ?? undefined,
    });
    return notification;
  }

  async markRead(notificationId: string, read = true): Promise<NotificationRow> {
    const notification = await this.get(notificationId);
    if (read) return this.repo.markRead(notification.id);
    return this.repo.markUnread(notification.id);
  }

  async markAllRead(opts?: { recipient?: string | null }): Promise<number> {
    return this.repo.markAllRead({ recipient: opts?.recipient ?? undefined });
  }

  /**
   * notify_asset_assignments equivalent. Creates in-app assignment alerts for
   * newly added assignees (privileged insert) and sends email when the
   * assignee looks like an address. The Python version enqueued an RQ email
   * job; here sendEmail runs synchronously and logs delivery intent when no
   * SMTP is configured. Returns the created notifications.
   */
  async notifyAssetAssignments(
    asset: AssetRow,
    opts: { newAssignees: string[]; previousAssignees?: string[] },
  ): Promise<NotificationRow[]> {
    const previous = new Set(opts.previousAssignees ?? []);
    const added = opts.newAssignees.filter((name) => name && !previous.has(name));
    if (added.length === 0) return [];

    const assetLabel = asset.code ?? asset.name;
    const created: NotificationRow[] = [];

    for (const assignee of added) {
      const email = looksLikeEmail(assignee) ? assignee.trim() : null;
      const title = `Assigned to ${assetLabel}`;
      const message =
        `You were assigned to asset \u201c${asset.name}\u201d` +
        (asset.code ? ` (${asset.code})` : "") +
        ".";

      const notification = await this.create({
        severity: "info",
        kind: "assignment",
        title,
        message,
        recipient: assignee.trim(),
        recipient_email: email,
        entity_type: "asset",
        entity_id: asset.id,
        metadata: {
          asset_id: asset.id,
          asset_name: asset.name,
          asset_code: asset.code,
          project_id: asset.project_id,
          assignee,
        },
      });
      created.push(notification);

      if (email) {
        await sendEmail({
          to: email,
          subject: title.slice(0, 200),
          body:
            `${message}\n\n` +
            `Asset: ${asset.name}\n` +
            `Code: ${asset.code ?? "\u2014"}\n` +
            `Project ID: ${asset.project_id}\n\n` +
            "\u2014 OpsMap",
        });
      }
    }
    return created;
  }
}