"use client";

import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ShellProvider } from "@/stores/shell-context";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <ShellProvider>
      <div className="flex h-dvh overflow-hidden bg-[var(--ops-bg)] text-[var(--ops-text)]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </ShellProvider>
  );
}
