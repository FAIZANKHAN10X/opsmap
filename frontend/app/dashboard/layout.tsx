import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types/ui";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Defense-in-depth on top of middleware: re-verify the session server-side
  // for every dashboard request. Calling createClient() also makes this route
  // dynamic so the check always runs (never baked at build time).
  let user: SessionUser | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      user = {
        email: authUser.email ?? null,
        fullName:
          (authUser.user_metadata?.full_name as string | undefined) ?? null,
      };
    }
  } catch {
    // Supabase not configured or the session couldn't be read — signed out.
  }

  if (!user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}