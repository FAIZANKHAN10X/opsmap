// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => {
  const seed = () => [
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: 'ULLUWATU "26',
      slug: "ulluwatu-26",
      description: null,
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
  ];
  const projects = seed();
  return { projects, seed };
});

vi.mock("@/services/projects", () => ({
  listProjects: vi.fn(async () => ({
    success: true,
    data: state.projects,
    pagination: { page: 1, limit: 100, total: state.projects.length, pages: 1 },
    message: null,
  })),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

import { ProjectSelector } from "@/features/projects/ProjectSelector";
import { listProjects } from "@/services/projects";
import { ShellProvider, useShell } from "@/stores/shell-context";

const mockedListProjects = vi.mocked(listProjects);

function Harness() {
  const { bumpRefresh } = useShell();
  return (
    <>
      <button type="button" onClick={bumpRefresh}>
        Bump refresh
      </button>
      <ProjectSelector />
    </>
  );
}

function renderSelector() {
  return render(
    <ShellProvider>
      <Harness />
    </ShellProvider>,
  );
}

describe("ProjectSelector (top bar)", () => {
  beforeEach(() => {
    mockedListProjects.mockClear();
    state.projects.length = 0;
    state.projects.push(...state.seed());
  });

  it("lists only active developments and seeds the first one", async () => {
    renderSelector();
    expect(mockedListProjects).toHaveBeenCalledWith({ status: "active" });
    expect(await screen.findByText('ULLUWATU "26')).toBeInTheDocument();
  });

  it("reflects a rename after the shared refresh signal bumps", async () => {
    const user = userEvent.setup();
    renderSelector();
    await screen.findByText('ULLUWATU "26');

    state.projects[0].name = 'ULLUWATU "26 Renamed';
    await user.click(screen.getByRole("button", { name: "Bump refresh" }));

    expect(await screen.findByText('ULLUWATU "26 Renamed')).toBeInTheDocument();
    expect(mockedListProjects.mock.calls.length).toBeGreaterThan(1);
  });

  it("makes a newly created development selectable immediately after a bump", async () => {
    const user = userEvent.setup();
    renderSelector();
    await screen.findByText('ULLUWATU "26');

    state.projects.push({
      id: "323e4567-e89b-12d3-a456-426614174002",
      name: "Bintan Resort",
      slug: "bintan-resort",
      description: null,
      status: "active",
      created_at: "2026-01-03T00:00:00Z",
      updated_at: "2026-01-03T00:00:00Z",
      created_by: null,
      updated_by: null,
    });
    await user.click(screen.getByRole("button", { name: "Bump refresh" }));

    await waitFor(() => {
      expect(mockedListProjects.mock.calls.length).toBeGreaterThan(1);
    });
    await user.click(
      screen.getByRole("button", { name: 'ULLUWATU "26', expanded: false }),
    );
    expect(
      screen.getByRole("option", { name: /Bintan Resort/ }),
    ).toBeInTheDocument();
  });

  it("recovers the selection safely when the selected project is archived", async () => {
    const user = userEvent.setup();
    renderSelector();
    await screen.findByText('ULLUWATU "26');

    state.projects.shift();
    await user.click(screen.getByRole("button", { name: "Bump refresh" }));

    expect(await screen.findByText("North Site")).toBeInTheDocument();
    expect(screen.queryByText('ULLUWATU "26')).not.toBeInTheDocument();
  });

  it("offers a link to the developments management page", async () => {
    const user = userEvent.setup();
    renderSelector();
    await screen.findByText('ULLUWATU "26');

    await user.click(
      screen.getByRole("button", { name: 'ULLUWATU "26', expanded: false }),
    );
    const manage = screen.getByRole("link", { name: /Manage developments/ });
    expect(manage).toHaveAttribute("href", "/dashboard/projects");
  });
});