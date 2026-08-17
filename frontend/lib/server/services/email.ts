import "server-only";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type EmailResult =
  | { status: "ok"; mode: "log_only" | "smtp"; to: string; subject: string }
  | { status: "failed"; reason: string };

/**
 * send_email equivalent. With no SMTP configured this validates input and logs
 * delivery intent (the Phase 9 Python behavior). No outbound network calls.
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

  console.info("email_job_logged", {
    to: toAddr,
    subject,
    body_length: bodyText.length,
    mode: "log_only",
  });
  return { status: "ok", mode: "log_only", to: toAddr, subject };
}