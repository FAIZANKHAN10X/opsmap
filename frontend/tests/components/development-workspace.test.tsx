// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { UserRole } from "@/types/domain";

const { assetState } = vi.hoisted(() => {
  const villaA1 = {
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
    metadata: { capacity: 6, placed: 4, map_x: 120, map_y: 80 },
    created_at: "",
    updated_at: "",
    created_by: null,
    updated_by: null,
  };
  return { assetState: { rows: [villaA1] } };
});

vi.mock("@/services/dashboard", () => ({
  getProjectSummary: vi.fn(async () => ({
    success: true,
    data: {
      project_id: "p1",
      total_assets: assetState.rows.length,
      by_status: [
        { status_id: "s1", status_slug: "available", status_name: "Available", color: "#22c55e", count: assetState.rows.length },
      ],
      kpis: {
        placed: 6,
        placed_capacity: 10,
        villa_capacity: 3,
        spots_open: 2,
        villas_sold_out: 0,
        total_villas: assetState.rows.length,
      },
    },
    message: null,
  })),
  listAssetStatuses: vi.fn(async () => ({
    data: [
      { id: "s1", name: "Available", slug: "available", color: "#22c55e", description: null, sort_order: 1, created_at: "", updated_at: "" },
    ],
    pagination: { page: 1, limit: 25, total: 1, total_pages: 1 },
    message: null,
    success: true,
  })),
}));

vi.mock("@/services/asset-types", () => ({
  listAssetTypes: vi.fn(async () => ({
    data: [
      { id: "t1", name: "Villa", slug: "villa", description: null, sort_order: 1, created_at: "", updated_at: "" },
    ],
    pagination: { page: 1, limit: 25, total: 1, total_pages: 1 },
    message: null,
    success: true,
  })),
}));

vi.mock("@/services/assets", () => ({
  listAssets: vi.fn(async () => ({
    data: assetState.rows.map((row) => ({
      ...row,
      metadata: { ...row.metadata },
    })),
    pagination: { page: 1, limit: 25, total: assetState.rows.length, total_pages: 1 },
    message: null,
    success: true,
  })),
  createAsset: vi.fn(async (input) => {
    const row = {
      id: `a${assetState.rows.length + 1}`,
      project_id: input.project_id,
      asset_type_id: input.asset_type_id,
      asset_status_id: input.asset_status_id,
      name: input.name,
      code: input.code,
      description: input.description,
      owner: input.owner,
      notes: input.notes,
      assignees: input.assignees,
      metadata: input.metadata ?? {},
      created_at: "",
      updated_at: "",
      created_by: null,
      updated_by: null,
    };
    assetState.rows.push(row);
    return { success: true, data: row, message: null };
  }),
  updateAsset: vi.fn(async (id, input) => {
    const index = assetState.rows.findIndex((row) => row.id === id);
    const current = assetState.rows[index];
    const row = {
      ...current,
      ...input,
      metadata: { ...current.metadata, ...(input.metadata ?? {}) },
    };
    assetState.rows[index] = row;
    return { success: true, data: row, message: null };
  }),
  deleteAsset: vi.fn(async (id) => {
    assetState.rows = assetState.rows.filter((row) => row.id !== id);
  }),
}));

vi.mock("@/features/workspace/InteractiveCanvas", () => ({
  InteractiveCanvas: ({
    assets,
    placement,
    onPlace,
  }: {
    assets: { id: string; name: string }[];
    placement: { x: number; y: number } | null;
    onPlace?: (point: { x: number; y: number }) => void;
  }) => (
    <div data-testid="interactive-canvas">
      <button
        type="button"
        data-testid="place-at-640-320"
        onClick={() => onPlace?.({ x: 640, y: 320 })}
      >
        Place at 640,320
      </button>
      {placement ? (
        <span data-testid="placement">
          {placement.x},{placement.y}
        </span>
      ) : null}
      {assets.map((asset) => asset.name).join(", ")}
    </div>
  ),
}));

import { getProjectSummary, listAssetStatuses } from "@/services/dashboard";
import { listAssetTypes } from "@/services/asset-types";
import {
  createAsset,
  deleteAsset,
  listAssets,
  updateAsset,
} from "@/services/assets";
import { DevelopmentWorkspace } from "@/features/dashboard/DevelopmentWorkspace";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { UserProvider } from "@/stores/user-context";
import { ToastProvider } from "@/stores/toast-context";

const mockedListAssets = vi.mocked(listAssets);
const mockedGetSummary = vi.mocked(getProjectSummary);
const mockedCreateAsset = vi.mocked(createAsset);
const mockedUpdateAsset = vi.mocked(updateAsset);
const mockedDeleteAsset = vi.mocked(deleteAsset);

function Harness() {
  const { setSelectedProjectId, setDemoMode } = useShell();
  return (
    <>
      <button type="button" onClick={() => setSelectedProjectId("p1")}>
        Select project
      </button>
      <button type="button" onClick={() => setDemoMode(true)}>
        Enable demo mode
      </button>
      <DevelopmentWorkspace />
    </>
  );
}

function renderWorkspace(role: UserRole = "admin") {
  return render(
    <UserProvider
      user={{ email: "test@example.com", fullName: "Test User", role }}
    >
      <ToastProvider>
        <ShellProvider>
          <Harness />
        </ShellProvider>
      </ToastProvider>
    </UserProvider>,
  );
}

async function openWorkspace(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Select project" }));
  await screen.findByTestId("interactive-canvas");
}

describe("DevelopmentWorkspace (/dashboard/development)", () => {
  beforeEach(() => {
    assetState.rows = [
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
        metadata: { capacity: 6, placed: 4, map_x: 120, map_y: 80 },
        created_at: "",
        updated_at: "",
        created_by: null,
        updated_by: null,
      },
    ];
    vi.clearAllMocks();
  });

  it("prompts for a project selection when none is active", () => {
    renderWorkspace();
    expect(
      screen.getByText("Select a project to open the workspace."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Property Map" }),
    ).not.toBeInTheDocument();
  });

  it("loads statuses, types, assets, and summary from the real data path", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    expect(listAssetStatuses).toHaveBeenCalled();
    expect(listAssetTypes).toHaveBeenCalled();
    expect(mockedGetSummary).toHaveBeenCalledWith("p1", false);
    expect(mockedListAssets).toHaveBeenCalledWith(
      {
        project_id: "p1",
        search: undefined,
        status_slugs: undefined,
        type_slugs: undefined,
      },
      false,
    );
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("renders the map/list workspace but no KPI cards", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    const mapButton = screen.getByRole("button", { name: "Property Map" });
    const listButton = screen.getByRole("button", { name: "Villa List" });
    expect(mapButton).toHaveAttribute("aria-pressed", "true");
    expect(listButton).toHaveAttribute("aria-pressed", "false");

    expect(screen.queryByText("Placed (OPS)")).not.toBeInTheDocument();
    expect(screen.queryByText("Villa Capacity")).not.toBeInTheDocument();
    expect(screen.queryByText("Status Distribution")).not.toBeInTheDocument();
  });

  it("switches to the villa list table view", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    const listButton = screen.getByRole("button", { name: "Villa List" });
    await user.click(listButton);

    expect(listButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Villa A1")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("creates a villa from the ULLUWATU workspace and selects it", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "Add villa" }));
    expect(screen.getByLabelText("New villa")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name *"), "Villa B2");
    await user.type(screen.getByLabelText("Capacity"), "8");
    await user.type(screen.getByLabelText("Placed"), "3");
    await user.click(screen.getByRole("button", { name: "Place at 640,320" }));

    expect(screen.getByTestId("placement")).toHaveTextContent("640,320");
    expect(screen.getByLabelText("Map X")).toHaveValue("640");
    expect(screen.getByLabelText("Map Y")).toHaveValue("320");

    const summaryCallsBefore = mockedGetSummary.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Create asset" }));

    expect(mockedCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Villa B2",
        project_id: "p1",
        metadata: expect.objectContaining({
          capacity: "8",
          placed: "3",
          map_x: "640",
          map_y: "320",
        }),
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Villa B2" }),
      ).toBeInTheDocument();
    });
    expect(mockedListAssets).toHaveBeenCalled();
    // The shared refresh signal refetches the KPI summary from persisted data.
    expect(mockedGetSummary.mock.calls.length).toBeGreaterThan(
      summaryCallsBefore,
    );
    expect(screen.queryByRole("button", { name: "Create asset" })).not.toBeInTheDocument();
  });

  it("supports manual Map X/Map Y coordinates as a fallback", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "Add villa" }));
    await user.type(screen.getByLabelText("Name *"), "Villa C3");
    await user.type(screen.getByLabelText("Map X"), "200");
    await user.type(screen.getByLabelText("Map Y"), "150");
    await user.click(screen.getByRole("button", { name: "Create asset" }));

    expect(mockedCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Villa C3",
        metadata: expect.objectContaining({ map_x: "200", map_y: "150" }),
      }),
    );
  });

  it("edits the selected villa and reflects updated values", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "Villa List" }));
    await user.click(screen.getByRole("button", { name: "Open details panel" }));
    expect(screen.getByLabelText("Asset details")).toBeInTheDocument();

    const editButton = await screen.findByRole("button", {
      name: "Edit property",
    });
    await user.click(editButton);
    expect(screen.getByLabelText("Edit villa")).toBeInTheDocument();

    const nameInput = screen.getByLabelText("Name *");
    expect(nameInput).toHaveValue("Villa A1");
    await user.clear(nameInput);
    await user.type(nameInput, "Villa A1 Renovated");
    const capacityInput = screen.getByLabelText("Capacity");
    await user.clear(capacityInput);
    await user.type(capacityInput, "10");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockedUpdateAsset).toHaveBeenCalledWith(
      "a1",
      expect.objectContaining({
        name: "Villa A1 Renovated",
        metadata: expect.objectContaining({
          capacity: "10",
          map_x: "120",
          map_y: "80",
        }),
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Villa A1 Renovated" }),
      ).toBeInTheDocument();
    });
  });

  it("deletes the selected villa with confirmation", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Villa List" }));
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const deleteButton = await screen.findByRole("button", { name: "Delete" });
    await user.click(deleteButton);

    expect(mockedDeleteAsset).toHaveBeenCalledWith("a1");
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Villa A1" }),
      ).not.toBeInTheDocument();
    });
  });

  it("skips deletion when confirmation is declined", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Villa List" }));
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const deleteButton = await screen.findByRole("button", { name: "Delete" });
    await user.click(deleteButton);

    expect(mockedDeleteAsset).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Villa A1" }),
    ).toBeInTheDocument();
  });

  it("hides create/edit/delete actions for viewers", async () => {
    const user = userEvent.setup();
    renderWorkspace("viewer");
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "Villa List" }));
    await user.click(screen.getByRole("button", { name: "Open details panel" }));
    expect(screen.getByLabelText("Asset details")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Add villa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit property" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("keeps the workspace read-only in demo mode", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "Villa List" }));
    await user.click(screen.getByRole("button", { name: "Open details panel" }));
    expect(screen.getByRole("button", { name: "Edit property" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    await waitFor(() => {
      expect(mockedListAssets).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: undefined }),
        true,
      );
    });

    expect(screen.queryByRole("button", { name: "Add villa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit property" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("preserves existing selection behavior via the info panel", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "Villa List" }));
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    expect(screen.getByLabelText("Asset details")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Villa A1" })).toBeInTheDocument();
    expect(screen.getAllByText("Capacity").length).toBeGreaterThan(0);

    const closeButton = screen.getByRole("button", { name: "Collapse panel" });
    await user.click(closeButton);
    expect(screen.queryByLabelText("Asset details")).not.toBeInTheDocument();
  });
});