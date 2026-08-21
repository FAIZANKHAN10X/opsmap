// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Asset, UserRole } from "@/types/domain";

const state = vi.hoisted(() => {
  const docs: Array<{
    id: string;
    asset_id: string;
    name: string;
    filename: string;
    mime_type: string;
    category: string;
    has_file: boolean;
    has_thumbnail: boolean;
    is_previewable: boolean;
  }> = [];
  return { docs };
});

vi.mock("@/services/documents", () => ({
  listAssetDocuments: vi.fn(async (assetId: string) => ({
    success: true,
    data: state.docs.map((d) => ({ ...d, asset_id: assetId })),
    pagination: { page: 1, limit: 100, total: state.docs.length, pages: 1 },
    message: null,
  })),
  uploadDocument: vi.fn(
    async (input: { asset_id: string; file: File; category?: string }) => {
      const doc = {
        id: `img${state.docs.length + 1}`,
        asset_id: input.asset_id,
        name: input.file.name.replace(/\.[^.]+$/, ""),
        filename: input.file.name,
        mime_type: input.file.type,
        category: input.category ?? "image",
        has_file: true,
        has_thumbnail: false,
        is_previewable: true,
      };
      state.docs.push(doc);
      return { success: true, data: doc, message: null };
    },
  ),
  deleteDocument: vi.fn(async (id: string) => {
    state.docs = state.docs.filter((d) => d.id !== id);
  }),
  getDocumentThumbnailUrl: vi.fn(() => null),
  getDocumentObjectUrl: vi.fn(() => null),
  downloadDocumentClient: vi.fn(),
}));

vi.mock("@/services/assets", () => ({
  updateAsset: vi.fn(async () => ({ success: true, data: {}, message: null })),
}));

import { AssetMedia } from "@/features/assets/AssetMedia";
import { updateAsset } from "@/services/assets";
import { deleteDocument, uploadDocument } from "@/services/documents";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { UserProvider } from "@/stores/user-context";

const mockedUpdate = vi.mocked(updateAsset);
const mockedUpload = vi.mocked(uploadDocument);
const mockedDelete = vi.mocked(deleteDocument);

const asset: Asset = {
  id: "a1",
  project_id: "p1",
  asset_type_id: null,
  asset_status_id: null,
  name: "Villa A1",
  code: "A1",
  description: null,
  owner: null,
  notes: null,
  assignees: [],
  metadata: {},
  latitude: null,
  longitude: null,
  created_at: "",
  updated_at: "",
  created_by: null,
  updated_by: null,
};

function Harness({ role = "manager" }: { role?: UserRole }) {
  const { setDemoMode } = useShell();
  return (
    <UserProvider user={{ email: "owner@opsmap.app", fullName: null, role }}>
      <button type="button" onClick={() => setDemoMode(true)}>
        Enable demo
      </button>
      <AssetMedia asset={asset} />
    </UserProvider>
  );
}

function renderMedia(role: UserRole = "manager") {
  return render(
    <ShellProvider>
      <Harness role={role} />
    </ShellProvider>,
  );
}

describe("AssetMedia", () => {
  beforeEach(() => {
    state.docs = [];
    mockedUpdate.mockClear();
    mockedUpload.mockClear();
    mockedDelete.mockClear();
  });

  it("uploads an image, associates it with the property, and sets it as cover when none exists", async () => {
    const user = userEvent.setup();
    const view = renderMedia();
    expect(await screen.findByText("No photos yet")).toBeInTheDocument();

    const fileInput = view.container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["png-bytes"], "villa-photo.png", { type: "image/png" });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockedUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          asset_id: "a1",
          category: "image",
        }),
      );
    });

    expect(await screen.findByRole("img", { name: "villa-photo" })).toBeInTheDocument();
    expect(mockedUpdate).toHaveBeenCalledWith(
      "a1",
      expect.objectContaining({
        metadata: expect.objectContaining({ cover_document_id: "img1" }),
      }),
    );
  });

  it("removes uploaded media", async () => {
    state.docs.push({
      id: "img1",
      asset_id: "a1",
      name: "hero",
      filename: "hero.png",
      mime_type: "image/png",
      category: "image",
      has_file: true,
      has_thumbnail: true,
      is_previewable: true,
    });
    const user = userEvent.setup();
    renderMedia();
    expect(await screen.findByRole("img", { name: "hero" })).toBeInTheDocument();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Delete hero" }));
    expect(mockedDelete).toHaveBeenCalledWith("img1");
    await waitFor(() => {
      expect(screen.queryByRole("img", { name: "hero" })).not.toBeInTheDocument();
    });
  });

  it("stays read-only in Demo Mode", async () => {
    state.docs.push({
      id: "img1",
      asset_id: "a1",
      name: "hero",
      filename: "hero.png",
      mime_type: "image/png",
      category: "image",
      has_file: true,
      has_thumbnail: true,
      is_previewable: true,
    });
    const user = userEvent.setup();
    renderMedia();
    expect(await screen.findByRole("img", { name: "hero" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enable demo" }));
    expect(screen.queryByRole("button", { name: "Upload" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete hero" })).not.toBeInTheDocument();
  });
});
