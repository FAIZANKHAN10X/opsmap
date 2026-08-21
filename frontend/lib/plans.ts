/**
 * Product plan presentation — UI-only configuration.
 *
 * Centralizes the displayed plan name/price so the string "$49/month" lives in
 * exactly one place. Phase 6 is presentation only: NO billing, NO Stripe, NO
 * subscriptions, NO checkout. "Coming soon" capabilities are product concepts,
 * not claims that the features exist today.
 */

export type PlanCapability = {
  label: string;
  /** Not yet implemented — shown with a "Coming soon" marker. */
  comingSoon: boolean;
};

export const PRO_PLAN = {
  name: "8AM HUB Pro",
  /** Reference price. NOT connected to any billing system. */
  price: 49,
  currency: "USD",
  interval: "month" as const,
  tagline: "Advanced capabilities for businesses that need more from 8AM HUB.",
  capabilities: [
    { label: "Advanced automation", comingSoon: true },
    { label: "WhatsApp business integration", comingSoon: true },
    { label: "Advanced reporting", comingSoon: true },
    { label: "Activity / audit history", comingSoon: true },
    { label: "Advanced analytics", comingSoon: true },
    { label: "Additional integrations", comingSoon: true },
    { label: "Expanded storage", comingSoon: true },
    { label: "Priority support", comingSoon: true },
  ] satisfies PlanCapability[],
} as const;

/** Human-readable price, e.g. "$49 / month". */
export function formatPlanPrice(
  plan: typeof PRO_PLAN,
): string {
  const symbol = plan.currency === "USD" ? "$" : `${plan.currency} `;
  return `${symbol}${plan.price} / ${plan.interval}`;
}