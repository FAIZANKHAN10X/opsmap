"use client";

import { Suspense, type ReactNode } from "react";

import { ToastViewport } from "@/components/feedback/ToastViewport";
import { DashboardUrlSync } from "@/components/layout/DashboardUrlSync";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ShellProvider } from "@/stores/shell-context";
import { ToastProvider } from "@/stores/toast-context";
import { UserProvider } from "@/stores/user-context";
import type { SessionUser } from "@/types/ui";

type AppShellProps = {
  children: ReactNode;
  user?: SessionUser | null;
};

export function AppShell({ children, user = null }: AppShellProps) {
  return (
    <UserProvider user={user}>
      <ShellProvider>
        <ToastProvider>
          <div className="flex h-dvh overflow-hidden bg-[var(--ops-bg)] text-[var(--ops-text)]">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
            </div>
            <ToastViewport />
          </div>
          <Suspense fallback={null}>
            <DashboardUrlSync />
          </Suspense>
        </ToastProvider>
      </ShellProvider>
    </UserProvider>
  );
}