// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useRouter: vi.fn(() => routerMocks),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/services/projects", () => ({
  listProjects: vi.fn(async () => ({ data: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 }, message: null, success: true })),
  getProject: vi.fn(async () => ({ data: null, message: null, success: true })),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock("@/services/assets", () => ({
  listAssets: vi.fn(async () => ({ data: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 }, message: null, success: true })),
  getAsset: vi.fn(async () => ({ data: null, message: null, success: true })),
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
  deleteAsset: vi.fn(),
}));

import { Sidebar } from "@/components/layout/Sidebar";
import { Avatar } from "@/components/ui/Avatar";
import { ShellProvider } from "@/stores/shell-context";
import { ToastProvider } from "@/stores/toast-context";
import { UserProvider } from "@/stores/user-context";

function renderSidebar(user: { email?: string | null; fullName?: string | null; avatarUrl?: string | null; role?: string | null } = {}) {
  const merged = {
    email: user.email ?? "alex@8am.hub",
    fullName: user.fullName ?? "Alex Rivera",
    avatarUrl: user.avatarUrl ?? null,
    role: (user.role as string | null) ?? "admin",
  };
  return render(
    <UserProvider user={merged as never}>
      <ShellProvider>
        <ToastProvider>
          <Sidebar />
        </ToastProvider>
      </ShellProvider>
    </UserProvider>,
  );
}

describe("Sidebar — Phase 6 polish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom fetch is not defined by default in vitest node env; Sidebar AccountMenu uses fetch for sign out
    const g: Record<string, unknown> = globalThis as unknown as Record<string, unknown>;
    if (!g.fetch) {
      g.fetch = vi.fn(async () => ({ redirected: false, url: "/login" })) as unknown as typeof fetch;
    } else {
      (g.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue?.({ redirected: false, url: "/login" });
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the locked navigation", () => {
    renderSidebar();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /DASHBOARD/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CONTACTS/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /DATABASE/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /SETTINGS/ })).toBeInTheDocument();
  });

  it("collapse control toggles and exposes accessible labels", async () => {
    const user = userEvent.setup();
    renderSidebar();

    const collapseBtn = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapseBtn).toBeInTheDocument();
    expect(collapseBtn).toHaveAttribute("title", "Collapse sidebar");

    await user.click(collapseBtn);

    expect(await screen.findByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("title", "Expand sidebar");

    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
  });

  it("shows the signed-in user name in the account area", () => {
    renderSidebar({ fullName: "Jordan Smith", email: "jordan@8am.hub" });
    expect(screen.getAllByText("Jordan Smith").length).toBeGreaterThanOrEqual(1);
  });

  it("falls back to initials when no avatar image is present", () => {
    const { container } = render(<Avatar name="Jordan Smith" email="jordan@8am.hub" src={null} size="md" />);
    expect(container.textContent).toContain("JS");
  });

  it("renders an image when an avatar URL is provided", () => {
    const { container } = render(
      <Avatar name="Jordan Smith" email="jordan@8am.hub" src="https://example.com/avatar.jpg" size="md" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/avatar.jpg");
  });

  it("falls back to email initials when name is absent", () => {
    const { container } = render(<Avatar name={null} email="alex@8am.hub" src={null} size="md" />);
    expect(container.textContent).toContain("AL");
  });

  it("opens the account menu and shows email, Account/Profile, Upgrade Plan and Sign Out", async () => {
    const user = userEvent.setup();
    renderSidebar({ fullName: "Alex Rivera", email: "alex@8am.hub" });

    const menuTrigger = screen.getByRole("button", { expanded: false });
    await user.click(menuTrigger);

    const menu = await screen.findByRole("menu", { name: "Account menu" });
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByText("alex@8am.hub")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Account \/ Profile/ })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Upgrade Plan/ })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("Sign Out posts to /auth/signout and navigates to /login", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({ redirected: false, url: "/login" } as Response));
    (globalThis as unknown as Record<string, unknown>).fetch = fetchMock as unknown as typeof fetch;

    renderSidebar({ fullName: "Alex Rivera", email: "alex@8am.hub" });

    // Open menu
    await user.click(screen.getByRole("button", { expanded: false }));
    const menu = await screen.findByRole("menu", { name: "Account menu" });
    const signOut = within(menu).getByRole("menuitem", { name: /Sign out/ });
    await user.click(signOut);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/auth/signout", { method: "POST" });
    });
    expect(routerMocks.push).toHaveBeenCalled();
  });

  it("Upgrade Plan navigates to its own page", async () => {
    const user = userEvent.setup();
    renderSidebar({ fullName: "Alex Rivera", email: "alex@8am.hub" });

    await user.click(screen.getByRole("button", { expanded: false }));
    const menu = await screen.findByRole("menu", { name: "Account menu" });
    await user.click(within(menu).getByRole("menuitem", { name: /Upgrade Plan/ }));

    expect(routerMocks.push).toHaveBeenCalledWith("/dashboard/upgrade");
  });

  it("menu closes on Escape", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});

describe("Avatar", () => {
  it("uses email stem when name is missing", () => {
    const { container } = render(<Avatar name={null} email="sam@example.com" src={null} />);
    expect(container.textContent).toContain("SA");
  });

  it("exposes an accessible label", () => {
    render(<Avatar name="Casey Lee" email="casey@8am.hub" src={null} />);
    expect(screen.getByRole("img", { name: "Casey Lee" })).toBeInTheDocument();
  });
});
