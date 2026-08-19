// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { UserRole } from "@/types/domain";

const { assetState } = vi.hoisted(() => {
  const asset = {
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
  return { assetState: { rows: [asset] } };
});

vi.mock("@/services/dashboard", () => ({
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
    data: assetState.rows,
    pagination: { page: 1, limit: 100, total: assetState.rows.length, total_pages: 1 },
    message: null,
    success: true,
  })),
  createAsset: vi.fn(async () => ({ success: true, data: null, message: null })),
  updateAsset: vi.fn(async () => ({ success: true, data: null, message: null })),
  deleteAsset: vi.fn(async () => ({ success: true, data: null, message: null })),
}));

vi.mock("@/services/documents", () => ({
  listAssetDocuments: vi.fn(async () => ({
    data: [],
    pagination: { page: 1, limit: 25, total: 0, pages: 0 },
    message: null,
    success: true,
  })),
  uploadDocument: vi.fn(async () => ({ success: true, data: null, message: null })),
  deleteDocument: vi.fn(async () => ({ success: true, data: null, message: null })),
  downloadDocumentClient: vi.fn(),
  getDocumentObjectUrl: vi.fn(() => null),
  getDocumentThumbnailUrl: vi.fn(() => null),
}));

import { createAsset, deleteAsset, listAssets, updateAsset } from "@/services/assets";
import { AssetsPage } from "@/features/assets/AssetsPage";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { UserProvider } from "@/stores/user-context";
import { ToastProvider } from "@/stores/toast-context";

const mockedListAssets = vi.mocked(listAssets);
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
      <AssetsPage />
    </>
  );
}

function renderDatabase(role: UserRole = "admin") {
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

async function openDatabase(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Select project" }));
  await screen.findByText("Villa A1");
}

describe("AssetsPage (DATABASE, /dashboard/database)", () => {
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
        created_at: "",
        updated_at: "",
        created_by: null,
        updated_by: null,
      },
    ];
    vi.clearAllMocks();
  });

  it("prompts for a project selection when none is active and demo is off", () => {
    renderDatabase();
    expect(
      screen.getByText("Select a development to inspect property records."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add property" })).not.toBeInTheDocument();
  });

  it("loads real assets and exposes create/edit/delete controls outside demo", async () => {
    const user = userEvent.setup();
    renderDatabase();
    await openDatabase(user);

    expect(mockedListAssets).toHaveBeenCalledWith(
      { project_id: "p1", search: undefined, limit: 100 },
      false,
    );
    expect(
      screen.getByRole("button", { name: "Add property" }),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Villa A1"));
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("keeps the database read-only in demo mode", async () => {
    const user = userEvent.setup();
    renderDatabase();
    await openDatabase(user);

    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    await waitFor(() => {
      expect(mockedListAssets).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: undefined }),
        true,
      );
    });

    expect(
      screen.getByText(/Demo Mode is read-only/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add property" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByText("Villa A1"));
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByText("Demo Mode is read-only")).toBeInTheDocument();

    expect(mockedCreateAsset).not.toHaveBeenCalled();
    expect(mockedUpdateAsset).not.toHaveBeenCalled();
    expect(mockedDeleteAsset).not.toHaveBeenCalled();
  });

  it("renders the demo dataset even without a selected project", async () => {
    const user = userEvent.setup();
    renderDatabase();

    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    await screen.findByText("Villa A1");

    expect(mockedListAssets).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: undefined }),
      true,
    );
    expect(screen.queryByRole("button", { name: "Add property" })).not.toBeInTheDocument();
  });
});