// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => {
  const seed = () => [
    {
      id: "d1",
      asset_id: "a1",
      name: "Floor plan",
      filename: "floor-plan.pdf",
      mime_type: "application/pdf",
      size_bytes: 12000,
      storage_path: "assets/a1/documents/d1.pdf",
      thumbnail_path: null,
      resized_path: null,
      category: "report",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      is_previewable: true,
      has_file: true,
      has_thumbnail: false,
    },
  ];
  const docs = seed();
  return { docs, seed };
});

vi.mock("@/services/documents", () => ({
  listAssetDocuments: vi.fn(async (assetId: string) => ({
    success: true,
    data: state.docs.map((d) => ({ ...d, asset_id: assetId })),
    pagination: { page: 1, limit: 25, total: state.docs.length, pages: 1 },
    message: null,
  })),
  uploadDocument: vi.fn(
    async (input: { asset_id: string; file: File; name?: string; category?: string }) => {
      const doc = {
        id: `d${state.docs.length + 1}`,
        asset_id: input.asset_id,
        name: input.name || input.file.name,
        filename: input.file.name,
        mime_type: input.file.type,
        size_bytes: input.file.size,
        storage_path: `assets/${input.asset_id}/documents/dx`,
        thumbnail_path: null,
        resized_path: null,
        category: input.category ?? "other",
        notes: null,
        created_at: "2026-01-02T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        is_previewable: true,
        has_file: true,
        has_thumbnail: false,
      };
      state.docs.push(doc);
      return { success: true, data: doc, message: null };
    },
  ),
  deleteDocument: vi.fn(async (id: string) => {
    state.docs = state.docs.filter((d) => d.id !== id);
  }),
  downloadDocumentClient: vi.fn(),
  getDocumentObjectUrl: vi.fn(() => null),
}));

import { AssetDocuments } from "@/features/assets/AssetDocuments";
import {
  deleteDocument,
  listAssetDocuments,
  uploadDocument,
} from "@/services/documents";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { UserProvider } from "@/stores/user-context";
import type { UserRole } from "@/types/domain";

const mockedList = vi.mocked(listAssetDocuments);
const mockedUpload = vi.mocked(uploadDocument);
const mockedDelete = vi.mocked(deleteDocument);

function Harness() {
  const { setDemoMode } = useShell();
  return (
    <>
      <button type="button" onClick={() => setDemoMode(true)}>
        Enable demo
      </button>
      <AssetDocuments assetId="a1" />
    </>
  );
}

function renderDocuments(role: UserRole = "manager") {
  const view = render(
    <UserProvider
      user={{ email: "owner@opsmap.app", fullName: null, role }}
    >
      <ShellProvider>
        <Harness />
      </ShellProvider>
    </UserProvider>,
  );
  return view;
}

describe("AssetDocuments", () => {
  beforeEach(() => {
    state.docs.length = 0;
    state.docs.push(...state.seed());
    mockedList.mockClear();
    mockedUpload.mockClear();
    mockedDelete.mockClear();
  });

  it("lists the asset's documents", async () => {
    renderDocuments();
    expect(mockedList).toHaveBeenCalledWith("a1");
    expect(await screen.findByText("Floor plan")).toBeInTheDocument();
    expect(screen.getByText(/report · floor-plan\.pdf/)).toBeInTheDocument();
  });

  it("uploads an image/document, persists it, and refreshes the list", async () => {
    const user = userEvent.setup();
    const view = renderDocuments();
    await screen.findByText("Floor plan");

    const fileInput = view.container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["png-bytes"], "villa-photo.png", { type: "image/png" });
    await user.upload(fileInput, file);
    await user.type(
      screen.getByPlaceholderText("Display name (optional)"),
      "Villa photo",
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Upload" }),
      ).not.toBeDisabled();
    });
    fireEvent.submit(
      view.container.querySelector("form") as HTMLFormElement,
    );

    expect(mockedUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_id: "a1",
        name: "Villa photo",
        category: "other",
      }),
    );
    expect(mockedUpload.mock.calls[0][0].file).toBe(file);
    expect(await screen.findByText("Villa photo")).toBeInTheDocument();
    expect(mockedList.mock.calls.length).toBeGreaterThan(1);
  });

  it("deletes a document and removes it from the list", async () => {
    const user = userEvent.setup();
    renderDocuments();
    await screen.findByText("Floor plan");

    await user.click(screen.getByRole("button", { name: "Delete Floor plan" }));

    expect(mockedDelete).toHaveBeenCalledWith("d1");
    await waitFor(() => {
      expect(screen.queryByText("Floor plan")).not.toBeInTheDocument();
    });
  });

  it("viewers can read documents but cannot upload or delete", async () => {
    renderDocuments("viewer");
    await screen.findByText("Floor plan");
    expect(
      screen.queryByRole("button", { name: "Upload" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete Floor plan" }),
    ).not.toBeInTheDocument();
  });

  it("operators can upload but cannot delete", async () => {
    renderDocuments("operator");
    await screen.findByText("Floor plan");
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete Floor plan" }),
    ).not.toBeInTheDocument();
  });

  it("managers can upload and delete", async () => {
    renderDocuments("manager");
    await screen.findByText("Floor plan");
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Floor plan" }),
    ).toBeInTheDocument();
  });

  it("stays read-only in Demo Mode", async () => {
    const user = userEvent.setup();
    renderDocuments();
    await screen.findByText("Floor plan");

    await user.click(screen.getByRole("button", { name: "Enable demo" }));

    expect(
      screen.queryByRole("button", { name: "Upload" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete Floor plan" }),
    ).not.toBeInTheDocument();
  });

  it("shows a clear error when documents fail to load", async () => {
    mockedList.mockRejectedValueOnce(new Error("Failed to load documents."));
    renderDocuments();
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Failed to load documents.");
  });
});