// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterControls } from "@/features/dashboard/FilterControls";
import { ShellProvider } from "@/stores/shell-context";
import type { AssetStatus, AssetType } from "@/types/domain";

const statuses: AssetStatus[] = [
  { id: "s1", name: "Available", slug: "available", color: "#22c55e", description: null, sort_order: 1, created_at: "", updated_at: "" },
  { id: "s2", name: "Sold", slug: "sold", color: "#c026d3", description: null, sort_order: 2, created_at: "", updated_at: "" },
];

const types: AssetType[] = [
  { id: "t1", name: "Villa", slug: "villa", description: null, sort_order: 1, created_at: "", updated_at: "" },
];

function renderControls() {
  return render(
    <ShellProvider>
      <FilterControls statuses={statuses} types={types} />
    </ShellProvider>,
  );
}

describe("FilterControls", () => {
  it("renders primary filter controls", () => {
    renderControls();
    expect(screen.getByPlaceholderText(/Search properties/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Type/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Status/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Price" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Beds & Baths/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /More Filters/ })).toBeInTheDocument();
  });

  it("toggles a status filter via the Status dialog and shows active chip", async () => {
    const user = userEvent.setup();
    renderControls();

    // Open Status dialog
    await user.click(screen.getByRole("button", { name: /Status/ }));
    const dialog = screen.getByRole("dialog", { name: "Filter by status" });
    const checkbox = within(dialog).getByRole("checkbox", { name: "Available" });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    // Chip appears (Remove button for chip)
    expect(screen.getByLabelText("Remove Available")).toBeInTheDocument();
  });

  it("toggles type chips via the Type dialog", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole("button", { name: /Type/ }));
    const dialog = screen.getByRole("dialog", { name: "Filter by property type" });
    await user.click(within(dialog).getByRole("checkbox", { name: "Villa" }));

    expect(screen.getByLabelText("Remove Villa")).toBeInTheDocument();
  });

  it("Clear all resets chips and search together", async () => {
    const user = userEvent.setup();
    renderControls();

    const search = screen.getByPlaceholderText(/Search properties/);
    await user.type(search, "villa");

    await user.click(screen.getByRole("button", { name: /Status/ }));
    await user.click(within(screen.getByRole("dialog", { name: "Filter by status" })).getByRole("checkbox", { name: "Available" }));

    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(search).toHaveValue("");
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
  });

  it("removes individual filter chips", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole("button", { name: /Status/ }));
    await user.click(within(screen.getByRole("dialog", { name: "Filter by status" })).getByRole("checkbox", { name: "Available" }));
    expect(screen.getByLabelText("Remove Available")).toBeInTheDocument();

    // Remove via chip × button
    await user.click(screen.getByLabelText("Remove Available"));
    expect(screen.queryByLabelText("Remove Available")).not.toBeInTheDocument();
  });

  it("applies price filter and shows chip", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole("button", { name: "Price" }));
    const dialog = screen.getByRole("dialog", { name: "Price filter" });
    await user.type(within(dialog).getByPlaceholderText("Min price"), "5000000");
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));

    // Active chip appears (contains min value)
    expect(screen.getByText(/5,000,000/)).toBeInTheDocument();
  });
});
