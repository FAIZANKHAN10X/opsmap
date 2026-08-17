import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendEmail } from "@/lib/server/services/email";

describe("sendEmail (log-only)", () => {
  it("validates input and logs delivery intent when no SMTP is configured", async () => {
    const result = await sendEmail({
      to: "alex@example.com",
      subject: "Assigned to LAP-001",
      body: "You were assigned.",
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.mode).toBe("log_only");
      expect(result.to).toBe("alex@example.com");
      expect(result.subject).toBe("Assigned to LAP-001");
    }
  });

  it("rejects invalid recipients", async () => {
    const result = await sendEmail({ to: "not-an-email", subject: "X", body: "Y" });
    expect(result).toEqual({ status: "failed", reason: "invalid_recipient" });
  });

  it("rejects empty recipients and missing subjects", async () => {
    expect(await sendEmail({ to: "", subject: "X", body: "Y" })).toEqual({
      status: "failed",
      reason: "invalid_recipient",
    });
    expect(await sendEmail({ to: "a@b.co", subject: "  ", body: "Y" })).toEqual({
      status: "failed",
      reason: "missing_subject",
    });
  });

  it("truncates long subjects and bodies", async () => {
    const result = await sendEmail({
      to: "a@b.co",
      subject: "s".repeat(300),
      body: "b".repeat(60_000),
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.subject.length).toBe(200);
    }
  });
});