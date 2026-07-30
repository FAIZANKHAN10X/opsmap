"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useToast, type ToastItem } from "@/stores/toast-context";

const severityStyles: Record<
  ToastItem["severity"],
  { border: string; icon: string; label: string }
> = {
  success: {
    border: "border-[var(--ops-success)]",
    icon: "text-[var(--ops-success)]",
    label: "Success",
  },
  error: {
    border: "border-[var(--ops-danger)]",
    icon: "text-[var(--ops-danger)]",
    label: "Error",
  },
  warning: {
    border: "border-[var(--ops-warning)]",
    icon: "text-[var(--ops-warning)]",
    label: "Warning",
  },
  info: {
    border: "border-[var(--ops-info)]",
    icon: "text-[var(--ops-info)]",
    label: "Info",
  },
};

export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => {
        const style = severityStyles[toast.severity];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex gap-3 rounded-[var(--ops-radius)] border-l-4 bg-[var(--ops-surface)] px-3 py-3 shadow-[var(--ops-shadow)]",
              style.border,
            )}
          >
            <Icon
              name={toast.severity === "error" ? "alert" : "check"}
              size={16}
              className={cn("mt-0.5 shrink-0", style.icon)}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--ops-text)]">
                {toast.title}
              </p>
              {toast.message ? (
                <p className="mt-0.5 text-xs text-[var(--ops-text-secondary)]">
                  {toast.message}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
