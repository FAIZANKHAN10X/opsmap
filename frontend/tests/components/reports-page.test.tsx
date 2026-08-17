// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/actions/reports", () => ({
  generateProjectSummaryReport: vi.fn(async () => ({
    success: true,
    data: {
      report_id: "r1",
      report_type: "project_summary",
      project_id: "p1",
      project_name: "Main",
      generated_at: "2026-08-17T10:00:00Z",
      total_assets: 3,
      document_count: 1,
      by_status: [
        { status_id: "s1", status_slug: "available", status_name: "Available", color: "#22c55e", count: 2 },
        { status_id: "s2", status_slug: "sold", status_name: "Sold", color: "#c026d3", count: 1 },
      ],
    },
    message: null,
  })),
}));

vi.mock("@/services/projects", () => ({
  listProjects: vi.fn(async () => ({
    data: [{ id: "p1", name: "Main", slug: "main", status: "active" }],
    pagination: { page: 1, limit: 25, total: 1, total_pages: 1 },
    message: null,
    success: true,
  })),
}));

import { generateProjectSummaryReport } from "@/actions/reports";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { ToastProvider } from "@/stores/toast-context";

const mockedGenerate = vi.mocked(generateProjectSummaryReport);

function Harness() {
  const { setSelectedProjectId } = useShell();
  return (
    <>
      <button type="button" onClick={() => setSelectedProjectId("p1")}>
        Select project
      </button>
      <ReportsPage />
    </>
  );
}

function renderPage() {
  return render(
    <ToastProvider>
      <ShellProvider>
        <Harness />
      </ShellProvider>
    </ToastProvider>,
  );
}

describe("ReportsPage", () => {
  it("prompts for a project selection when none is active", () => {
    renderPage();
    expect(screen.getByText("Select a project")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate report" })).not.toBeInTheDocument();
  });

  it("generates and displays a summary report", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Select project" }));
    const generate = await screen.findByRole("button", { name: "Generate report" });

    await user.click(generate);

    expect(await screen.findByText("Summary")).toBeInTheDocument();
    expect(mockedGenerate).toHaveBeenCalledWith({
      report_type: "project_summary",
      project_id: "p1",
    });
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Sold")).toBeInTheDocument();
  });

  it("shows an error when generation fails", async () => {
    mockedGenerate.mockResolvedValueOnce({
      success: false,
      error: { code: "PROJECT_NOT_FOUND", message: "Project not found." },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Select project" }));
    await user.click(await screen.findByRole("button", { name: "Generate report" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Project not found.",
    );
  });
});