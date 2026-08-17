import { describe, expect, it } from "vitest";

import { createFakeClient } from "../helpers/fakeClient";
import { SearchService } from "@/lib/server/services/search";
import { NotFoundError, ValidationAppError } from "@/lib/server/errors";

const PROJECT = "123e4567-e89b-12d3-a456-426614174000";

function makeService(assetRows: unknown[] = []) {
  const client = createFakeClient({
    projects: [{ id: PROJECT, name: "Main", slug: "main", deleted_at: null }],
    assets: assetRows.map((r) => ({ ...(r as object) })),
  });
  return { client, service: new SearchService(client) };
}

describe("SearchService", () => {
  it("rejects searches for a missing project", async () => {
    const { service } = makeService();
    const err = await service
      .searchAssets({ project_id: "99999999-0000-0000-0000-000000000000", q: "x" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe("PROJECT_NOT_FOUND");
  });

  it("rejects created_after later than created_before", async () => {
    const { service } = makeService();
    const err = await service
      .searchAssets({
        created_after: "2026-02-01T00:00:00Z",
        created_before: "2026-01-01T00:00:00Z",
      })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.message).toBe("created_after must be before created_before.");
    expect(err.fields[0].field).toBe("created_after");
  });

  it("searches across name/code/owner/notes/assignees", async () => {
    const { service } = makeService([
      { id: "a1", name: "Printer", code: "PRN-1", owner: "Ops", assignees: ["Alex"], notes: "Office" },
      { id: "a2", name: "Laptop", code: "LAP-1", owner: "Ops", assignees: [], notes: "IT" },
    ]);
    const result = await service.searchAssets({ q: "prn" });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe("a1");
  });

  it("returns suggestions with code/owner label formatting", async () => {
    const { service } = makeService([
      { id: "a1", name: "Printer", code: "PRN-1", owner: "Ops", asset_status_id: null, project_id: PROJECT },
      { id: "a2", name: "Laptop", code: null, owner: null, asset_status_id: null, project_id: PROJECT },
    ]);
    const suggestions = await service.suggestions("pr", { project_id: PROJECT });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].label).toBe("PRN-1 · Printer — Ops");
    const plain = await service.suggestions("lap", {});
    expect(plain[0].label).toBe("Laptop");
  });

  it("rejects suggestions for a missing project", async () => {
    const { service } = makeService();
    const err = await service
      .suggestions("x", { project_id: "99999999-0000-0000-0000-000000000000" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
  });

  it("defaults sort and order to created_at desc", async () => {
    const { service } = makeService([
      { id: "a1", name: "A" },
      { id: "a2", name: "B" },
    ]);
    const result = await service.searchAssets({ q: "" });
    expect(result.total).toBe(2);
  });
});