"use client";

/**
 * Full asset search with filters, sort, pagination, and URL state.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { statusColor } from "@/lib/status-colors";
import { listAssetTypes } from "@/services/asset-types";
import { listAssetStatuses } from "@/services/asset-statuses";
import { searchAssets, type SearchParams } from "@/services/search";
import { useShell } from "@/stores/shell-context";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";

type SortKey = NonNullable<SearchParams["sort"]>;
type OrderKey = NonNullable<SearchParams["order"]>;

type Draft = {
  q: string;
  status: string;
  type: string;
  owner: string;
  assigned_to: string;
  created_after: string;
  created_before: string;
  sort: SortKey;
  order: OrderKey;
};

function readParams(sp: URLSearchParams): SearchParams {
  const sortRaw = sp.get("sort");
  const orderRaw = sp.get("order");
  const sort: SortKey =
    sortRaw === "name" ||
    sortRaw === "code" ||
    sortRaw === "owner" ||
    sortRaw === "updated_at"
      ? sortRaw
      : "created_at";
  const order: OrderKey = orderRaw === "asc" ? "asc" : "desc";

  return {
    q: sp.get("q") ?? undefined,
    project_id: sp.get("project_id") ?? undefined,
    status: sp.get("status") ?? undefined,
    type: sp.get("type") ?? undefined,
    owner: sp.get("owner") ?? undefined,
    assigned_to: sp.get("assigned_to") ?? undefined,
    created_after: sp.get("created_after") ?? undefined,
    created_before: sp.get("created_before") ?? undefined,
    sort,
    order,
    page: Number(sp.get("page") || "1") || 1,
    limit: Number(sp.get("limit") || "25") || 25,
  };
}

function draftFromParams(params: SearchParams): Draft {
  return {
    q: params.q ?? "",
    status: params.status ?? "",
    type: params.type ?? "",
    owner: params.owner ?? "",
    assigned_to: params.assigned_to ?? "",
    created_after: params.created_after?.slice(0, 10) ?? "",
    created_before: params.created_before?.slice(0, 10) ?? "",
    sort: params.sort ?? "created_at",
    order: params.order ?? "desc",
  };
}

export function SearchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedProjectId, setSelectedProjectId } = useShell();

  const params = useMemo(
    () => readParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  // Draft is keyed off URL so we don't need an effect to sync from params.
  const [draft, setDraft] = useState<Draft>(() => draftFromParams(params));
  const [draftKey, setDraftKey] = useState(searchParams.toString());
  if (searchParams.toString() !== draftKey) {
    setDraftKey(searchParams.toString());
    setDraft(draftFromParams(params));
  }

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAssetStatuses(), listAssetTypes()])
      .then(([s, t]) => {
        if (cancelled) return;
        setStatuses(s.data);
        setTypes(t.data);
      })
      .catch(() => {
        if (!cancelled) {
          setStatuses([]);
          setTypes([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Default project_id from shell when missing in URL
  useEffect(() => {
    if (!params.project_id && selectedProjectId) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("project_id", selectedProjectId);
      router.replace(`${pathname}?${next.toString()}`);
    }
  }, [params.project_id, selectedProjectId, pathname, router, searchParams]);

  useEffect(() => {
    const projectId = params.project_id ?? selectedProjectId ?? undefined;
    let cancelled = false;

    searchAssets({
      ...params,
      project_id: projectId,
    })
      .then((res) => {
        if (cancelled) return;
        setAssets(res.data);
        setTotal(res.pagination.total);
        setPages(res.pagination.pages);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Search failed.");
        setAssets([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params, selectedProjectId, reloadToken]);

  function commitToUrl(overrides: Partial<Draft> & { page?: number } = {}) {
    const next = new URLSearchParams();
    const merged: Draft = { ...draft, ...overrides };
    const projectId = params.project_id ?? selectedProjectId ?? undefined;

    if (merged.q.trim()) next.set("q", merged.q.trim());
    if (projectId) next.set("project_id", projectId);
    if (merged.status) next.set("status", merged.status);
    if (merged.type) next.set("type", merged.type);
    if (merged.owner.trim()) next.set("owner", merged.owner.trim());
    if (merged.assigned_to.trim())
      next.set("assigned_to", merged.assigned_to.trim());
    if (merged.created_after)
      next.set("created_after", `${merged.created_after}T00:00:00.000Z`);
    if (merged.created_before)
      next.set("created_before", `${merged.created_before}T23:59:59.999Z`);
    next.set("sort", merged.sort);
    next.set("order", merged.order);
    next.set("page", String(overrides.page ?? params.page ?? 1));
    next.set("limit", String(params.limit ?? 25));
    setLoading(true);
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    const next = new URLSearchParams();
    const projectId = params.project_id ?? selectedProjectId;
    if (projectId) next.set("project_id", projectId);
    next.set("page", "1");
    setLoading(true);
    router.push(`${pathname}?${next.toString()}`);
  }

  const statusById = useMemo(
    () => new Map(statuses.map((s) => [s.id, s])),
    [statuses],
  );
  const typeById = useMemo(
    () => new Map(types.map((t) => [t.id, t])),
    [types],
  );

  const field =
    "mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-2.5 py-1.5 text-sm text-[var(--ops-text)]";
  const labelCls = "block text-[11px] font-medium text-[var(--ops-text-muted)]";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 lg:p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-[var(--ops-text)]">Search</h1>
          <p className="text-xs text-[var(--ops-text-muted)]">
            Find assets by keyword, status, type, owner, assignee, or date
          </p>
        </div>
        <form
          className="flex w-full max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            commitToUrl({ page: 1 });
          }}
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Keyword</span>
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ops-text-muted)]"
            />
            <input
              className="h-9 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] py-2 pr-3 pl-8 text-sm"
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              placeholder="Keyword search…"
            />
          </label>
          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
        </form>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <aside className="w-full shrink-0 space-y-3 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-3 lg:w-64 lg:overflow-y-auto">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
            Filters
          </p>

          <label className={labelCls}>
            Status
            <select
              className={field}
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({ ...d, status: e.target.value }))
              }
            >
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelCls}>
            Type
            <select
              className={field}
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
            >
              <option value="">All</option>
              {types.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelCls}>
            Owner
            <input
              className={field}
              value={draft.owner}
              onChange={(e) =>
                setDraft((d) => ({ ...d, owner: e.target.value }))
              }
              placeholder="Owner name"
            />
          </label>

          <label className={labelCls}>
            Employee / assignee
            <input
              className={field}
              value={draft.assigned_to}
              onChange={(e) =>
                setDraft((d) => ({ ...d, assigned_to: e.target.value }))
              }
              placeholder="Assignee name"
            />
          </label>

          <label className={labelCls}>
            Created after
            <input
              type="date"
              className={field}
              value={draft.created_after}
              onChange={(e) =>
                setDraft((d) => ({ ...d, created_after: e.target.value }))
              }
            />
          </label>

          <label className={labelCls}>
            Created before
            <input
              type="date"
              className={field}
              value={draft.created_before}
              onChange={(e) =>
                setDraft((d) => ({ ...d, created_before: e.target.value }))
              }
            />
          </label>

          <label className={labelCls}>
            Sort
            <select
              className={field}
              value={draft.sort}
              onChange={(e) => {
                const value = e.target.value as SortKey;
                setDraft((d) => ({ ...d, sort: value }));
              }}
            >
              <option value="created_at">Created</option>
              <option value="updated_at">Updated</option>
              <option value="name">Name</option>
              <option value="code">Code</option>
              <option value="owner">Owner</option>
            </select>
          </label>

          <label className={labelCls}>
            Order
            <select
              className={field}
              value={draft.order}
              onChange={(e) => {
                const value = e.target.value as OrderKey;
                setDraft((d) => ({ ...d, order: value }));
              }}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={() => commitToUrl({ page: 1 })}
            >
              Apply
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear
            </Button>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--ops-border)] px-3 py-2 text-xs text-[var(--ops-text-muted)]">
            <span>
              {loading ? "Searching…" : `${total} result${total === 1 ? "" : "s"}`}
            </span>
            <span>
              Page {params.page ?? 1}
              {pages > 0 ? ` of ${pages}` : ""}
            </span>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <ErrorState
              message={error}
              onRetry={() => {
                setLoading(true);
                setReloadToken((n) => n + 1);
              }}
            />
          ) : null}

          {!loading && !error && assets.length === 0 ? (
            <EmptyState
              title="NO MATCHES"
              description="Try a different keyword or clear some filters."
              action={
                <Button variant="secondary" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            />
          ) : null}

          {!loading && !error && assets.length > 0 ? (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[var(--ops-bg-elevated)] text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
                <tr className="border-b border-[var(--ops-border)]">
                  <th className="px-3 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Assignees</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const st = asset.asset_status_id
                    ? statusById.get(asset.asset_status_id)
                    : undefined;
                  const ty = asset.asset_type_id
                    ? typeById.get(asset.asset_type_id)
                    : undefined;
                  return (
                    <tr
                      key={asset.id}
                      className="cursor-pointer border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)]"
                      onClick={() => {
                        if (asset.project_id) {
                          setSelectedProjectId(asset.project_id);
                        }
                        router.push("/dashboard/assets");
                      }}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-[var(--ops-text-secondary)]">
                        {asset.code ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[var(--ops-text)]">
                        {asset.name}
                      </td>
                      <td className="px-3 py-2.5">
                        {st ? (
                          <span className="inline-flex items-center gap-1.5 text-[var(--ops-text-secondary)]">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: statusColor(st.slug, st.color),
                              }}
                            />
                            {st.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                        {ty?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                        {asset.owner ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                        {asset.assignees.length
                          ? asset.assignees.join(", ")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}

          {!loading && pages > 1 ? (
            <div className="flex items-center justify-end gap-2 border-t border-[var(--ops-border)] px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={(params.page ?? 1) <= 1}
                onClick={() =>
                  commitToUrl({ page: Math.max(1, (params.page ?? 1) - 1) })
                }
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={(params.page ?? 1) >= pages}
                onClick={() => commitToUrl({ page: (params.page ?? 1) + 1 })}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
