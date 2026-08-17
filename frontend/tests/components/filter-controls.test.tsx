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
  it("toggles a status chip and reveals the Clear control", async () => {
    const user = userEvent.setup();
    renderControls();

    const available = screen.getByRole("button", { name: "Available" });
    expect(available).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

    await user.click(available);
    expect(available).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();

    await user.click(available);
    expect(available).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("toggles type chips independently of status chips", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole("button", { name: "Available" }));
    await user.click(screen.getByRole("button", { name: "Villa" }));

    expect(screen.getByRole("button", { name: "Available" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Villa" })).toHaveAttribute("aria-pressed", "true");
  });

  it("Clear resets chips and search together", async () => {
    const user = userEvent.setup();
    renderControls();

    const search = screen.getByRole("searchbox");
    await user.type(search, "villa");
    await user.click(screen.getByRole("button", { name: "Available" }));
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("button", { name: "Available" })).toHaveAttribute("aria-pressed", "false");
    expect(search).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("groups the status chips under the Filters label", () => {
    const { container } = renderControls();
    expect(within(container).getByText("Filters")).toBeInTheDocument();
  });
});