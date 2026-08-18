// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AssetForm } from "@/features/assets/AssetForm";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";

const statuses: AssetStatus[] = [
  { id: "s1", name: "Available", slug: "available", color: "#22c55e", description: null, sort_order: 1, created_at: "", updated_at: "" },
];
const types: AssetType[] = [
  { id: "t1", name: "Villa", slug: "villa", description: null, sort_order: 1, created_at: "", updated_at: "" },
];

function baseAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "a1",
    project_id: "p1",
    asset_type_id: null,
    asset_status_id: null,
    name: "Villa A1",
    code: "A1",
    description: null,
    owner: "Ops",
    notes: null,
    assignees: [],
    metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

describe("AssetForm", () => {
  it("submits create with basic and operational fields", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(
      <AssetForm
        mode="create"
        projectId="p1"
        types={types}
        statuses={statuses}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("Name *"), "Villa B1");
    await user.type(screen.getByLabelText("Code"), "B1");
    await user.type(screen.getByLabelText("Owner"), "Ops Team");
    await user.type(screen.getByLabelText("Capacity"), "6");
    await user.type(screen.getByLabelText("Placed"), "4");
    await user.type(screen.getByLabelText("Map X"), "120");
    await user.type(screen.getByLabelText("Map Y"), "80");
    await user.click(screen.getByRole("button", { name: "Create asset" }));

    expect(onSubmit).toHaveBeenCalledWith({
      project_id: "p1",
      name: "Villa B1",
      code: "B1",
      description: null,
      owner: "Ops Team",
      notes: null,
      assignees: [],
      asset_type_id: null,
      asset_status_id: null,
      metadata: { capacity: "6", placed: "4", map_x: "120", map_y: "80" },
    });
  });

  it("omits empty operational values on submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(
      <AssetForm
        mode="create"
        projectId="p1"
        types={types}
        statuses={statuses}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("Name *"), "Villa C1");
    await user.click(screen.getByRole("button", { name: "Create asset" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
  });

  it("prefills operational fields from metadata and preserves unrelated keys on edit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(
      <AssetForm
        mode="edit"
        projectId="p1"
        initial={baseAsset({
          metadata: { capacity: 4, bedrooms: 3, address: "1 Main St", map_x: 100 },
        })}
        types={types}
        statuses={statuses}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByLabelText("Capacity")).toHaveValue("4");
    expect(screen.getByLabelText("Map X")).toHaveValue("100");

    await user.clear(screen.getByLabelText("Capacity"));
    await user.type(screen.getByLabelText("Capacity"), "8");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Villa A1",
      code: "A1",
      description: null,
      owner: "Ops",
      notes: null,
      assignees: [],
      asset_type_id: null,
      asset_status_id: null,
      metadata: { capacity: "8", bedrooms: 3, address: "1 Main St", map_x: "100" },
    });
  });

  it("clears operational fields when emptied in edit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(
      <AssetForm
        mode="edit"
        projectId="p1"
        initial={baseAsset({
          metadata: { capacity: 6, placed: 4, map_x: 10, map_y: 20, bedrooms: 2 },
        })}
        types={types}
        statuses={statuses}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.clear(screen.getByLabelText("Capacity"));
    await user.clear(screen.getByLabelText("Placed"));
    await user.clear(screen.getByLabelText("Map X"));
    await user.clear(screen.getByLabelText("Map Y"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { bedrooms: 2 } }),
    );
  });

  it("surfaces errors thrown by the submit handler", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {
      throw new Error("placed must be a non-negative integer.");
    });
    render(
      <AssetForm
        mode="create"
        projectId="p1"
        types={types}
        statuses={statuses}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByLabelText("Name *"), "Villa D1");
    await user.click(screen.getByRole("button", { name: "Create asset" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "placed must be a non-negative integer.",
    );
  });
});