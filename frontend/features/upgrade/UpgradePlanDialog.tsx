"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatPlanPrice, PRO_PLAN } from "@/lib/plans";

type UpgradePlanDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Upgrade Plan presentation — UI/product surface ONLY.
 *
 * Deliberately NOT connected to billing: there is no Stripe, no subscription,
 * no checkout, no plan enforcement. All capabilities are product concepts
 * marked "Coming soon"; the CTA is a read-only "Coming soon" button so nothing
 * implies billing is live. Price reads from lib/plans.ts (centralized).
 */
export function UpgradePlanDialog({ open, onClose }: UpgradePlanDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`${PRO_PLAN.name} upgrade plan`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[var(--ops-radius-xl)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] shadow-[var(--ops-shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border-subtle)] bg-[var(--ops-surface-muted)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--ops-radius)] bg-[var(--ops-accent)] text-white">
              <Icon name="sparkles" size={20} />
            </span>
            <div>
              <p className="text-base font-bold text-[var(--ops-text)]">
                {PRO_PLAN.name}
              </p>
              <p className="text-sm text-[var(--ops-text-secondary)]">
                {formatPlanPrice(PRO_PLAN)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade plan"
            className="rounded-[var(--ops-radius-sm)] p-1.5 text-[var(--ops-text-muted)] transition-colors hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-[var(--ops-text-secondary)]">
            {PRO_PLAN.tagline}
          </p>

          <ul className="mt-5 grid grid-cols-1 gap-2.5">
            {PRO_PLAN.capabilities.map((cap) => (
              <li
                key={cap.label}
                className="flex items-center justify-between gap-3 rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] px-3 py-2.5"
              >
                <span className="flex items-center gap-2.5 text-sm font-medium text-[var(--ops-text)]">
                  <Icon
                    name={cap.comingSoon ? "info" : "check"}
                    size={15}
                    className={
                      cap.comingSoon
                        ? "text-[var(--ops-text-muted)]"
                        : "text-[var(--ops-success)]"
                    }
                  />
                  {cap.label}
                </span>
                <span className="rounded-full bg-[var(--ops-surface-muted)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
                  Coming soon
                </span>
              </li>
            ))}
          </ul>

          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            disabled
            title="Billing is not connected yet"
          >
            <Icon name="sparkles" size={16} />
            Coming soon
          </Button>
          <p className="mt-3 text-center text-xs text-[var(--ops-text-muted)]">
            Billing is not connected yet. This is a preview of the premium
            plan.
          </p>
        </div>
      </div>
    </div>
  );
}