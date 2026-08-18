import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { transportCalls } = vi.hoisted(() => ({
  transportCalls: {
    create: [] as unknown[],
    sent: [] as unknown[],
    failNext: false,
  },
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: (opts: unknown) => {
      transportCalls.create.push(opts);
      return {
        sendMail: async (mail: unknown) => {
          if (transportCalls.failNext) {
            transportCalls.failNext = false;
            throw new Error("connection refused");
          }
          transportCalls.sent.push(mail);
          return { accepted: ["alex@example.com"] };
        },
        close: () => {},
      };
    },
  },
}));

import { sendEmail } from "@/lib/server/services/email";

const SMTP_ENV: Record<string, string> = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "ops@example.com",
  SMTP_PASS: "secret",
  MAIL_FROM: "OpsMap <no-reply@example.com>",
};

afterEach(() => {
  vi.unstubAllEnvs();
  transportCalls.create.length = 0;
  transportCalls.sent.length = 0;
  transportCalls.failNext = false;
});

describe("sendEmail (SMTP path)", () => {
  it("delivers via nodemailer when SMTP_HOST is set", async () => {
    vi.stubEnv("SMTP_HOST", SMTP_ENV.SMTP_HOST);
    vi.stubEnv("SMTP_PORT", SMTP_ENV.SMTP_PORT);
    vi.stubEnv("SMTP_SECURE", SMTP_ENV.SMTP_SECURE);
    vi.stubEnv("SMTP_USER", SMTP_ENV.SMTP_USER);
    vi.stubEnv("SMTP_PASS", SMTP_ENV.SMTP_PASS);
    vi.stubEnv("MAIL_FROM", SMTP_ENV.MAIL_FROM);

    const result = await sendEmail({
      to: "alex@example.com",
      subject: "Assigned to LAP-001",
      body: "You were assigned.",
    });
    expect(result).toEqual({
      status: "ok",
      mode: "smtp",
      to: "alex@example.com",
      subject: "Assigned to LAP-001",
    });

    expect(transportCalls.create[0]).toEqual({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: { user: "ops@example.com", pass: "secret" },
    });
    expect(transportCalls.sent[0]).toMatchObject({
      from: "OpsMap <no-reply@example.com>",
      to: "alex@example.com",
      subject: "Assigned to LAP-001",
      text: "You were assigned.",
    });
  });

  it("falls back to a failed result when SMTP send throws", async () => {
    vi.stubEnv("SMTP_HOST", SMTP_ENV.SMTP_HOST);
    transportCalls.failNext = true;

    const result = await sendEmail({
      to: "alex@example.com",
      subject: "Assigned to LAP-001",
      body: "You were assigned.",
    });
    expect(result).toEqual({
      status: "failed",
      reason: "connection refused",
    });
  });

  it("still validates recipients before contacting SMTP", async () => {
    vi.stubEnv("SMTP_HOST", SMTP_ENV.SMTP_HOST);
    const result = await sendEmail({ to: "nope", subject: "X", body: "Y" });
    expect(result).toEqual({ status: "failed", reason: "invalid_recipient" });
    expect(transportCalls.create.length).toBe(0);
  });
});