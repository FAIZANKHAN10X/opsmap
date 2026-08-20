// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { UserRole } from "@/types/domain";

const { docState, assetState } = vi.hoisted(() => {
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
    metadata: {},
    created_at: "",
    updated_at: "",
    created_by: null,
    updated_by: null,
  };
  const doc = {
    id: "d1",
    asset_id: "a1",
    name: "Site Plan",
    filename: "site-plan.pdf",
    mime_type: "application/pdf",
    size_bytes: 2048,
    storage_path: null,
    category: "report",
    notes: null,
    created_at: "",
    updated_at: "",
    created_by: null,
    updated_by: null,
  };
  return { docState: { rows: [doc] }, assetState: { rows: [asset] } };
});

vi.mock("@/services/documents", () => ({
  listDocuments: vi.fn(async () => ({
    data: docState.rows,
    pagination: { page: 1, limit: 100, total: docState.rows.length, total_pages: 1 },
    message: null,
    success: true,
  })),
  uploadDocument: vi.fn(async () => ({ success: true, data: null, message: null })),
  deleteDocument: vi.fn(async () => ({ success: true, data: null, message: null })),
  downloadDocumentClient: vi.fn(),
  getDocumentObjectUrl: vi.fn(() => null),
  getDocumentThumbnailUrl: vi.fn(() => null),
}));

vi.mock("@/services/assets", () => ({
  listAssets: vi.fn(async () => ({
    data: assetState.rows,
    pagination: { page: 1, limit: 100, total: assetState.rows.length, total_pages: 1 },
    message: null,
    success: true,
  })),
}));

vi.mock("@/features/documents/DocumentPreviewModal", () => ({
  DocumentPreviewModal: () => <div>Preview modal</div>,
}));

import {
  deleteDocument,
  uploadDocument,
} from "@/services/documents";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { UserProvider } from "@/stores/user-context";
import { ToastProvider } from "@/stores/toast-context";

const mockedUpload = vi.mocked(uploadDocument);
const mockedDelete = vi.mocked(deleteDocument);

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
      <DocumentsPage />
    </>
  );
}

function renderDocuments(role: UserRole = "admin") {
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

async function openDocuments(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Select project" }));
  await screen.findByText("Site Plan");
}

describe("DocumentsPage (/dashboard/documents)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prompts for a project selection when none is active", () => {
    renderDocuments();
    expect(
      screen.getByText("Select a project to manage documents."),
    ).toBeInTheDocument();
  });

  it("exposes upload and delete controls outside demo mode", async () => {
    const user = userEvent.setup();
    renderDocuments();
    await openDocuments(user);

    expect(
      screen.getByRole("button", { name: "Upload document" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("keeps documents read-only in demo mode", async () => {
    const user = userEvent.setup();
    renderDocuments();
    await openDocuments(user);

    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    await waitFor(() => {
      expect(
        screen.getByText(
          "Demo Mode is read-only — document uploads and deletes are disabled.",
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "Upload document" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByText("Site Plan")).toBeInTheDocument();

    expect(mockedUpload).not.toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("still supports authorized uploads and deletes in real mode", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    const view = renderDocuments();
    await openDocuments(user);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith("d1");
    });

    const file = new File(["pdf"], "contract.pdf", { type: "application/pdf" });
    const fileInput = view.container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(fileInput, file);
    fireEvent.submit(
      view.container.querySelector("form") as HTMLFormElement,
    );
    await waitFor(() => {
      expect(mockedUpload).toHaveBeenCalledWith(
        expect.objectContaining({ asset_id: "a1" }),
      );
    });
    expect(mockedUpload.mock.calls[0][0].file).toBe(file);
    confirmSpy.mockRestore();
  });
});