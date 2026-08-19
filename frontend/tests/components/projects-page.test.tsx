// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const projects = vi.hoisted(() => [
  {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: 'ULLUWATU "26',
    slug: "ulluwatu-26",
    description: "Bali clifftop development",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by: null,
    updated_by: null,
  },
  {
    id: "223e4567-e89b-12d3-a456-426614174001",
    name: "North Site",
    slug: "north-site",
    description: null,
    status: "active",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    created_by: null,
    updated_by: null,
  },
]);

vi.mock("@/services/projects", () => {
  const listProjects = vi.fn(async () => ({
    success: true,
    data: projects,
    pagination: { page: 1, limit: 100, total: projects.length, pages: 1 },
    message: null,
  }));
  const createProject = vi.fn(async (input: { name: string; slug: string; description?: string | null }) => ({
    success: true,
    data: {
      id: "323e4567-e89b-12d3-a456-426614174002",
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      status: "active",
      created_at: "2026-01-03T00:00:00Z",
      updated_at: "2026-01-03T00:00:00Z",
      created_by: null,
      updated_by: null,
    },
    message: null,
  }));
  const updateProject = vi.fn(async (id: string, input: Record<string, unknown>) => {
    const current = projects.find((p) => p.id === id) ?? projects[0];
    return {
      success: true,
      data: {
        ...current,
        ...input,
        status: input.status ?? "active",
      },
      message: null,
    };
  });
  const deleteProject = vi.fn(async () => undefined);
  return { listProjects, createProject, updateProject, deleteProject };
});

import { ProjectsPage } from "@/features/projects/ProjectsPage";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "@/services/projects";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { ToastProvider } from "@/stores/toast-context";
import { UserProvider } from "@/stores/user-context";
import type { UserRole } from "@/types/domain";

const mockedListProjects = vi.mocked(listProjects);
const mockedCreateProject = vi.mocked(createProject);
const mockedUpdateProject = vi.mocked(updateProject);
const mockedDeleteProject = vi.mocked(deleteProject);

function ManagerHarness() {
  const { setDemoMode } = useShell();
  return (
    <>
      <button type="button" onClick={() => setDemoMode(true)}>
        Enable demo
      </button>
      <ProjectsPage />
    </>
  );
}

function renderPage(role: UserRole = "manager") {
  return render(
    <UserProvider
      user={{ email: "owner@opsmap.app", fullName: null, role }}
    >
      <ShellProvider>
        <ToastProvider>
          <ManagerHarness />
        </ToastProvider>
      </ShellProvider>
    </UserProvider>,
  );
}

describe("ProjectsPage (/dashboard/projects)", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReset();
    mockedListProjects.mockClear();
    mockedCreateProject.mockClear();
    mockedUpdateProject.mockClear();
    mockedDeleteProject.mockClear();
  });

  it("lists active developments from the real project service", async () => {
    renderPage();
    expect(await screen.findByText("Developments")).toBeInTheDocument();
    expect(mockedListProjects).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
      status: "active",
    });
    expect(await screen.findByText('ULLUWATU "26')).toBeInTheDocument();
    expect(screen.getByText("North Site")).toBeInTheDocument();
    expect(screen.getByText("ulluwatu-26")).toBeInTheDocument();
  });

  it("creates a development and bumps the shared refresh signal", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("North Site");

    await user.click(screen.getByRole("button", { name: "New development" }));
    await user.type(
      screen.getByLabelText("Name *"),
      "Bintan Resort",
    );
    await user.click(screen.getByRole("button", { name: "Save development" }));

    expect(mockedCreateProject).toHaveBeenCalledWith({
      name: "Bintan Resort",
      slug: "bintan-resort",
      description: null,
    });
    await waitFor(() => {
      expect(mockedListProjects.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it("renames a development through the existing updateProject path", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("North Site");

    await user.click(screen.getAllByRole("button", { name: "Rename" })[1]);
    const nameInput = screen.getByLabelText("Name *");
    expect(nameInput).toHaveValue("North Site");
    await user.clear(nameInput);
    await user.type(nameInput, "North Site Renamed");
    await user.click(screen.getByRole("button", { name: "Save development" }));

    expect(mockedUpdateProject).toHaveBeenCalledWith(
      "223e4567-e89b-12d3-a456-426614174001",
      {
        name: "North Site Renamed",
        slug: "north-site",
        description: null,
      },
    );
  });

  it("archives a development via the existing status field after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("North Site");

    await user.click(screen.getAllByRole("button", { name: "Archive" })[1]);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("North Site"));
    expect(mockedUpdateProject).toHaveBeenCalledWith(
      "223e4567-e89b-12d3-a456-426614174001",
      { status: "archived" },
    );
    await waitFor(() => {
      expect(mockedListProjects.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it("deletes a development through the existing soft-delete path after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("North Site");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[1]);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("North Site"));
    expect(mockedDeleteProject).toHaveBeenCalledWith(
      "223e4567-e89b-12d3-a456-426614174001",
    );
  });

  it("refuses to mutate without a confirmation dialog", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();
    await screen.findByText("North Site");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[1]);
    expect(mockedDeleteProject).not.toHaveBeenCalled();
  });

  it("hides all write controls for non-manager roles", async () => {
    renderPage("operator");
    await screen.findByText("North Site");

    expect(
      screen.queryByRole("button", { name: "New development" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByText(/a manager or admin can create/i)).toBeInTheDocument();
  });

  it("shows an empty-state CTA when there are no active developments", async () => {
    mockedListProjects.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, limit: 100, total: 0, pages: 0 },
      message: null,
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("NO DEVELOPMENTS")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create your first development" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Create your first development" }),
    );
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
  });

  it("stays read-only in Demo Mode", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("North Site");

    await user.click(screen.getByRole("button", { name: "Enable demo" }));

    expect(screen.getByText(/demo mode is read-only/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "New development" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });
});