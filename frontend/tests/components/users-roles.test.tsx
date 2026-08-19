// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => {
  const seed = () => [
    {
      id: "u1",
      email: "admin@opsmap.app",
      full_name: null,
      role: "admin",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "u2",
      email: "maria@opsmap.app",
      full_name: "Maria Doe",
      role: "operator",
      created_at: "2026-02-01T00:00:00Z",
      updated_at: "2026-02-01T00:00:00Z",
    },
  ];
  const users = seed();
  return { users, seed };
});

vi.mock("@/services/profiles", () => ({
  listUsers: vi.fn(async () => ({
    success: true,
    data: state.users.map((u) => ({ ...u })),
    pagination: { page: 1, limit: 100, total: state.users.length, pages: 1 },
    message: null,
  })),
  setUserRole: vi.fn(
    async (input: { target_user_id: string; role: string }) => {
      const row = state.users.find((u) => u.id === input.target_user_id);
      if (!row) throw new Error("User profile not found.");
      row.role = input.role;
      return { success: true, data: null, message: null };
    },
  ),
}));

import { UsersRolesSection } from "@/features/settings/UsersRolesSection";
import { ToastViewport } from "@/components/feedback/ToastViewport";
import { listUsers, setUserRole } from "@/services/profiles";
import { ShellProvider, useShell } from "@/stores/shell-context";
import { ToastProvider } from "@/stores/toast-context";
import { UserProvider } from "@/stores/user-context";
import type { UserRole } from "@/types/domain";

const mockedList = vi.mocked(listUsers);
const mockedSetRole = vi.mocked(setUserRole);

function Harness() {
  const { setDemoMode } = useShell();
  return (
    <>
      <button type="button" onClick={() => setDemoMode(true)}>
        Enable demo
      </button>
      <UsersRolesSection />
      <ToastViewport />
    </>
  );
}

function renderUsers(role: UserRole) {
  return render(
    <UserProvider user={{ email: "admin@opsmap.app", fullName: null, role }}>
      <ShellProvider>
        <ToastProvider>
          <Harness />
        </ToastProvider>
      </ShellProvider>
    </UserProvider>,
  );
}

describe("UsersRolesSection", () => {
  beforeEach(() => {
    state.users.length = 0;
    state.users.push(...state.seed());
    mockedList.mockClear();
    mockedSetRole.mockClear();
  });

  it("admins see the user list with current roles", async () => {
    renderUsers("admin");
    expect(mockedList).toHaveBeenCalled();
    expect(await screen.findByText("Maria Doe")).toBeInTheDocument();
    expect(screen.getByText("maria@opsmap.app")).toBeInTheDocument();
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    expect(selects[0]).toHaveValue("admin");
    expect(selects[1]).toHaveValue("operator");
  });

  it("role options are exactly Admin / Manager / Operator / Viewer", async () => {
    renderUsers("admin");
    const select = (await screen.findAllByRole("combobox"))[0];
    const options = within(select).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Admin",
      "Manager",
      "Operator",
      "Viewer",
    ]);
  });

  it("an admin can change another user's role and the list refreshes", async () => {
    const user = userEvent.setup();
    renderUsers("admin");
    const selects = await screen.findAllByRole("combobox");

    await user.selectOptions(selects[1], "manager");

    expect(mockedSetRole).toHaveBeenCalledWith({
      target_user_id: "u2",
      role: "manager",
    });
    await waitFor(() => {
      expect(mockedList.mock.calls.length).toBeGreaterThan(1);
    });
    await waitFor(() => {
      expect(screen.getAllByRole("combobox")[1]).toHaveValue("manager");
    });
  });

  it("non-admins see a read-only notice and no role controls", async () => {
    renderUsers("operator");
    expect(
      await screen.findByText(/restricted to administrators/i),
    ).toBeInTheDocument();
    expect(mockedList).not.toHaveBeenCalled();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("stays read-only in Demo Mode", async () => {
    const user = userEvent.setup();
    renderUsers("admin");
    const selects = await screen.findAllByRole("combobox");

    await user.click(screen.getByRole("button", { name: "Enable demo" }));

    for (const select of selects) {
      expect(select).toBeDisabled();
    }
    expect(screen.getByText(/demo — read only/i)).toBeInTheDocument();
  });

  it("surfaces role-change failures and does not refresh", async () => {
    const user = userEvent.setup();
    mockedSetRole.mockRejectedValueOnce(new Error("Only admins can change roles."));
    renderUsers("admin");
    const selects = await screen.findAllByRole("combobox");

    await user.selectOptions(selects[1], "admin");

    expect(await screen.findByText("Only admins can change roles.")).toBeInTheDocument();
    expect(mockedList.mock.calls.length).toBe(1);
  });

  it("asks for confirmation before changing your own role", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false);
    renderUsers("admin");
    const selects = await screen.findAllByRole("combobox");

    await user.selectOptions(selects[0], "viewer");

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockedSetRole).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("proceeds with your own role change after confirming", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderUsers("admin");
    const selects = await screen.findAllByRole("combobox");

    await user.selectOptions(selects[0], "manager");

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockedSetRole).toHaveBeenCalledWith({
      target_user_id: "u1",
      role: "manager",
    });
    await waitFor(() => {
      expect(screen.getAllByRole("combobox")[0]).toHaveValue("manager");
    });
    confirmSpy.mockRestore();
  });
});