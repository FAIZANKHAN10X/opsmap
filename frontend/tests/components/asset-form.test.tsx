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
  it("submits create with basic, detail, and operational fields", async () => {
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

    await user.type(screen.getByLabelText("Property name *"), "Villa B1");
    await user.type(screen.getByLabelText("Unit / Villa No."), "B1");
    await user.type(screen.getByLabelText("Address"), "1 Beach Rd");
    await user.type(screen.getByLabelText("Bedrooms"), "3");
    await user.type(screen.getByLabelText("Bathrooms"), "2.5");
    await user.type(screen.getByLabelText("Capacity (max pax)"), "6");
    await user.type(screen.getByLabelText("Placed (pax)"), "4");
    await user.click(screen.getByRole("button", { name: "Pool" }));
    await user.type(screen.getByLabelText("Map X"), "120");
    await user.type(screen.getByLabelText("Map Y"), "80");
    await user.click(screen.getByRole("button", { name: "Create Property" }));

    expect(onSubmit).toHaveBeenCalledWith({
      project_id: "p1",
      name: "Villa B1",
      code: "B1",
      description: null,
      notes: null,
      asset_type_id: null,
      asset_status_id: null,
      metadata: {
        address: "1 Beach Rd",
        bedrooms: 3,
        bathrooms: 2.5,
        capacity: 6,
        placed: 4,
        features: ["Pool"],
        map_x: 120,
        map_y: 80,
      },
    });
  });

  it("omits empty optional values on submit", async () => {
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

    await user.type(screen.getByLabelText("Property name *"), "Villa C1");
    await user.click(screen.getByRole("button", { name: "Create Property" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
  });

  it("prefills property details and preserves unrelated metadata on edit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(
      <AssetForm
        mode="edit"
        projectId="p1"
        initial={baseAsset({
          metadata: {
            capacity: 4,
            bedrooms: 3,
            bathrooms: 2,
            area_sqm: 148,
            parking: 2,
            view: "Ocean view",
            furnishing: "fully-furnished",
            plot_area_sqm: 300,
            floor: "Ground",
            address: "1 Main St",
            map_x: 100,
          },
        })}
        types={types}
        statuses={statuses}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByLabelText("Capacity (max pax)")).toHaveValue("4");
    expect(screen.getByLabelText("Map X")).toHaveValue("100");
    expect(screen.getByLabelText("Address")).toHaveValue("1 Main St");
    expect(screen.getByLabelText("Bedrooms")).toHaveValue("3");
    expect(screen.getByLabelText("Bathrooms")).toHaveValue("2");
    expect(screen.getByLabelText("Built-up area (sqm)")).toHaveValue("148");
    expect(screen.getByLabelText("Plot area (sqm)")).toHaveValue("300");
    expect(screen.getByLabelText("Parking spaces")).toHaveValue("2");
    expect(screen.getByLabelText("View")).toHaveValue("Ocean view");
    expect(screen.getByLabelText("Furnishing")).toHaveValue("fully-furnished");
    expect(screen.getByLabelText("Floor")).toHaveValue("Ground");

    await user.clear(screen.getByLabelText("Capacity (max pax)"));
    await user.type(screen.getByLabelText("Capacity (max pax)"), "8");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Villa A1",
        code: "A1",
        metadata: expect.objectContaining({ capacity: 8 }),
      }),
    );
    // legacy owner/assignees are not sent so they are preserved server-side
    const payload = (onSubmit.mock.calls as unknown as Array<[Record<string, unknown>]>)[0][0];
    expect(payload).not.toHaveProperty("owner");
    expect(payload).not.toHaveProperty("assignees");
    expect((payload.metadata as Record<string, unknown>).bedrooms).toBe(3);
  });

  it("clears property fields when emptied in edit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(
      <AssetForm
        mode="edit"
        projectId="p1"
        initial={baseAsset({
          metadata: {
            capacity: 6,
            placed: 4,
            map_x: 10,
            map_y: 20,
            bedrooms: 2,
            view: "Garden",
            address: "Old address",
          },
        })}
        types={types}
        statuses={statuses}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    await user.clear(screen.getByLabelText("Capacity (max pax)"));
    await user.clear(screen.getByLabelText("Placed (pax)"));
    await user.clear(screen.getByLabelText("Map X"));
    await user.clear(screen.getByLabelText("Map Y"));
    await user.clear(screen.getByLabelText("View"));
    await user.clear(screen.getByLabelText("Address"));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { bedrooms: 2 } }),
    );
  });

  it("toggles feature chips into the payload", async () => {
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

    await user.type(screen.getByLabelText("Property name *"), "Villa F1");
    await user.click(screen.getByRole("button", { name: "Pool" }));
    await user.click(screen.getByRole("button", { name: "Garden" }));
    // toggle off again
    await user.click(screen.getByRole("button", { name: "Garden" }));
    await user.click(screen.getByRole("button", { name: "Create Property" }));

    const call = (onSubmit.mock.calls as unknown as Array<[{ metadata: Record<string, unknown> }]>)[0][0];
    expect(call.metadata.features).toEqual(["Pool"]);
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

    await user.type(screen.getByLabelText("Property name *"), "Villa D1");
    await user.click(screen.getByRole("button", { name: "Create Property" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "placed must be a non-negative integer.",
    );
  });
});
