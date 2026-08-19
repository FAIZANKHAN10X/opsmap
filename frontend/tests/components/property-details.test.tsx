// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/services/assets", () => ({
  getAsset: vi.fn(async () => ({
    success: true,
    data: {
      id: "a1",
      project_id: "p1",
      asset_type_id: "t1",
      asset_status_id: "s1",
      name: "Villa A1",
      code: "A1",
      description: "Ocean view",
      owner: "Ops",
      notes: null,
      assignees: [],
      metadata: { capacity: 6, placed: 4, map_x: 120, map_y: 80, address: "Uluwatu" },
      created_at: "",
      updated_at: "",
      created_by: null,
      updated_by: null,
    },
    message: null,
  })),
  updateAsset: vi.fn(async () => ({ success: true, data: {}, message: null })),
  deleteAsset: vi.fn(async () => ({ success: true, data: null, message: null })),
}));

vi.mock("@/services/dashboard", () => ({
  listAssetStatuses: vi.fn(async () => ({
    success: true,
    data: [
      { id: "s1", name: "Available", slug: "available", color: "#22c55e", description: null, sort_order: 1, created_at: "", updated_at: "" },
    ],
    pagination: { page: 1, limit: 25, total: 1, pages: 1 },
    message: null,
  })),
}));

vi.mock("@/services/asset-types", () => ({
  listAssetTypes: vi.fn(async () => ({
    success: true,
    data: [
      { id: "t1", name: "Villa", slug: "villa", description: null, sort_order: 1, created_at: "", updated_at: "" },
    ],
    pagination: { page: 1, limit: 25, total: 1, pages: 1 },
    message: null,
  })),
}));

vi.mock("@/services/documents", () => ({
  listAssetDocuments: vi.fn(async () => ({
    success: true,
    data: [],
    pagination: { page: 1, limit: 25, total: 0, pages: 0 },
    message: null,
  })),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  downloadDocumentClient: vi.fn(),
  getDocumentObjectUrl: vi.fn(() => null),
  getDocumentThumbnailUrl: vi.fn(() => null),
}));

import { PropertyDetailsPage } from "@/features/properties/PropertyDetailsPage";
import { updateAsset } from "@/services/assets";
import { ShellProvider } from "@/stores/shell-context";
import { ToastProvider } from "@/stores/toast-context";
import { UserProvider } from "@/stores/user-context";

const mockedUpdate = vi.mocked(updateAsset);

function renderDetails() {
  return render(
    <UserProvider user={{ email: "owner@opsmap.app", fullName: null, role: "manager" }}>
      <ShellProvider>
        <ToastProvider>
          <PropertyDetailsPage assetId="a1" />
        </ToastProvider>
      </ShellProvider>
    </UserProvider>,
  );
}

describe("PropertyDetailsPage", () => {
  it("loads persisted property data and is a management workspace, not a dashboard clone", async () => {
    renderDetails();
    expect(await screen.findByRole("heading", { name: "Villa A1" })).toBeInTheDocument();
    expect(screen.getByText("Back to properties")).toBeInTheDocument();
    expect(screen.getByText("Uluwatu")).toBeInTheDocument();
    expect(screen.getByText("On the plan")).toBeInTheDocument();
    expect(screen.getByText("Photos")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit property" })).toBeInTheDocument();
    expect(screen.queryByText("Placed (OPS)")).not.toBeInTheDocument();
  });

  it("edits configuration through the property form and persists it", async () => {
    const user = userEvent.setup();
    renderDetails();
    await screen.findByRole("heading", { name: "Villa A1" });
    await user.click(screen.getByRole("button", { name: "Edit property" }));

    const name = screen.getByLabelText("Name *");
    await user.clear(name);
    await user.type(name, "Villa A1 Renamed");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mockedUpdate).toHaveBeenCalledWith(
      "a1",
      expect.objectContaining({ name: "Villa A1 Renamed" }),
    );
  });
});
