import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "tonal";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ops-accent)] text-white hover:bg-[var(--ops-accent-hover)] border-transparent shadow-sm",
  secondary:
    "bg-[var(--ops-surface)] text-[var(--ops-text)] border-[var(--ops-border)] hover:bg-[var(--ops-surface-hover)] hover:border-[var(--ops-border-strong)]",
  ghost:
    "bg-transparent text-[var(--ops-text-secondary)] border-transparent hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]",
  danger:
    "bg-[var(--ops-danger-muted)] text-[var(--ops-danger)] border-transparent hover:bg-[var(--ops-danger)]/15",
  tonal:
    "bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)] border-transparent hover:bg-[var(--ops-accent)]/15",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
  icon: "h-10 w-10 p-0 justify-center",
  "icon-sm": "h-8 w-8 p-0 justify-center",
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
        "inline-flex items-center justify-center rounded-[var(--ops-radius-lg)] border font-medium transition-all duration-200 active:scale-[0.98]",
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
