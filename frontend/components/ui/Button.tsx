import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ops-accent)] text-white hover:bg-[var(--ops-accent-hover)] border-transparent",
  secondary:
    "bg-[var(--ops-surface)] text-[var(--ops-text)] border-[var(--ops-border)] hover:bg-[var(--ops-surface-hover)]",
  ghost:
    "bg-transparent text-[var(--ops-text-secondary)] border-transparent hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]",
  danger:
    "bg-[var(--ops-danger)]/15 text-[var(--ops-danger)] border-[var(--ops-danger)]/30 hover:bg-[var(--ops-danger)]/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  icon: "h-9 w-9 p-0 justify-center",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center rounded-[var(--ops-radius)] border font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ops-bg)]",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
