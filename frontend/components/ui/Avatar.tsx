import { useId } from "react";

import { cn } from "@/lib/cn";

type AvatarProps = {
  name?: string | null;
  email?: string | null;
  /** Provider profile image (Google avatar/picture). Falls back to initials. */
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-10 w-10 text-sm",
};

/** Initials derived from the display name; falls back to the email stem. */
function initialsFor(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const words = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const stem = (email ?? "").split("@")[0] ?? "";
  return stem.slice(0, 2).toUpperCase();
}

/**
 * Signed-in user avatar. Renders the provider image when available, otherwise
 * a deterministic initials chip. Never empty — always exposes an accessible
 * label to the current user.
 */
export function Avatar({ name, email, src, size = "md", className }: AvatarProps) {
  const titleId = useId();
  const showImage = Boolean(src?.trim());
  const label = name?.trim() || email?.trim() || "Account";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full ring-1 ring-[var(--ops-border)]",
        sizeClasses[size],
        className,
      )}
      role="img"
      aria-labelledby={titleId}
    >
      <span id={titleId} className="sr-only">
        {label}
      </span>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!.trim()}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[var(--ops-accent-muted)] font-semibold text-[var(--ops-accent-strong)]">
          {initialsFor(name, email)}
        </span>
      )}
    </span>
  );
}