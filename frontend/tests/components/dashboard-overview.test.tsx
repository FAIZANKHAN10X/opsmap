// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/dashboard", () => ({
  getProjectSummary: vi.fn(async () => ({
    success: true,
    data: {
      project_id: "p1",
      total_assets: 3,
      by_status: [
        { status_id: "s1", status_slug: "available", status_name: "Available", color: "#22c55e", count: 2 },
        { status_id: "s2", status_slug: "sold", status_name: "Sold", color: "#c026d3", count: 1 },
      ],
      kpis: {
        placed: 6,
        placed_capacity: 10,
        villa_capacity: 3,
        spots_open: 2,
        villas_sold_out: 1,
        total_villas: 3,
      },
    },
    message: null,
  })),
}));

import { getProjectSummary } from "@/services/dashboard";
import { DashboardOverview } from "@/features/dashboard/DashboardOverview";
import { ShellProvider, useShell } from "@/stores/shell-context";

const mockedGetSummary = vi.mocked(getProjectSummary);

function Harness() {
  const { setSelectedProjectId, bumpRefresh } = useShell();
  return (
    <>
      <button type="button" onClick={() => setSelectedProjectId("p1")}>
        Select project
      </button>
      <button type="button" onClick={bumpRefresh}>
        Bump refresh
      </button>
      <DashboardOverview />
    </>
  );
}

function renderOverview() {
  return render(
    <ShellProvider>
      <Harness />
    </ShellProvider>,
  );
}

describe("DashboardOverview (/dashboard)", () => {
  it("prompts for a project selection when none is active", () => {
    renderOverview();
    expect(screen.getByText("Select a project to open the dashboard.")).toBeInTheDocument();
    expect(screen.queryByText("Placed (OPS)")).not.toBeInTheDocument();
  });

  it("shows KPI cards and the status distribution from the real summary", async () => {
    renderOverview();
    await userEvent.click(screen.getByRole("button", { name: "Select project" }));

    expect(mockedGetSummary).toHaveBeenCalledWith("p1", false);
    expect(await screen.findByText("Placed (OPS)")).toBeInTheDocument();
    expect(screen.getByText("Villa Capacity")).toBeInTheDocument();
    expect(screen.getByText("Spots Open")).toBeInTheDocument();
    expect(screen.getByText("Villas Sold Out")).toBeInTheDocument();
    expect(screen.getByText("6 / 10")).toBeInTheDocument();

    expect(screen.getByText("Status Distribution")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Sold")).toBeInTheDocument();
    expect(screen.getByText("3 total")).toBeInTheDocument();
  });

  it("renders no property map, villa list, filters, or info panel", async () => {
    renderOverview();
    await userEvent.click(screen.getByRole("button", { name: "Select project" }));

    expect(await screen.findByText("Placed (OPS)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Property Map" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Villa List" })).not.toBeInTheDocument();
    expect(screen.queryByText("Filters")).not.toBeInTheDocument();
    expect(screen.queryByText("Details")).not.toBeInTheDocument();
  });

  it("shows an error state with retry when the summary fails", async () => {
    mockedGetSummary.mockRejectedValueOnce(new Error("Project not found."));
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole("button", { name: "Select project" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard failed to load");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("recalculates KPIs from persisted data when a mutation signals refresh", async () => {
    const user = userEvent.setup();
    renderOverview();
    await user.click(screen.getByRole("button", { name: "Select project" }));
    await screen.findByText("Placed (OPS)");

    const callsBefore = mockedGetSummary.mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Bump refresh" }));

    expect(mockedGetSummary.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(mockedGetSummary).toHaveBeenLastCalledWith("p1", false);
    expect(await screen.findByText("Placed (OPS)")).toBeInTheDocument();
  });
});