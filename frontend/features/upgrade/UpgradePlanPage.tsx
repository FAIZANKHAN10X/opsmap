"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatPlanPrice, PRO_PLAN } from "@/lib/plans";

const CURRENT_PLAN = {
  name: "8AM HUB",
  priceLabel: "Free",
  description: "Core operations for your development — included with your workspace.",
  features: [
    "Property map & villa list",
    "Contacts & DATABASE",
    "Documents & media",
    "KPI overview & status engine",
    "Role-based access",
  ],
} as const;

/**
 * Upgrade Plan page — UI/product surface ONLY.
 *
 * No Stripe, no subscription, no checkout, no enforcement. Price and
 * capabilities read from lib/plans.ts. Every Pro capability is marked
 * "Coming soon" and the CTA is disabled with an explicit billing disclaimer.
 */
export function UpgradePlanPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-[var(--ops-bg)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        {/* Header */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] px-3 py-1 text-xs font-medium text-[var(--ops-text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--ops-accent)]" aria-hidden />
            Plans & billing
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--ops-text)] md:text-3xl">
            Upgrade your workspace
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--ops-text-secondary)]">
            Choose the plan that fits how your team operates. {PRO_PLAN.tagline} Compare what is included today with what is coming next for {PRO_PLAN.name}.
          </p>
        </div>

        {/* Current plan note */}
        <div className="mt-6 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] px-4 py-3 text-sm text-[var(--ops-text-secondary)]">
          You are on <span className="font-semibold text-[var(--ops-text)]">{CURRENT_PLAN.name}</span> — {CURRENT_PLAN.priceLabel.toLowerCase()}. Billing is not connected yet; this page is a preview of the premium plan.
        </div>

        {/* Plan cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Free / current */}
          <section className="flex flex-col rounded-[var(--ops-radius-xl)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] p-6 shadow-[var(--ops-shadow-sm)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[var(--ops-text)]">{CURRENT_PLAN.name}</h2>
                <p className="mt-1 text-sm text-[var(--ops-text-secondary)]">{CURRENT_PLAN.description}</p>
              </div>
              <span className="rounded-full border border-[var(--ops-border)] bg-[var(--ops-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--ops-text-secondary)]">
                Current plan
              </span>
            </div>
            <p className="mt-5">
              <span className="text-3xl font-bold tracking-tight text-[var(--ops-text)]">{CURRENT_PLAN.priceLabel}</span>
            </p>
            <ul className="mt-6 space-y-3">
              {CURRENT_PLAN.features.map((label) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-[var(--ops-text)]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ops-success-muted)] text-[var(--ops-success)]">
                    <Icon name="check" size={14} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Button variant="secondary" size="md" className="w-full" disabled>
                Current plan
              </Button>
            </div>
          </section>

          {/* Pro */}
          <section className="relative flex flex-col overflow-hidden rounded-[var(--ops-radius-xl)] border-2 border-[var(--ops-accent)] bg-[var(--ops-bg-elevated)] shadow-[var(--ops-shadow)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--ops-accent)]" aria-hidden />
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[var(--ops-radius)] bg-[var(--ops-accent)] text-white">
                    <Icon name="sparkles" size={20} />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[var(--ops-text)]">{PRO_PLAN.name}</h2>
                    <p className="text-sm font-medium text-[var(--ops-accent-strong)]">{formatPlanPrice(PRO_PLAN)}</p>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--ops-accent)] px-3 py-1 text-xs font-semibold text-white">
                  Recommended
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--ops-text-secondary)]">{PRO_PLAN.tagline}</p>

              <ul className="mt-6 space-y-2.5">
                {PRO_PLAN.capabilities.map((cap) => (
                  <li
                    key={cap.label}
                    className="flex items-center justify-between gap-3 rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-[var(--ops-text)]">
                      <Icon name="info" size={15} className="shrink-0 text-[var(--ops-text-muted)]" />
                      {cap.label}
                    </span>
                    <span className="shrink-0 rounded-full bg-[var(--ops-surface-muted)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
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
              <p className="mt-3 text-center text-xs leading-relaxed text-[var(--ops-text-muted)]">
                Billing is not connected yet. This is a preview of the premium plan. No payment will be taken.
              </p>
            </div>
          </section>
        </div>

        {/* Comparison hint + FAQ */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
              <Icon name="shield" size={16} className="text-[var(--ops-text-muted)]" />
              What to expect
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--ops-text-secondary)]">
              <li>• Your existing workspace and data stay exactly as they are.</li>
              <li>• Capabilities marked &ldquo;Coming soon&rdquo; are product concepts, not currently available.</li>
              <li>• When billing goes live, you will be asked to confirm before any charge.</li>
            </ul>
          </section>
          <section className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
              <Icon name="info" size={16} className="text-[var(--ops-text-muted)]" />
              Need help choosing?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ops-text-secondary)]">
              This page is intentionally UI-only in this phase. If you want to be notified when {PRO_PLAN.name} becomes available, reach out to the 8AM HUB team. No account changes are made from this page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
