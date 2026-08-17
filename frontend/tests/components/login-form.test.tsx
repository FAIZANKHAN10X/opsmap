// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { router, signIn } = vi.hoisted(() => ({
  router: { push: vi.fn(), refresh: vi.fn() },
  signIn: vi.fn<() => Promise<{ error: { message: string } | null }>>(
    async () => ({ error: null }),
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({ auth: { signInWithPassword: signIn } })),
}));

import { LoginForm } from "@/features/auth/LoginForm";

afterEach(() => {
  vi.clearAllMocks();
});

describe("LoginForm", () => {
  it("disables inputs and the submit button when Supabase is not configured", async () => {
    const user = userEvent.setup();
    render(<LoginForm configured={false} />);

    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    const submit = screen.getByRole("button", { name: "Sign in" });

    expect(email).toBeDisabled();
    expect(password).toBeDisabled();
    expect(submit).toBeDisabled();
    expect(screen.getByText(/isn't configured/i)).toBeInTheDocument();

    await user.click(submit);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("signs in and navigates to the dashboard on success", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "ops@example.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith({
      email: "ops@example.com",
      password: "secret",
    });
    expect(router.push).toHaveBeenCalledWith("/dashboard");
  });

  it("surfaces the auth error from Supabase", async () => {
    signIn.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "ops@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid login credentials",
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});