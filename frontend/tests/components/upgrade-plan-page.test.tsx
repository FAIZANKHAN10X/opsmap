// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { UpgradePlanPage } from "@/features/upgrade/UpgradePlanPage";
import { PRO_PLAN } from "@/lib/plans";

describe("UpgradePlanPage (/dashboard/upgrade)", () => {
  it("renders the Pro plan with centralized price", () => {
    render(<UpgradePlanPage />);
    expect(screen.getByText(PRO_PLAN.name)).toBeInTheDocument();
    expect(screen.getByText(`$${PRO_PLAN.price} / ${PRO_PLAN.interval}`)).toBeInTheDocument();
  });

  it("marks every Pro capability as Coming soon and shows the billing disclaimer", () => {
    render(<UpgradePlanPage />);
    // Each capability is rendered with a Coming soon badge
    const badges = screen.getAllByText("Coming soon");
    expect(badges.length).toBeGreaterThanOrEqual(PRO_PLAN.capabilities.length);
    expect(screen.getAllByText(/Billing is not connected yet/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows a disabled CTA so no billing operation is implied", () => {
    render(<UpgradePlanPage />);
    const cta = screen.getByRole("button", { name: "Coming soon" });
    expect(cta).toBeDisabled();
  });

  it("renders the current free plan alongside Pro", () => {
    render(<UpgradePlanPage />);
    expect(screen.getAllByText("Current plan").length).toBeGreaterThanOrEqual(1);
  });
});
