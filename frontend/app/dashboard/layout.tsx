import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import type { SessionUser } from "@/types/ui";

const VALID_ROLES = new Set(["admin", "manager", "operator", "viewer"]);

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
      let role: UserRole | null = null;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .maybeSingle();
      if (profileError) {
        console.error("profile_role_lookup_failed", profileError);
      }
      if (profile && VALID_ROLES.has((profile.role as string) ?? "")) {
        role = profile.role as UserRole;
      }

      user = {
        email: authUser.email ?? null,
        fullName:
          (authUser.user_metadata?.full_name as string | undefined) ?? null,
        role,
      };
    }
  } catch {
    // Supabase not configured or the session couldn't be read — signed out.
  }

  if (!user) {
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}