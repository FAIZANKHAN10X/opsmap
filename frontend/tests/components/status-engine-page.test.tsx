// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { UserRole } from "@/types/domain";

const { statusState } = vi.hoisted(() => {
  const status = {
    id: "s1",
    name: "Available",
    slug: "available",
    description: null,
    color: "#22c55e",
    sort_order: 1,
    created_at: "",
    updated_at: "",
  };
  return { statusState: { rows: [status] } };
});

vi.mock("@/services/asset-statuses", () => ({
  listAssetStatuses: vi.fn(async () => ({
    data: statusState.rows,
    pagination: { page: 1, limit: 100, total: statusState.rows.length, total_pages: 1 },
    message: null,
    success: true,
  })),
  createAssetStatus: vi.fn(async () => ({ success: true, data: null, message: null })),
  updateAssetStatus: vi.fn(async () => ({ success: true, data: null, message: null })),
  deleteAssetStatus: vi.fn(async () => ({ success: true, data: null, message: null })),
  seedDefaultStatuses: vi.fn(async () => ({
    data: statusState.rows,
    pagination: { page: 1, limit: 100, total: statusState.rows.length, total_pages: 1 },
    message: null,
    success: true,
  })),
}));

import {
  createAssetStatus,
  deleteAssetStatus,
  seedDefaultStatuses,
  updateAssetStatus,
} from "@/services/asset-statuses";
import { StatusEnginePage } from "@/features/status/StatusEnginePage";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { UserProvider } from "@/stores/user-context";
import { ToastProvider } from "@/stores/toast-context";

const mockedCreate = vi.mocked(createAssetStatus);
const mockedUpdate = vi.mocked(updateAssetStatus);
const mockedDelete = vi.mocked(deleteAssetStatus);
const mockedSeed = vi.mocked(seedDefaultStatuses);

function Harness() {
  const { setDemoMode } = useShell();
  return (
    <>
      <button type="button" onClick={() => setDemoMode(true)}>
        Enable demo mode
      </button>
      <StatusEnginePage />
    </>
  );
}

function renderStatusEngine(role: UserRole = "admin") {
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

describe("StatusEnginePage (Settings)", () => {
  beforeEach(() => {
    statusState.rows = [
      {
        id: "s1",
        name: "Available",
        slug: "available",
        description: null,
        color: "#22c55e",
        sort_order: 1,
        created_at: "",
        updated_at: "",
      },
    ];
    vi.clearAllMocks();
  });

  it("shows create/edit/delete/seed controls outside demo mode", async () => {
    renderStatusEngine();
    await screen.findAllByText("Available");

    expect(
      screen.getByRole("button", { name: "Seed defaults" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New status" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("keeps the Status Engine read-only in demo mode", async () => {
    const user = userEvent.setup();
    renderStatusEngine();
    await screen.findAllByText("Available");

    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    await waitFor(() => {
      expect(
        screen.getAllByText("Demo Mode is read-only").length,
      ).toBeGreaterThanOrEqual(1);
    });

    expect(
      screen.queryByRole("button", { name: "Seed defaults" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "New status" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(mockedSeed).not.toHaveBeenCalled();
  });

  it("offers seed defaults from the empty state outside demo mode", async () => {
    statusState.rows = [];
    renderStatusEngine();
    await screen.findByText("NO STATUSES");

    expect(
      screen.getAllByRole("button", { name: "Seed defaults" }),
    ).toHaveLength(2);
  });

  it("hides the empty-state seed action in demo mode", async () => {
    const user = userEvent.setup();
    statusState.rows = [];
    renderStatusEngine();
    await screen.findByText("NO STATUSES");

    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    await waitFor(() => {
      expect(
        screen.queryAllByRole("button", { name: "Seed defaults" }),
      ).toHaveLength(0);
    });
    expect(
      screen.getAllByText(/Demo Mode is read-only/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(mockedSeed).not.toHaveBeenCalled();
  });

  it("still supports authorized mutations in real mode", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderStatusEngine();
    await screen.findAllByText("Available");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith("s1");
    });

    await user.click(screen.getByRole("button", { name: "New status" }));
    await user.type(screen.getByLabelText(/Name \*/), "Offline");
    await user.click(screen.getByRole("button", { name: "Save status" }));
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Offline", slug: "offline" }),
      );
    });
    confirmSpy.mockRestore();
  });
});