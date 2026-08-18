import "server-only";

import { getSmtpConfig } from "@/lib/server/email/config";
import { sendViaSmtp } from "@/lib/server/email/transport";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type EmailResult =
  | { status: "ok"; mode: "log_only" | "smtp"; to: string; subject: string }
  | { status: "failed"; reason: string };

/**
 * send_email equivalent. With no SMTP configured this validates input and logs
 * delivery intent (the Phase 9 Python behavior). When SMTP_HOST is configured
 * (Phase 14, ADR-015) the message is delivered via nodemailer. Never throws —
 * failures are returned so assignment pipelines are never corrupted.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<EmailResult> {
  const toAddr = (opts.to ?? "").trim();
  const subjectText = (opts.subject ?? "").trim();
  let bodyText = opts.body ?? "";

  if (!toAddr || !EMAIL_RE.test(toAddr)) {
    console.warn("email_job_invalid_recipient", { to: opts.to });
    return { status: "failed", reason: "invalid_recipient" };
  }
  if (!subjectText) {
    console.warn("email_job_missing_subject", { to: toAddr });
    return { status: "failed", reason: "missing_subject" };
  }

  const subject = subjectText.length > 200 ? subjectText.slice(0, 200) : subjectText;
  if (bodyText.length > 50_000) bodyText = bodyText.slice(0, 50_000);

  if (getSmtpConfig() !== null) {
    const result = await sendViaSmtp({ to: toAddr, subject, body: bodyText });
    if (result.status === "ok") {
      console.info("email_job_sent", { to: result.to, subject: result.subject, mode: "smtp" });
      return { status: "ok", mode: "smtp", to: result.to, subject: result.subject };
    }
    console.warn("email_job_failed", { to: toAddr, reason: result.reason });
    return { status: "failed", reason: result.reason };
  }

  console.info("email_job_logged", {
    to: toAddr,
    subject,
    body_length: bodyText.length,
    mode: "log_only",
  });
  return { status: "ok", mode: "log_only", to: toAddr, subject };
}