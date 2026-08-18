import "server-only";

/**
 * Server-only SMTP configuration (Phase 14). Lives in a server-only module so
 * credentials (SMTP_USER/SMTP_PASS) can never be bundled into client code.
 *
 * When SMTP_HOST is unset, getSmtpConfig() returns null and email delivery
 * falls back to the validated log-only path (documented in ADR-015).
 */

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string;
};

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure: process.env.SMTP_SECURE?.toLowerCase() === "true",
    user: process.env.SMTP_USER?.trim() || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.MAIL_FROM?.trim() || "OpsMap <no-reply@opsmap.app>",
  };
}

/** True when SMTP delivery is configured (email leaves the box). */
export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

/** Public app origin used in generated emails/links. Defaults to localhost. */
export function getAppUrl(): string {
  return (
    process.env.APP_URL?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}