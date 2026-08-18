import "server-only";

import nodemailer from "nodemailer";

import { getSmtpConfig } from "@/lib/server/email/config";

export type SmtpSendResult =
  | { status: "ok"; to: string; subject: string }
  | { status: "failed"; reason: string };

/**
 * Real SMTP delivery (Phase 14) via nodemailer (ADR-015). Only engaged when
 * SMTP_HOST is configured; otherwise sendEmail keeps the validated log-only
 * path. Never throws — failures are returned so assignment pipelines can
 * never be corrupted by a mail outage.
 */
export async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<SmtpSendResult> {
  const config = getSmtpConfig();
  if (!config) {
    return { status: "failed", reason: "smtp_not_configured" };
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user
      ? { auth: { user: config.user, pass: config.pass ?? "" } }
      : {}),
  });

  try {
    await transport.sendMail({
      from: config.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
    });
    return { status: "ok", to: opts.to, subject: opts.subject };
  } catch (error) {
    console.error("email_job_smtp_failed", {
      reason: error instanceof Error ? error.message : "unknown_smtp_error",
      to: opts.to,
    });
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "unknown_smtp_error",
    };
  } finally {
    transport.close();
  }
}