import "server-only";

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|api[_-]?key|authorization|service[_-]?role|credential|bearer/i;

export type AuditDetails = Record<string, unknown>;

/**
 * Server-side audit log for important mutating actions.
 *
 * Emits a structured line with a stable `[audit]` prefix so critical actions
 * (asset/project/status/type mutations, document uploads/deletes, notification
 * creation, report generation) are traceable in server logs. Sensitive keys
 * are redacted before logging. Server-only by guard; never callable from
 * client code. This is intentionally lightweight — no external infra and no
 * durable audit table (a roadmap item), just structured log records.
 */
export function audit(action: string, details: AuditDetails = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    safe[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : value;
  }
  console.info(`[audit] ${action}`, safe);
}