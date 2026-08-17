// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DemoToggle } from "@/features/demo/DemoToggle";
import { ShellProvider } from "@/stores/shell-context";

function renderToggle() {
  return render(
    <ShellProvider>
      <DemoToggle />
    </ShellProvider>,
  );
}

describe("DemoToggle", () => {
  it("starts in the OFF state", () => {
    renderToggle();
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("OFF")).toBeInTheDocument();
    expect(screen.queryByText("ON")).not.toBeInTheDocument();
  });

  it("turns ON then OFF and back ON deterministically", async () => {
    const user = userEvent.setup();
    renderToggle();
    const toggle = screen.getByRole("switch");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("ON")).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("OFF")).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("ON")).toBeInTheDocument();
  });

  it("labels the action for assistive tech in both states", async () => {
    const user = userEvent.setup();
    renderToggle();
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAccessibleName("Turn demo data on");

    await user.click(toggle);
    expect(toggle).toHaveAccessibleName("Turn demo data off");
  });
});
