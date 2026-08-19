// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { assetState } = vi.hoisted(() => ({
  assetState: {
    rows: [
      {
        id: "a1",
        project_id: "p1",
        asset_type_id: "t1",
        asset_status_id: "s1",
        name: "Villa A1",
        code: "A1",
        description: null,
        owner: "Ops",
        notes: null,
        assignees: [],
        metadata: { capacity: 6, placed: 4 },
        created_at: "",
        updated_at: "",
        created_by: null,
        updated_by: null,
      },
    ],
  },
}));

vi.mock("@/services/dashboard", () => ({
  getProjectSummary: vi.fn(async () => ({
    success: true,
    data: {
      project_id: "p1",
      total_assets: assetState.rows.length,
      by_status: [
        { status_id: "s1", status_slug: "available", status_name: "Available", color: "#22c55e", count: assetState.rows.length },
        { status_id: "s2", status_slug: "sold", status_name: "Sold", color: "#c026d3", count: 0 },
      ],
      kpis: {
        placed: 6,
        placed_capacity: 10,
        villa_capacity: 3,
        spots_open: 2,
        villas_sold_out: 1,
        total_villas: assetState.rows.length,
      },
    },
    message: null,
  })),
  listAssetStatuses: vi.fn(async () => ({
    success: true,
    data: [
      { id: "s1", name: "Available", slug: "available", color: "#22c55e", description: null, sort_order: 1, created_at: "", updated_at: "" },
    ],
    pagination: { page: 1, limit: 25, total: 1, pages: 1 },
    message: null,
  })),
}));

vi.mock("@/services/assets", () => ({
  listAssets: vi.fn(async () => ({
    success: true,
    data: assetState.rows,
    pagination: { page: 1, limit: 100, total: assetState.rows.length, pages: 1 },
    message: null,
  })),
}));

import { getProjectSummary } from "@/services/dashboard";
import { listAssets } from "@/services/assets";
import { DashboardOverview } from "@/features/dashboard/DashboardOverview";
import { ShellProvider, useShell } from "@/stores/shell-context";

const mockedGetSummary = vi.mocked(getProjectSummary);
const mockedListAssets = vi.mocked(listAssets);

function Harness() {
  const { setSelectedProjectId, bumpRefresh } = useShell();
  return (
    <>
      <button type="button" onClick={() => setSelectedProjectId("p1")}>
        Select project
      </button>
      <button type="button" onClick={bumpRefresh}>
        Bump refresh
      </button>
      <DashboardOverview />
    </>
  );
}

function renderOverview() {
  return render(
    <ShellProvider>
      <Harness />
    </ShellProvider>,
  );
}

const seedAsset = {
  id: "a1",
  project_id: "p1",
  asset_type_id: "t1",
  asset_status_id: "s1",
  name: "Villa A1",
  code: "A1",
  description: null,
  owner: "Ops",
  notes: null,
  assignees: [],
  metadata: { capacity: 6, placed: 4 },
  created_at: "",
  updated_at: "",
  created_by: null,
  updated_by: null,
};

describe("DashboardOverview (/dashboard)", () => {
  beforeEach(() => {
    assetState.rows = [{ ...seedAsset }];
    mockedGetSummary.mockClear();
    mockedListAssets.mockClear();
  });

  it("prompts for a development when none is active", () => {
    renderOverview();
    expect(screen.getByText("No development selected")).toBeInTheDocument();
    expect(screen.getByText("Create development")).toBeInTheDocument();
    expect(screen.queryByText("Placed (OPS)")).not.toBeInTheDocument();
  });

  it("shows KPI cards, status distribution, and the property portfolio from persisted data", async () => {
    renderOverview();
    await userEvent.click(screen.getByRole("button", { name: "Select project" }));

    expect(mockedGetSummary).toHaveBeenCalledWith("p1", false);
    expect(mockedListAssets).toHaveBeenCalledWith(
      { project_id: "p1", limit: 100 },
      false,
    );
    expect(await screen.findByText("Placed (OPS)")).toBeInTheDocument();
    expect(screen.getByText("Total Capacity")).toBeInTheDocument();
    expect(screen.getByText("Spots Open")).toBeInTheDocument();
    expect(screen.getByText("Units Sold")).toBeInTheDocument();
    expect(screen.getByText("6 / 10")).toBeInTheDocument();

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Villa A1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Villa A1/ })).toHaveAttribute(
      "href",
      "/dashboard/properties/a1",
    );
  });

  it("renders no property map, villa list, filters, or info panel", async () => {
    renderOverview();
    await userEvent.click(screen.getByRole("button", { name: "Select project" }));

    expect(await screen.findByText("Placed (OPS)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Property Map" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Villa List" })).not.toBeInTheDocument();
    expect(screen.queryByText("Filters")).not.toBeInTheDocument();
    expect(screen.queryByText("Details")).not.toBeInTheDocument();
  });

  it("shows an empty portfolio CTA when the development has no properties", async () => {
    assetState.rows = [];
    mockedGetSummary.mockResolvedValueOnce({
      success: true,
      data: {
        project_id: "p1",
        total_assets: 0,
        by_status: [],
        kpis: {
          placed: 0,
          placed_capacity: 0,
          villa_capacity: 0,
          spots_open: 0,
          villas_sold_out: 0,
          total_villas: 0,
        },
      },
      message: null,
    } as never);
    mockedListAssets.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, limit: 100, total: 0, pages: 0 },
      message: null,
    } as never);

    renderOverview();
    await userEvent.click(screen.getByRole("button", { name: "Select project" }));

    expect(await screen.findByText("No properties yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first property")).toBeInTheDocument();
  });

  it("shows an error state with retry when the summary fails", async () => {
    mockedGetSummary.mockRejectedValueOnce(new Error("Project not found."));
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole("button", { name: "Select project" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard failed to load");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("recalculates KPIs from persisted data when a mutation signals refresh", async () => {
    const user = userEvent.setup();
    renderOverview();
    await user.click(screen.getByRole("button", { name: "Select project" }));
    await screen.findByText("Placed (OPS)");

    const callsBefore = mockedGetSummary.mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Bump refresh" }));

    expect(mockedGetSummary.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(mockedGetSummary).toHaveBeenLastCalledWith("p1", false);
    expect(await screen.findByText("Placed (OPS)")).toBeInTheDocument();
  });
});
