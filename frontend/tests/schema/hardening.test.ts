import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  ALLOWED_PROJECT_STATUSES,
  DOCUMENT_CATEGORIES,
} from "@/lib/server/constants";

describe("schema hardening — 20260821000001", () => {
  const migration = path.resolve(
    process.cwd(),
    "../supabase/migrations/20260821000001_schema_hardening.sql",
  );
  const alt = path.resolve(
    process.cwd(),
    "supabase/migrations/20260821000001_schema_hardening.sql",
  );
  const file = fs.existsSync(migration) ? migration : alt;
  const sql = fs.readFileSync(file, "utf8");

  it("exists", () => {
    expect(fs.existsSync(file)).toBe(true);
  });

  it("adds UUID defaults for application PKs", () => {
    for (const table of [
      "projects",
      "asset_types",
      "asset_statuses",
      "assets",
      "documents",
      "notifications",
      "contacts",
      "property_contacts",
    ]) {
      expect(sql).toContain(
        `alter table public.${table} alter column id set default gen_random_uuid()`,
      );
    }
  });

  it("adds JSONB defaults for assets/notifications", () => {
    expect(sql).toContain("alter table public.assets alter column assignees set default '[]'");
    expect(sql).toContain("alter table public.assets alter column metadata set default '{}'");
    expect(sql).toContain("alter table public.notifications alter column metadata set default '{}'");
  });

  it("adds CHECK constraints matching application constants", () => {
    expect(sql).toContain("chk_projects_status");
    expect(sql).toContain("chk_documents_category");
    expect(sql).toContain("chk_documents_size_bytes");
    // constants parity
    expect(ALLOWED_PROJECT_STATUSES.has("active")).toBe(true);
    expect(ALLOWED_PROJECT_STATUSES.has("archived")).toBe(true);
    expect(DOCUMENT_CATEGORIES.has("contract")).toBe(true);
    expect(DOCUMENT_CATEGORIES.has("other")).toBe(true);
  });

  it("replaces table-wide slug uniques with partial indexes", () => {
    expect(sql).toContain("uq_projects_slug_active");
    expect(sql).toContain("uq_asset_types_slug_active");
    expect(sql).toContain("uq_asset_statuses_slug_active");
    expect(sql).toContain("where deleted_at is null");
    expect(sql).toContain("drop constraint if exists uq_projects_slug");
  });

  it("revokes notifications INSERT/DELETE from authenticated", () => {
    expect(sql).toContain("revoke insert, delete on table public.notifications from authenticated");
  });

  it("restricts reports bucket to application/json", () => {
    expect(sql).toContain("update storage.buckets");
    expect(sql).toContain("allowed_mime_types = array['application/json']");
    expect(sql).toContain("where id = 'reports'");
  });

  it("revokes anon from contacts tables", () => {
    expect(sql).toContain("revoke all on table public.contacts, public.property_contacts from anon");
  });
});
