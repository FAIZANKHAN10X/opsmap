// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { svc } = vi.hoisted(() => ({
  svc: {
    list: vi.fn(),
    count: vi.fn(),
    markRead: vi.fn(),
    markAll: vi.fn(),
  },
}));

vi.mock("@/services/notifications", () => ({
  listNotifications: svc.list,
  getUnreadCount: svc.count,
  markNotificationRead: svc.markRead,
  markAllNotificationsRead: svc.markAll,
}));

import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { ShellProvider, useShell } from "@/stores/shell-context";

const base = {
  id: "n1",
  severity: "info",
  kind: "system",
  title: "Saved",
  message: "Project updated.",
  recipient: null,
  recipient_email: null,
  entity_type: null,
  entity_id: null,
  read_at: null,
  metadata: {},
  created_at: "2026-08-17T10:00:00Z",
  updated_at: "2026-08-17T10:00:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
});

function Harness() {
  const { setDemoMode } = useShell();
  return (
    <>
      <button type="button" onClick={() => setDemoMode(true)}>
        Enable demo
      </button>
      <NotificationCenter />
    </>
  );
}

function renderCenter() {
  return render(
    <ShellProvider>
      <Harness />
    </ShellProvider>,
  );
}

describe("NotificationCenter", () => {
  it("shows the unread badge count and lists notifications in the dialog", async () => {
    svc.list.mockResolvedValue({
      data: [
        { ...base, is_read: false },
        { ...base, id: "n2", title: "Assigned", kind: "assignment", is_read: true },
      ],
      pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
      message: null,
      success: true,
    });
    svc.count.mockResolvedValue({ data: { count: 1 }, message: null, success: true });

    const user = userEvent.setup();
    renderCenter();

    await screen.findByRole("button", { name: "Notifications, 1 unread" });

    await user.click(screen.getByRole("button", { name: /notifications/i }));

    const dialog = await screen.findByRole("dialog", { name: "Notifications" });
    expect(dialog).toHaveTextContent("Saved");
    expect(dialog).toHaveTextContent("Assignment");
  });

  it("marks a notification read when clicked", async () => {
    svc.list.mockResolvedValue({
      data: [{ ...base, is_read: false }],
      pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      message: null,
      success: true,
    });
    svc.count.mockResolvedValue({ data: { count: 1 }, message: null, success: true });
    svc.markRead.mockResolvedValue({ data: {}, message: null, success: true });

    const user = userEvent.setup();
    renderCenter();

    await screen.findByRole("button", { name: "Notifications, 1 unread" });
    await user.click(screen.getByRole("button", { name: /notifications/i }));
    const dialog = await screen.findByRole("dialog", { name: "Notifications" });

    await user.click(within(dialog).getByRole("button", { name: /Saved/ }));

    expect(svc.markRead).toHaveBeenCalledWith("n1", true);
  });

  it("does not mark notifications read in demo mode (read-only)", async () => {
    svc.list.mockResolvedValue({
      data: [{ ...base, is_read: false }],
      pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      message: null,
      success: true,
    });
    svc.count.mockResolvedValue({ data: { count: 1 }, message: null, success: true });

    const user = userEvent.setup();
    renderCenter();

    await screen.findByRole("button", { name: "Notifications, 1 unread" });
    await user.click(screen.getByRole("button", { name: "Enable demo" }));

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    const dialog = await screen.findByRole("dialog", { name: "Notifications" });

    expect(dialog).toHaveTextContent(
      "Demo Mode is read-only — notifications cannot be marked as read.",
    );
    expect(screen.queryByRole("button", { name: "Mark all read" })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /Saved/ }));

    expect(svc.markRead).not.toHaveBeenCalled();
    expect(svc.markAll).not.toHaveBeenCalled();
  });

  it("renders an empty state when there are no notifications", async () => {
    svc.list.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
      message: null,
      success: true,
    });
    svc.count.mockResolvedValue({ data: { count: 0 }, message: null, success: true });

    const user = userEvent.setup();
    renderCenter();

    await user.click(await screen.findByRole("button", { name: "Notifications" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "No notifications yet.",
    );
  });
});