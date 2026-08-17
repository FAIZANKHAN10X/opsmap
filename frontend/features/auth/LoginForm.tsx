"use client";

import { useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  configured?: boolean;
};

const inputClass =
  "h-9 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-3 text-sm text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] transition-colors focus:border-[var(--ops-focus)] focus:outline-none";

export function LoginForm({ configured = true }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured) {
      setError("Supabase auth is not configured yet.");
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--ops-text-muted)]">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@company.com"
            disabled={!configured}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--ops-text-muted)]">
            Password
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
            placeholder="••••••••"
            disabled={!configured}
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="text-xs text-[var(--ops-danger)]"
            aria-live="polite"
          >
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={loading || !configured}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>

      {!configured ? (
        <p className="text-center text-xs text-[var(--ops-text-muted)]">
          Supabase isn&apos;t configured. Add NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to <code>frontend/.env.local</code>.
        </p>
      ) : null}
    </form>
  );
}