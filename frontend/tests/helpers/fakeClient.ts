/**
 * In-memory fake Supabase client for service/repository tests.
 *
 * Implements the chainable query subset the repositories rely on
 * (select/eq/neq/is/in/ilike/or/order/range/limit/maybeSingle/single/
 * insert/update) against a plain table store. No network, no credentials.
 *
 * The returned object is cast to the real `Client` type (type-only import, so
 * no Supabase runtime dependency) so test call sites and repository
 * constructors typecheck while the fake provides the runtime behavior.
 */

import type { Client } from "@/lib/server/repositories/base";

type Row = Record<string, unknown>;

type QueryResult = {
  data: unknown;
  count: number | null;
  error: { message: string } | null;
};

type Filter = (row: Row) => boolean;

function like(pattern: string, value: unknown): boolean {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(text);
}

function orFilter(expr: string, row: Row): boolean {
  const segments = expr.split(",");
  return segments.some((segment) => {
    const s = segment.trim();
    // Handle `col.is.null` / `col.is.not.null` style inside or()
    if (s.includes(".is.")) {
      const [col, , val] = s.split(".");
      if (val === "null") return row[col] == null;
      if (val === "not" || val === "not.null") return row[col] != null;
      return false;
    }
    const [rawCol, op, ...rest] = s.split(".");
    if (!rawCol || !op) return false;
    const value = rest.join(".");
    let target: unknown = row[rawCol];
    // assignees->>N : Nth array element as text (NULL/out-of-range -> no match).
    // metadata->>key : JSONB text field.
    if (rawCol.includes("->>")) {
      const arrow = rawCol.indexOf("->>");
      const base = rawCol.slice(0, arrow);
      const key = rawCol.slice(arrow + 3);
      const baseVal = row[base];
      const idx = Number(key);
      if (!Number.isNaN(idx) && String(idx) === key) {
        // numeric index → assignees array
        target = Array.isArray(baseVal) ? String(baseVal[idx] ?? "") : "";
      } else {
        // string key → metadata object field
        if (baseVal && typeof baseVal === "object" && !Array.isArray(baseVal)) {
          const v = (baseVal as Record<string, unknown>)[key];
          if (Array.isArray(v)) target = JSON.stringify(v);
          else target = v == null ? "" : String(v);
        } else {
          target = "";
        }
      }
    } else if (rawCol.endsWith("::text")) {
      const col = rawCol.slice(0, rawCol.indexOf("::"));
      target = JSON.stringify(row[col] ?? null);
    }
    if (op === "ilike") return like(value, target);
    if (op === "eq") return target === value;
    if (op === "is") return value === "null" ? target == null : target === value;
    return false;
  });
}

function makeBuilder(store: Map<string, Row[]>, table: string) {
  const rows = store.get(table) ?? [];
  let op: "select" | "insert" | "update" | "delete" = "select";
  let insertRow: Row | null = null;
  let updateRow: Row | null = null;
  const filters: Filter[] = [];
  const orders: Array<{ column: string; asc: boolean }> = [];
  let rangeFrom: number | undefined;
  let rangeTo: number | undefined;
  let limitN: number | undefined;
  let countMode: "exact" | undefined;
  let headMode = false;

  function evaluate(): Row[] {
    return rows.filter((row) => filters.every((f) => f(row)));
  }

  function finish(single: boolean): QueryResult {
    let matched: Row[];
    if (op === "insert" && insertRow) {
      store.get(table)?.push({ ...insertRow });
      matched = [{ ...insertRow }];
    } else if (op === "update" && updateRow) {
      matched = evaluate();
      for (const row of matched) Object.assign(row, structuredClone(updateRow));
    } else if (op === "delete") {
      matched = evaluate();
      const remaining = rows.filter((row) => !matched.includes(row));
      store.set(table, remaining);
    } else {
      matched = evaluate();
    }

    const total = matched.length;
    let items = matched;

    if (orders.length > 0) {
      items = [...items].sort((a, b) => {
        for (const { column, asc } of orders) {
          const av = a[column] ?? "";
          const bv = b[column] ?? "";
          if (av === bv) continue;
          if (av == null) return asc ? -1 : 1;
          if (bv == null) return asc ? 1 : -1;
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return asc ? cmp : -cmp;
        }
        return 0;
      });
    }

    if (rangeFrom !== undefined && rangeTo !== undefined) {
      items = items.slice(rangeFrom, rangeTo + 1);
    } else if (limitN !== undefined) {
      items = items.slice(0, limitN);
    }

    if (headMode) {
      return { data: null, count: total, error: null };
    }
    if (single) {
      return { data: items[0] ?? null, count: countMode ? total : null, error: null };
    }
    return { data: items, count: countMode ? total : null, error: null };
  }

  const builder = {
    select(_cols?: string, opts?: { count?: "exact"; head?: boolean }) {
      countMode = opts?.count ?? countMode;
      headMode = opts?.head ?? headMode;
      return builder;
    },
    eq(column: string, value: unknown) {
      filters.push((row) => row[column] === value);
      return builder;
    },
    neq(column: string, value: unknown) {
      filters.push((row) => row[column] !== value);
      return builder;
    },
    is(column: string, value: unknown) {
      filters.push((row) => (value === null ? row[column] == null : row[column] === value));
      return builder;
    },
    in(column: string, values: unknown[]) {
      filters.push((row) => values.includes(row[column]));
      return builder;
    },
    ilike(column: string, pattern: string) {
      // Support metadata->>key ilike by extracting base + key
      if (column.includes("->>")) {
        const arrow = column.indexOf("->>");
        const base = column.slice(0, arrow);
        const key = column.slice(arrow + 3);
        filters.push((row) => {
          const baseVal = row[base];
          let target = "";
          if (baseVal && typeof baseVal === "object" && !Array.isArray(baseVal)) {
            const v = (baseVal as Record<string, unknown>)[key];
            target = v == null ? "" : Array.isArray(v) ? JSON.stringify(v) : String(v);
          }
          return like(pattern, target);
        });
        return builder;
      }
      filters.push((row) => like(pattern, row[column]));
      return builder;
    },
    gte(column: string, value: unknown) {
      filters.push((row) => {
        const v = row[column];
        if (typeof v === "string" && typeof value === "string") return v >= value;
        if (typeof v === "number" && typeof value === "number") return v >= value;
        if (typeof v === "string" && typeof value === "number") return Number(v) >= value;
        return String(v ?? "") >= String(value ?? "");
      });
      return builder;
    },
    lte(column: string, value: unknown) {
      filters.push((row) => {
        const v = row[column];
        if (typeof v === "string" && typeof value === "string") return v <= value;
        if (typeof v === "number" && typeof value === "number") return v <= value;
        if (typeof v === "string" && typeof value === "number") return Number(v) <= value;
        return String(v ?? "") <= String(value ?? "");
      });
      return builder;
    },
    not(column: string, op: string, value: unknown) {
      if (op === "is" && value === null) {
        filters.push((row) => row[column] != null);
        return builder;
      }
      // generic not
      filters.push((row) => row[column] !== value);
      return builder;
    },
    or(expr: string) {
      filters.push((row) => orFilter(expr, row));
      return builder;
    },
    order(column: string, opts?: { ascending?: boolean }) {
      orders.push({ column, asc: opts?.ascending ?? false });
      return builder;
    },
    range(from: number, to: number) {
      rangeFrom = from;
      rangeTo = to;
      return builder;
    },
    limit(n: number) {
      limitN = n;
      return builder;
    },
    maybeSingle() {
      return Promise.resolve(finish(true));
    },
    single() {
      return Promise.resolve(finish(true));
    },
    insert(row: Row) {
      op = "insert";
      insertRow = row;
      return builder;
    },
    update(row: Row) {
      op = "update";
      updateRow = row;
      return builder;
    },
    delete() {
      op = "delete";
      return builder;
    },
    then<T = QueryResult>(
      onFulfilled?: (value: QueryResult) => T | PromiseLike<T>,
      onRejected?: (reason: unknown) => T | PromiseLike<T>,
    ) {
      const result = finish(false);
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };

  return builder;
}

/** Build a fake client whose tables are seeded from the given object. */
export function createFakeClient(tables: Record<string, Row[]>): Client {
  return createFakeClientFromStore(createStore(tables));
}

/**
 * Shared store so the authenticated and admin clients see the same rows, like
 * the real Supabase backend (RLS aside).
 */
export function createSharedStore(tables: Record<string, Row[]>) {
  return createStore(tables);
}

export type FakeAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export function createFakeClientFromStore(
  store: Map<string, Row[]>,
  opts?: { user?: FakeAuthUser | null },
): Client {
  const client = {
    from: (table: string) => makeBuilder(store, table),
    auth: {
      getUser: async () => ({
        data: { user: opts?.user ?? null },
        error: null,
      }),
    },
    storage: {
      listBuckets: async () => ({
        data: [{ name: "documents" }, { name: "reports" }],
        error: null,
      }),
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      // Minimal stand-in for the SECURITY DEFINER public.set_user_role().
      // The action layer already enforces the admin role; this fake mirrors
      // the definer's profile update + error contract for tests.
      if (fn === "set_user_role") {
        const target = String(args?.target_user_id ?? "");
        const role = String(args?.new_role ?? "");
        const profiles = store.get("profiles") ?? [];
        const row = profiles.find((p) => p.id === target);
        if (!row) {
          return { data: null, error: { message: "PROFILE_NOT_FOUND" } };
        }
        row.role = role;
        row.updated_at = new Date().toISOString();
        return { data: null, error: null };
      }
      return { data: null, error: { message: `unexpected rpc: ${fn}` } };
    },
  };
  return client as unknown as Client;
}

function createStore(tables: Record<string, Row[]>): Map<string, Row[]> {
  const store = new Map<string, Row[]>();
  for (const [name, rows] of Object.entries(tables)) {
    store.set(name, rows.map((row) => structuredClone(row)));
  }
  return store;
}