// @vitest-environment jsdom

vi.mock("server-only", () => ({}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { UserRole } from "@/types/domain";

const { assetState } = vi.hoisted(() => {
  const villaA1: {
    id: string;
    project_id: string;
    asset_type_id: string | null;
    asset_status_id: string | null;
    name: string;
    code: string;
    description: string | null;
    owner: string | null;
    notes: string | null;
    assignees: string[];
    metadata: Record<string, unknown>;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    updated_at: string;
    created_by: null;
    updated_by: null;
  } = {
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
    latitude: -8.815,
    longitude: 115.088,
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

vi.mock("@/services/documents", () => ({
  listAssetDocuments: vi.fn(async () => ({
    data: [],
    pagination: { page: 1, limit: 25, total: 0, pages: 0 },
    message: null,
    success: true,
  })),
  uploadDocument: vi.fn(async () => ({
    success: true,
    data: { id: "doc1", name: "doc", filename: "doc.pdf", category: "image", mime_type: "image/jpeg" },
    message: null,
  })),
  deleteDocument: vi.fn(async () => undefined),
  downloadDocumentClient: vi.fn(),
  getDocumentObjectUrl: vi.fn(() => null),
  getDocumentThumbnailUrl: vi.fn(() => null),
}));

vi.mock("@/services/contacts", () => ({
  listContacts: vi.fn(async () => ({
    data: [],
    pagination: { page: 1, limit: 8, total: 0, pages: 0 },
    message: null,
    success: true,
  })),
  listAssetContacts: vi.fn(async () => ({
    data: [],
    pagination: { page: 1, limit: 25, total: 0, pages: 0 },
    message: null,
    success: true,
  })),
  createContact: vi.fn(async () => ({
    success: true,
    data: { id: "c1", full_name: "New Contact", type: "owner" },
    message: null,
  })),
  linkAssetContact: vi.fn(async () => undefined),
  unlinkAssetContact: vi.fn(async () => undefined),
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
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
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

vi.mock("@/features/map/PropertyMapLazy", () => ({
  PropertyMap: ({
    assets,
    placement,
    onPlace,
  }: {
    assets: Array<{ id: string; name: string; latitude?: number | null; longitude?: number | null }>;
    placement: { latitude: number; longitude: number } | null;
    onPlace?: (coords: { latitude: number; longitude: number }) => void;
  }) => {
    const showPlace = typeof onPlace === "function";
    return (
      <div
      data-testid="property-map"
      data-placed-count={
        assets.filter(
          (a) => typeof a.latitude === "number" && typeof a.longitude === "number",
        ).length
      }
    >
      {showPlace ? (
        <button
          type="button"
          data-testid="place-at-bali"
          onClick={() => onPlace?.({ latitude: -8.82, longitude: 115.16 })}
        >
          Place at Bali coords
        </button>
      ) : null}
      <span data-testid="map-assets">{assets.map((asset) => asset.name).join(", ")}</span>
      {placement ? (
        <span data-testid="placement">
          {placement.latitude},{placement.longitude}
        </span>
      ) : null}
    </div>
    );
  },
}));

vi.mock("@/features/workspace/InteractiveCanvas", () => ({
  InteractiveCanvas: () => null,
}));
// (real-map mock declared above via PropertyMapLazy)

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
  await screen.findByTestId("property-map");
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
        metadata: { capacity: 6, placed: 4 },
        latitude: -8.815,
        longitude: 115.088,
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
      screen.getByText("No development selected"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Map" }),
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
      expect.objectContaining({
        project_id: "p1",
        search: undefined,
        status_slugs: undefined,
        type_slugs: undefined,
        limit: 100,
      }),
      false,
    );
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("renders the map/list workspace but no KPI cards", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    const mapButton = screen.getByRole("button", { name: "Map" });
    const listButton = screen.getByRole("button", { name: "List" });
    expect(mapButton).toHaveAttribute("aria-pressed", "true");
    expect(listButton).toHaveAttribute("aria-pressed", "false");

    expect(screen.queryByText("Placed (OPS)")).not.toBeInTheDocument();
    expect(screen.queryByText("Villa Capacity")).not.toBeInTheDocument();
    expect(screen.queryByText("Status Distribution")).not.toBeInTheDocument();
  });

  it("shows the select prompt instead of the first asset when the details panel opens without a selection", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    expect(
      screen.getByText("Select a property on the map or list to inspect details."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Villa A1" })).not.toBeInTheDocument();
  });

  it("switches to the villa list table view", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    const listButton = screen.getByRole("button", { name: "List" });
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

    await user.click(screen.getByRole("button", { name: "Add property" }));
    expect(screen.getByLabelText("New property")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Property name *"), "Villa B2");
    await user.type(screen.getByLabelText("Capacity (max pax)"), "8");
    await user.type(screen.getByLabelText("Placed (pax)"), "3");
    await user.click(screen.getByRole("button", { name: "Place at Bali coords" }));

    expect(screen.getByTestId("placement")).toHaveTextContent("-8.82,115.16");
    expect(screen.getByLabelText("Latitude")).toHaveValue("-8.82");
    expect(screen.getByLabelText("Longitude")).toHaveValue("115.16");

    const summaryCallsBefore = mockedGetSummary.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Create Property" }));

    expect(mockedCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Villa B2",
        project_id: "p1",
        latitude: -8.82,
        longitude: 115.16,
        metadata: expect.objectContaining({
          capacity: 8,
          placed: 3,
        }),
      }),
    );
    const createdPayload = mockedCreateAsset.mock.calls[0][0];
    expect(createdPayload.metadata).not.toHaveProperty("map_x");
    expect(createdPayload.metadata).not.toHaveProperty("map_y");

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
    expect(screen.queryByRole("button", { name: "Create Property" })).not.toBeInTheDocument();
  });

  it("supports manual latitude/longitude entry as an advanced fallback", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "Add property" }));
    await user.type(screen.getByLabelText("Property name *"), "Villa C3");
    // Advanced coordinates section
    const latInput = screen.getByLabelText("Latitude");
    const lngInput = screen.getByLabelText("Longitude");
    await user.type(latInput, "-8.75");
    await user.type(lngInput, "115.2");
    await user.click(screen.getByRole("button", { name: "Create Property" }));

    expect(mockedCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Villa C3",
        latitude: -8.75,
        longitude: 115.2,
        metadata: expect.not.objectContaining({
          map_x: expect.anything(),
          map_y: expect.anything(),
        }),
      }),
    );
  });

  it("edits the selected villa and reflects updated values", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByText("Villa A1"));
    expect(screen.getByLabelText("Property details")).toBeInTheDocument();

    const editButton = await screen.findByRole("button", {
      name: "Edit",
    });
    await user.click(editButton);
    expect(screen.getByLabelText("Edit property")).toBeInTheDocument();

    const nameInput = screen.getByLabelText("Property name *");
    expect(nameInput).toHaveValue("Villa A1");
    await user.clear(nameInput);
    await user.type(nameInput, "Villa A1 Renovated");
    const capacityInput = screen.getByLabelText("Capacity (max pax)");
    await user.clear(capacityInput);
    await user.type(capacityInput, "10");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mockedUpdateAsset).toHaveBeenCalledWith(
      "a1",
      expect.objectContaining({
        name: "Villa A1 Renovated",
        // Edit always sends explicit placement state (preserved here).
        latitude: -8.815,
        longitude: 115.088,
        metadata: expect.objectContaining({
          capacity: 10,
        }),
      }),
    );
    const updatePayload = mockedUpdateAsset.mock.calls[0][1];
    expect(updatePayload.metadata).not.toHaveProperty("map_x");
    expect(updatePayload.metadata).not.toHaveProperty("map_y");

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

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByText("Villa A1"));

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

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByText("Villa A1"));

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

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByRole("button", { name: "Open details panel" }));
    expect(screen.getByLabelText("Property details")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Add property" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("keeps unplaced properties out of fake coordinates and does not focus the map for them", async () => {
    const user = userEvent.setup();
    assetState.rows.push({
      ...assetState.rows[0],
      id: "a2",
      name: "Villa Unplaced",
      code: "U1",
      latitude: null,
      longitude: null,
    });
    renderWorkspace();
    await openWorkspace(user);

    // Only the placed property counts on the real map.
    expect(screen.getByTestId("property-map")).toHaveAttribute(
      "data-placed-count",
      "1",
    );

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByText("Villa Unplaced"));

    // Selecting an unplaced property must NOT switch/focus the map…
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // …but it still opens the preview panel.
    expect(await screen.findByLabelText("Property details")).toBeInTheDocument();
  });

  it("reflects placed count and disables Fit when nothing is placed", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    const fit = screen.getByRole("button", { name: /Fit properties/ });
    expect(fit).toBeEnabled();
    expect(fit).toHaveTextContent("Fit properties (1)");

    // Remove all placements → Fit disabled, no markers rendered.
    mockedUpdateAsset.mockClear();
    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByText("Villa A1"));
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Remove placement" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mockedUpdateAsset).toHaveBeenCalledWith(
      "a1",
      expect.objectContaining({ latitude: null, longitude: null }),
    );
  });

  it("keeps the workspace read-only in demo mode", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByText("Villa A1"));
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    await waitFor(() => {
      expect(mockedListAssets).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: undefined }),
        true,
      );
    });

    expect(screen.queryByRole("button", { name: "Add property" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("preserves existing selection behavior via the info panel", async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await openWorkspace(user);

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByText("Villa A1"));

    expect(screen.getByLabelText("Property details")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Villa A1" })).toBeInTheDocument();
    expect(screen.getAllByText("Capacity").length).toBeGreaterThan(0);

    const closeButton = screen.getByRole("button", { name: "Collapse panel" });
    await user.click(closeButton);
    expect(screen.queryByLabelText("Property details")).not.toBeInTheDocument();
  });
});