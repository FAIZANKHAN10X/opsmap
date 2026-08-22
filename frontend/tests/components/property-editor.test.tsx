// @vitest-environment jsdom
vi.mock("server-only", () => ({}));
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/map/PropertyMapLazy", () => ({
  PropertyMap: () => <div data-testid="property-map">Map</div>,
}));

vi.mock("@/services/documents", () => ({
  listAssetDocuments: vi.fn(async () => ({ data: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 }, message: null, success: true })),
  uploadDocument: vi.fn(async () => ({ success: true, data: { id: "doc1" }, message: null })),
  deleteDocument: vi.fn(async () => undefined),
}));
vi.mock("@/services/contacts", () => ({
  listContacts: vi.fn(async () => ({ data: [], pagination: { page: 1, limit: 8, total: 0, pages: 0 }, message: null, success: true })),
  listAssetContacts: vi.fn(async () => ({ data: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 }, message: null, success: true })),
  createContact: vi.fn(async () => ({ success: true, data: { id: "c1", full_name: "Test" }, message: null })),
  linkAssetContact: vi.fn(async () => undefined),
  unlinkAssetContact: vi.fn(async () => undefined),
}));
vi.mock("@/services/assets", () => ({
  createAsset: vi.fn(async () => ({ success: true, data: { id: "new-id" }, message: null })),
  updateAsset: vi.fn(async () => ({ success: true, data: { id: "a1" }, message: null })),
}));

import { PropertyEditor } from "@/features/assets/PropertyEditor";
import { ShellProvider } from "@/stores/shell-context";
import { ToastProvider } from "@/stores/toast-context";
import { UserProvider } from "@/stores/user-context";
import type { AssetStatus, AssetType } from "@/types/domain";

const types: AssetType[] = [{ id: "t1", name: "Villa", slug: "villa", description: null, sort_order: 1, created_at: "", updated_at: "" }];
const statuses: AssetStatus[] = [{ id: "s1", name: "Available", slug: "available", color: "#22c55e", description: null, sort_order: 1, created_at: "", updated_at: "" }];

function renderEditor(mode: "create" | "edit" = "create") {
  return render(
    <UserProvider user={{ email: "test@example.com", fullName: "Test", role: "admin" }}>
      <ToastProvider>
        <ShellProvider>
          <PropertyEditor mode={mode} projectId="p1" types={types} statuses={statuses} onClose={() => {}} />
        </ShellProvider>
      </ToastProvider>
    </UserProvider>,
  );
}

describe("PropertyEditor", () => {
  it("renders all 9 sections with anchor nav", () => {
    renderEditor();
    expect(screen.getByRole("heading", { name: "Basics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Features & Amenities" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Commercial" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Location" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Photos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contacts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Operations" })).toBeInTheDocument();
    // Anchor nav
    expect(screen.getByRole("button", { name: "Basics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Location" })).toBeInTheDocument();
  });

  it("shows validation for required name", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Create Property" }));
    expect(await screen.findByText("Property name is required.")).toBeInTheDocument();
  });

  it("embeds Google Map in Location section", () => {
    renderEditor();
    expect(screen.getByTestId("property-map")).toBeInTheDocument();
  });

  it("supports multi-image selection label", () => {
    renderEditor();
    expect(screen.getByText(/Add photos/)).toBeInTheDocument();
  });

  it("exposes contacts search and quick-create", () => {
    renderEditor();
    expect(screen.getByPlaceholderText("Search contacts…")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
  });
});
