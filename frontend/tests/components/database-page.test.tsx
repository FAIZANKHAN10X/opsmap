// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { UserRole } from "@/types/domain";

const { dataState } = vi.hoisted(() => {
  const assets = [
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
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      created_by: null,
      updated_by: null,
    },
    {
      id: "a2",
      project_id: "p1",
      asset_type_id: "t1",
      asset_status_id: "s1",
      name: "Villa A2",
      code: "A2",
      description: null,
      owner: null,
      notes: null,
      assignees: [],
      metadata: { capacity: 4, placed: 2 },
      created_at: "2026-08-02T00:00:00Z",
      updated_at: "2026-08-02T00:00:00Z",
      created_by: null,
      updated_by: null,
    },
  ];
  const contacts = [
    {
      id: "c1",
      type: "owner",
      full_name: "Made Wijaya",
      company: "Bali Villas",
      email: "made@example.com",
      phone: "+62 812 0000 0000",
      whatsapp: null,
      notes: null,
      created_at: "2026-08-03T00:00:00Z",
      updated_at: "2026-08-03T00:00:00Z",
      created_by: null,
      updated_by: null,
      properties: [
        { asset_id: "a1", asset_name: "Villa A1", role: "owner", project_id: "p1" },
      ],
    },
  ];
  const documents = [
    {
      id: "d1",
      asset_id: "a1",
      name: "Sales Contract",
      filename: "contract.pdf",
      mime_type: "application/pdf",
      size_bytes: 2048,
      storage_path: "assets/a1/documents/contract.pdf",
      category: "contract",
      notes: null,
      created_at: "2026-08-04T00:00:00Z",
      updated_at: "2026-08-04T00:00:00Z",
      is_previewable: true,
      has_file: true,
      has_thumbnail: false,
    },
    {
      id: "d2",
      asset_id: "a1",
      name: "Hero Shot",
      filename: "hero.jpg",
      mime_type: "image/jpeg",
      size_bytes: 4096,
      storage_path: "assets/a1/documents/hero.jpg",
      category: "image",
      notes: null,
      created_at: "2026-08-05T00:00:00Z",
      updated_at: "2026-08-05T00:00:00Z",
      is_previewable: true,
      has_file: true,
      has_thumbnail: true,
    },
  ];
  return { dataState: { assets, contacts, documents } };
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
  listAssets: vi.fn(async (_params: unknown, demo = false) => ({
    data: demo ? [] : dataState.assets,
    pagination: { page: 1, limit: 100, total: dataState.assets.length, total_pages: 1 },
    message: null,
    success: true,
  })),
  createAsset: vi.fn(async () => ({ success: true, data: null, message: null })),
  updateAsset: vi.fn(async () => ({ success: true, data: null, message: null })),
  deleteAsset: vi.fn(async () => ({ success: true, data: null, message: null })),
}));

vi.mock("@/services/contacts", () => ({
  listContacts: vi.fn(async () => ({
    data: dataState.contacts,
    pagination: { page: 1, limit: 100, total: dataState.contacts.length, total_pages: 1 },
    message: null,
    success: true,
  })),
}));

vi.mock("@/services/documents", () => ({
  listDocuments: vi.fn(async (params?: { category?: string }) => {
    const data =
      params?.category === "image"
        ? dataState.documents.filter((d) => d.category === "image")
        : dataState.documents;
    return {
      data,
      pagination: { page: 1, limit: 100, total: data.length, total_pages: 1 },
      message: null,
      success: true,
    };
  }),
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

import { DatabasePage } from "@/features/database/DatabasePage";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { UserProvider } from "@/stores/user-context";
import { ToastProvider } from "@/stores/toast-context";

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
      <DatabasePage />
    </>
  );
}

function renderDatabase(role: UserRole = "manager") {
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

describe("DatabasePage (DATABASE, /dashboard/database)", () => {
  beforeEach(() => {
    dataState.assets[0].updated_at = "2026-08-01T00:00:00Z";
    dataState.assets[1].updated_at = "2026-08-02T00:00:00Z";
    dataState.contacts[0].updated_at = "2026-08-03T00:00:00Z";
    dataState.documents[0].updated_at = "2026-08-04T00:00:00Z";
    dataState.documents[1].updated_at = "2026-08-05T00:00:00Z";
    vi.clearAllMocks();
  });

  it("renders the five record-type tabs and defaults to Properties", async () => {
    const user = userEvent.setup();
    renderDatabase();
    await openDatabase(user);

    expect(screen.getByRole("tab", { name: /Properties/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Contacts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Documents/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Media/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Activity/i })).toBeInTheDocument();
    expect(screen.getByText("Villa A1")).toBeInTheDocument();
  });

  it("browses contacts and opens the canonical contact detail route", async () => {
    const user = userEvent.setup();
    renderDatabase();
    await openDatabase(user);

    await user.click(screen.getByRole("tab", { name: /Contacts/i }));
    await screen.findByText("Made Wijaya");

    expect(screen.getAllByText("Owner").length).toBeGreaterThan(0);
    expect(screen.getByText("Bali Villas")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // linked property count

    const link = screen.getByRole("link", { name: /Made Wijaya/ });
    expect(link).toHaveAttribute("href", "/dashboard/contacts/c1");
  });

  it("browses documents and links to the owning property route", async () => {
    const user = userEvent.setup();
    renderDatabase();
    await openDatabase(user);

    await user.click(screen.getByRole("tab", { name: /Documents/i }));
    await screen.findByText("Sales Contract");

    const propLink = screen.getAllByRole("link", { name: /Villa A1/ })[0];
    expect(propLink).toHaveAttribute("href", "/dashboard/properties/a1");

    // Preview reuses the existing modal
    await user.click(screen.getAllByRole("button", { name: /^Preview$/ })[0]);
    expect(
      screen.getByRole("dialog", { name: "Preview Sales Contract" }),
    ).toBeInTheDocument();
  });

  it("browses property media from the document store and links to the property", async () => {
    const user = userEvent.setup();
    renderDatabase();
    await openDatabase(user);

    await user.click(screen.getByRole("tab", { name: /Media/i }));
    await screen.findByText("Hero Shot");

    const propLink = screen.getByRole("link", { name: /Villa A1/ });
    expect(propLink).toHaveAttribute("href", "/dashboard/properties/a1");
  });

  it("shows a read-only recent-activity timeline ordered by updated_at", async () => {
    const user = userEvent.setup();
    renderDatabase();
    await openDatabase(user);

    await user.click(screen.getByRole("tab", { name: /Activity/i }));
    await screen.findByText("Sales Contract");

    const entries = screen.getAllByRole("link");
    const texts = entries.map((e) => e.textContent ?? "");
    expect(texts.some((t) => t.includes("Hero Shot"))).toBe(true);
    expect(texts.some((t) => t.includes("Made Wijaya"))).toBe(true);
    expect(texts.some((t) => t.includes("Villa A2"))).toBe(true);

    // Newest first: Hero Shot (Aug 05) above Sales Contract (Aug 04)
    const heroIdx = texts.findIndex((t) => t.includes("Hero Shot"));
    const contractIdx = texts.findIndex((t) => t.includes("Sales Contract"));
    expect(heroIdx).toBeGreaterThan(-1);
    expect(contractIdx).toBeGreaterThan(-1);
    expect(heroIdx).toBeLessThan(contractIdx);
  });

  it("keeps every DATABASE tab read-only in demo mode", async () => {
    const user = userEvent.setup();
    renderDatabase();
    await openDatabase(user);

    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    await waitFor(() => {
      expect(screen.getByText(/Demo Mode is read-only/)).toBeInTheDocument();
    });

    // Properties tab: no create surface.
    expect(
      screen.queryByRole("button", { name: "Add property" }),
    ).not.toBeInTheDocument();

    // Documents tab in demo: no demo-owned documents → isolated empty state.
    await user.click(screen.getByRole("tab", { name: /Documents/i }));
    await screen.findByText(/The demo dataset has no documents/);

    // Media tab in demo: no demo-owned media → isolated empty state.
    await user.click(screen.getByRole("tab", { name: /Media/i }));
    await screen.findByText(/The demo dataset has no media/);

    // Contacts tab in demo: still browsable (read-only) with demo contacts.
    await user.click(screen.getByRole("tab", { name: /Contacts/i }));
    await screen.findByText("Made Wijaya");
    expect(screen.queryByRole("button", { name: /Create/i })).not.toBeInTheDocument();
  });
});