import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/LoginForm";
import { Icon } from "@/components/ui/Icon";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  let configured = isSupabaseConfigured();
  let hasSession = false;

  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      hasSession = Boolean(user);
    } catch {
      configured = false;
    }
  }

  if (hasSession) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--ops-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--ops-radius-lg)] bg-[var(--ops-accent-muted)] text-[var(--ops-accent)]">
            <Icon name="map" size={22} />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--ops-text)]">
              OpsMap
            </h1>
            <p className="text-sm text-[var(--ops-text-muted)]">
              Sign in to your operations workspace
            </p>
          </div>
        </div>
        <LoginForm configured={configured} />
      </div>
    </main>
  );
}