import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type Client = SupabaseClient<Database>;

export type SortSpec = {
  column: string;
  order: "asc" | "desc";
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function asc(column: string): SortSpec {
  return { column, order: "asc" };
}

export function desc(column: string): SortSpec {
  return { column, order: "desc" };
}