"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const response = await fetch("/auth/signout", { method: "POST" });
    router.push(response.redirected ? response.url : "/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start"
      onClick={handleSignOut}
      disabled={loading}
    >
      <Icon name="logout" size={16} />
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}