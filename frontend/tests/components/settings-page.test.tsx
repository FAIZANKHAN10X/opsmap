// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { UserRole } from "@/types/domain";

const { projectState } = vi.hoisted(() => {
  const project = {
    id: "p1",
    name: "ULLUWATU \"26",
    slug: "ulluwatu-26",
    description: "16-villa development",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by: null,
    updated_by: null,
  };
  return { projectState: { project } };
});

vi.mock("@/services/projects", () => ({
  getProject: vi.fn(async () => ({
    success: true,
    data: projectState.project,
    message: null,
  })),
  updateProject: vi.fn(async (id: string, input: { name: string; description?: string | null }) => ({
    success: true,
    data: { ...projectState.project, ...input, id },
    message: null,
  })),
  listProjects: vi.fn(async () => ({ success: true, data: [projectState.project], pagination: { page: 1, limit: 100, total: 1, pages: 1 }, message: null })),
  createProject: vi.fn(async () => ({ success: true, data: null, message: null })),
  deleteProject: vi.fn(async () => ({ success: true, data: null, message: null })),
}));

vi.mock("@/services/settings", () => ({
  getSupabaseIntegrationStatus: vi.fn(async () => ({
    configured: true,
    url: "https://abcdefgh.supabase.co",
    configSource: "environment",
    environment: "test",
    database: true,
    storage: true,
    documentsBucket: true,
    auth: true,
    checkedAt: "2026-01-01T00:00:00Z",
  })),
}));

vi.mock("@/services/health", () => ({
  getHealth: vi.fn(async () => ({
    success: true,
    data: {
      status: "ok",
      service: "OpsMap",
      environment: "test",
      supabase: "configured",
      email: "log_only",
    },
    message: null,
  })),
}));

vi.mock("@/services/profiles", () => ({
  listUsers: vi.fn(async () => ({
    success: true,
    data: [
      {
        id: "u1",
        email: "admin@opsmap.app",
        full_name: "Admin User",
        role: "admin",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    pagination: { page: 1, limit: 100, total: 1, pages: 1 },
    message: null,
  })),
  setUserRole: vi.fn(async () => ({ success: true, data: null, message: null })),
}));

vi.mock("@/services/asset-types", () => ({
  listAssetTypes: vi.fn(async () => ({
    success: true,
    data: [{ id: "t1", name: "Villa", slug: "villa", description: null, sort_order: 1, created_at: "", updated_at: "" }],
    pagination: { page: 1, limit: 100, total: 1, pages: 1 },
    message: null,
  })),
  seedDefaultAssetTypes: vi.fn(async () => ({ success: true, data: null, message: null })),
}));

vi.mock("@/services/asset-statuses", () => ({
  listAssetStatuses: vi.fn(async () => ({
    success: true,
    data: [{ id: "s1", name: "Available", slug: "available", description: null, color: "#22c55e", sort_order: 1, created_at: "", updated_at: "" }],
    pagination: { page: 1, limit: 100, total: 1, pages: 1 },
    message: null,
  })),
  createAssetStatus: vi.fn(async () => ({ success: true, data: null, message: null })),
  updateAssetStatus: vi.fn(async () => ({ success: true, data: null, message: null })),
  deleteAssetStatus: vi.fn(async () => ({ success: true, data: null, message: null })),
  seedDefaultStatuses: vi.fn(async () => ({ success: true, data: null, message: null })),
}));

import { updateProject } from "@/services/projects";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { ToastProvider } from "@/stores/toast-context";
import { UserProvider } from "@/stores/user-context";

const mockedUpdateProject = vi.mocked(updateProject);

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
      <SettingsPage />
    </>
  );
}

function renderSettings(role: UserRole = "manager") {
  return render(
    <UserProvider user={{ email: "test@opsmap.app", fullName: "Test User", role }}>
      <ToastProvider>
        <ShellProvider>
          <Harness />
        </ShellProvider>
      </ToastProvider>
    </UserProvider>,
  );
}

async function openGeneral(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Select project" }));
  await screen.findByText("Workspace");
}

describe("SettingsPage (/dashboard/settings)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a read-only banner in demo mode", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));
    expect(
      screen.getAllByText(/Demo Mode is read-only/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders General with the canonical workspace record by default", async () => {
    const user = userEvent.setup();
    renderSettings();
    await openGeneral(user);

    expect(screen.getByLabelText(/Workspace name \*/)).toHaveValue(
      "ULLUWATU \"26",
    );
    expect(screen.getByText("ulluwatu-26")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue(
      "16-villa development",
    );
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("saves workspace edits through updateProject (one source of truth)", async () => {
    const user = userEvent.setup();
    renderSettings();
    await openGeneral(user);

    const nameInput = screen.getByLabelText(/Workspace name \*/) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, "South Bay Residences");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockedUpdateProject).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ name: "South Bay Residences" }),
      );
    });
  });

  it("keeps General read-only for non-managers", async () => {
    const user = userEvent.setup();
    renderSettings("viewer");
    await openGeneral(user);

    expect(screen.getByText("ULLUWATU \"26")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Manager access required to edit/),
    ).toBeInTheDocument();
  });

  it("keeps General read-only in demo mode using the demo workspace", async () => {
    const user = userEvent.setup();
    renderSettings("manager");
    await user.click(screen.getByRole("button", { name: "Enable demo mode" }));

    await screen.findByText("ULLUWATU \"26");
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/Demo Mode is read-only/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("navigates to Users & Access and restricts non-admins", async () => {
    const user = userEvent.setup();
    renderSettings("viewer");
    await user.click(screen.getByRole("button", { name: "Users & Access" }));

    expect(
      screen.getByText("Role management is restricted to administrators."),
    ).toBeInTheDocument();
  });

  it("navigates to Integrations and shows Supabase + WhatsApp slots", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "Integrations" }));

    await screen.findByText("Configured");
    expect(screen.getAllByText("Supabase").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("WhatsApp").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });

  it("opens the Supabase panel with safe status and no secrets", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "Integrations" }));

    const configureButtons = await screen.findAllByRole("button", {
      name: "Configure",
    });
    await user.click(configureButtons[0]);

    expect(
      await screen.findByText("https://abcdefgh.supabase.co"),
    ).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getAllByText("Connected").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/anon key/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/service[_ -]?role/i)).not.toBeInTheDocument();
  });

  it("opens the WhatsApp panel in a Not connected state", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "Integrations" }));

    const configureButtons = await screen.findAllByRole("button", {
      name: "Configure",
    });
    await user.click(configureButtons[1]);

    expect(
      screen.getAllByText("Not connected").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/No WhatsApp integration is connected/),
    ).toBeInTheDocument();
  });

  it("shows Notifications as an honest coming-soon state", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText("NOT AVAILABLE YET")).toBeInTheDocument();
  });

  it("shows System information from the health endpoint", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "System" }));

    expect(await screen.findByText("OpsMap")).toBeInTheDocument();
    expect(screen.getByText("Environment (deployment)")).toBeInTheDocument();
    expect(screen.getByText("Log only")).toBeInTheDocument();
  });
});