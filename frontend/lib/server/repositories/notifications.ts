import type { Database } from "@/types/database";

import { nowIso, type Client } from "@/lib/server/repositories/base";
import { toDatabaseError } from "@/lib/server/errors";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

export type { NotificationRow, NotificationInsert, NotificationUpdate };

export type NotificationListFilters = {
  page: number;
  limit: number;
  kind?: string | null;
  unread_only?: boolean;
  recipient?: string | null;
  recipient_email?: string | null;
};

/**
 * Notification data access.
 *
 * RLS allows authenticated users to SELECT rows where recipient_email matches
 * their profile email, and to UPDATE (mark read) their own rows. Inserts are
 * restricted to the service_role (privileged server-side creation), so this
 * repository's create uses the admin client passed at construction time.
 */
export class NotificationRepository {
  constructor(
    private readonly client: Client,
    private readonly admin: Client,
  ) {}

  async getById(id: string): Promise<NotificationRow | null> {
    const { data, error } = await this.client
      .from("notifications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async list(opts: NotificationListFilters): Promise<{
    items: NotificationRow[];
    total: number;
  }> {
    let q = this.client.from("notifications").select("*", { count: "exact" });
    if (opts.kind) q = q.eq("kind", opts.kind);
    if (opts.unread_only) q = q.is("read_at", null);
    if (opts.recipient) q = q.eq("recipient", opts.recipient);
    if (opts.recipient_email) q = q.eq("recipient_email", opts.recipient_email);
    const from = (opts.page - 1) * opts.limit;
    q = q.order("created_at", { ascending: false }).range(from, from + opts.limit - 1);
    const { data, count, error } = await q;
    if (error) throw toDatabaseError(error);
    return { items: (data ?? []) as NotificationRow[], total: count ?? 0 };
  }

  async countUnread(opts?: {
    recipient?: string | null;
    recipient_email?: string | null;
  }): Promise<number> {
    let q = this.client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    if (opts?.recipient) q = q.eq("recipient", opts.recipient);
    if (opts?.recipient_email) q = q.eq("recipient_email", opts.recipient_email);
    const { count, error } = await q;
    if (error) throw toDatabaseError(error);
    return count ?? 0;
  }

  /** Privileged insert (service_role). Used by assignment notifications. */
  async create(row: NotificationInsert): Promise<NotificationRow> {
    const { data, error } = await this.admin
      .from("notifications")
      .insert(row)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async markRead(id: string): Promise<NotificationRow> {
    const { data, error } = await this.client
      .from("notifications")
      .update({ read_at: nowIso() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async markUnread(id: string): Promise<NotificationRow> {
    const { data, error } = await this.client
      .from("notifications")
      .update({ read_at: null })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async markAllRead(opts?: {
    recipient?: string | null;
    recipient_email?: string | null;
  }): Promise<number> {
    let q = this.client
      .from("notifications")
      .update({ read_at: nowIso() })
      .is("read_at", null)
      .select("id");
    if (opts?.recipient) q = q.eq("recipient", opts.recipient);
    if (opts?.recipient_email) q = q.eq("recipient_email", opts.recipient_email);
    const { data, error } = await q;
    if (error) throw toDatabaseError(error);
    return (data ?? []).length;
  }
}