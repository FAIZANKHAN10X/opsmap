"use client";

/**
 * Admin users & roles surface (Phase 15 Step 8).
 * Lists profiles and lets an administrator change a user's role via the
 * existing set_user_role action — the UI never re-implements role mutation.
 * Non-admins see a read-only notice; the server remains authoritative.
 */

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { USER_ROLE_OPTIONS } from "@/lib/roles";
import { listUsers, setUserRole } from "@/services/profiles";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import { usePermissions, useUser } from "@/stores/user-context";
import type { ProfileSummary, UserRole } from "@/types/domain";

export function UsersRolesSection() {
  const toast = useToast();
  const { isAdmin } = usePermissions();
  const user = useUser();
  const { demoMode, refreshKey, bumpRefresh } = useShell();

  const [users, setUsers] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listUsers()
      .then((res) => {
        if (cancelled) return;
        setUsers(res.data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load users.");
        setUsers([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, refreshKey, reloadToken]);

  async function handleRoleChange(target: ProfileSummary, role: UserRole) {
    const isSelf = target.email === user?.email;
    if (
      isSelf &&
      !window.confirm(
        `Change your own role to ${role}? This applies immediately.`,
      )
    ) {
      return;
    }
    setChangingId(target.id);
    try {
      await setUserRole({ target_user_id: target.id, role });
      toast.success("Role updated", `${target.email} is now ${role}`);
      bumpRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Role change failed.";
      toast.error("Could not change role", message);
    } finally {
      setChangingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <section className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--ops-text)]">
          Users & Roles
        </h2>
        <p className="mt-1 text-sm text-[var(--ops-text-secondary)]">
          Role management is restricted to administrators.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
      <header className="p-4 pb-3">
        <div className="flex items-center gap-2">
          <Icon name="users" size={16} className="text-[var(--ops-text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--ops-text)]">
            Users & Roles
          </h2>
          {demoMode ? (
            <span className="rounded-full border border-[var(--ops-border)] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[var(--ops-text-muted)] uppercase">
              demo — read only
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-xl text-sm text-[var(--ops-text-secondary)]">
          Only administrators can change roles. Changes take effect immediately.
        </p>
      </header>

      {loading ? (
        <div className="space-y-2 p-4 pt-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <ErrorState
          message={error}
          onRetry={() => setReloadToken((n) => n + 1)}
        />
      ) : null}

      {!loading && !error && users.length === 0 ? (
        <EmptyState
          title="NO USERS"
          description="No profiles were found for this workspace."
        />
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[var(--ops-bg-elevated)] text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
            <tr className="border-b border-[var(--ops-border)]">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Member since</th>
            </tr>
          </thead>
          <tbody>
            {users.map((profile) => (
              <tr
                key={profile.id}
                className="border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)]"
              >
                <td className="px-4 py-2.5 font-medium text-[var(--ops-text)]">
                  {profile.full_name ?? "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--ops-text-secondary)]">
                  {profile.email}
                </td>
                <td className="px-4 py-2.5">
                  <label className="sr-only" htmlFor={`role-${profile.id}`}>
                    Role for {profile.email}
                  </label>
                  <select
                    id={`role-${profile.id}`}
                    value={profile.role}
                    disabled={demoMode || changingId === profile.id}
                    onChange={(e) =>
                      void handleRoleChange(
                        profile,
                        e.target.value as UserRole,
                      )
                    }
                    className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-2 py-1 text-xs text-[var(--ops-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-focus)] disabled:opacity-60"
                  >
                    {USER_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--ops-text-secondary)]">
                  {new Date(profile.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}