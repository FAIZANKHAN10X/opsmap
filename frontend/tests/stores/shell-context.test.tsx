// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";

import { ShellProvider, useShell } from "@/stores/shell-context";

/**
 * Phase 15 change propagation — the shared refresh signal. Data surfaces that
 * stay mounted refetch when `refreshKey` changes, so a mutation anywhere in the
 * app propagates without a manual browser refresh or navigation.
 */
function Probe({ onFetch }: { onFetch: () => void }) {
  const { refreshKey, bumpRefresh } = useShell();
  useEffect(() => {
    onFetch();
  }, [refreshKey, onFetch]);
  return (
    <button type="button" onClick={bumpRefresh}>
      Bump refresh
    </button>
  );
}

describe("shell context refresh signal", () => {
  it("mounting a consumer fetches once", () => {
    const onFetch = vi.fn();
    render(
      <ShellProvider>
        <Probe onFetch={onFetch} />
      </ShellProvider>,
    );
    expect(onFetch).toHaveBeenCalledTimes(1);
  });

  it("bumpRefresh re-triggers fetching on mounted consumers", async () => {
    const user = userEvent.setup();
    const onFetch = vi.fn();
    render(
      <ShellProvider>
        <Probe onFetch={onFetch} />
      </ShellProvider>,
    );

    expect(onFetch).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Bump refresh" }));
    await user.click(screen.getByRole("button", { name: "Bump refresh" }));

    expect(onFetch).toHaveBeenCalledTimes(3);
  });
});
