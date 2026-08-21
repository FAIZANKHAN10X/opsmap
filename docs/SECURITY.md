# SECURITY.md

# Security

> This document defines the security architecture, authentication model, authorization rules, validation requirements, and operational security practices for OpsMap.

---

# Philosophy

Security is part of the architecture.

Not a feature.

Not a checklist.

Not something added before launch.

Every layer of the system should assume that input is malicious until proven otherwise.

---

# Core Principles

## Never Trust The Client

The frontend is a convenience.

Not a security boundary.

Everything received from the client must be validated.

Always.

---

## Defense In Depth

Security should exist at multiple layers.

```
Browser

↓

Authentication

↓

Authorization

↓

Validation

↓

Business Rules

↓

Database Constraints

↓

Audit Logs
```

One failed layer should not compromise the system.

---

## Least Privilege

Users should receive only the permissions required to perform their work.

Nothing more.

Permissions should be granted deliberately.

---

## Fail Securely

When uncertain,

deny access.

Security failures should never expose protected data.

---

# Authentication

Authentication is handled by Supabase Auth (email + password via
`signInWithPassword`). Sessions are cookie-based via `@supabase/ssr`:

- `middleware.ts` refreshes the session on every matched request and is the
  authoritative route gate (deny-by-default).
- Unauthenticated requests to protected routes are redirected to `/login`,
  not served with a 401.
- `POST /auth/signout` clears the session cookies and revokes the session
  server-side (POST-only so a plain link can never log anyone out).
- The dashboard layout re-verifies `auth.getUser()` server-side.

The service-role key is never exposed to the browser: it lives only in
server-side environment variables and is used strictly for privileged
operations (storage writes, notification creation).

---

# Authorization (Row-Level Security)

Authentication identifies the user.

Authorization is enforced by Supabase Row-Level Security at the database
layer, using the signed-in user's JWT (`auth.uid()` / `auth.jwt()`):

- **profiles** — a user may read/update only their own row.
- **notifications** — a user may read/update only notifications addressed to
  them (matched by email). Creation is privileged (service_role, server-side).
- **shared tables** (`projects`, `asset_types`, `asset_statuses`, `assets`,
  `documents`) — `authenticated` + `using (true)`: OpsMap is a single-company
  shared workspace with no per-user row ownership.

The `anon` role has no table grants (migration `0005` revokes the pre-RLS
auto-exposed grants and `20260821000001` extends the revoke to `contacts` /
`property_contacts` which were created after the initial revoke; `service_role`
bypasses RLS and is confined to privileged server-side operations). `notifications`
grants are least-privilege: `authenticated` retains only `SELECT`/`UPDATE`
(matching its RLS policies) — `INSERT`/`DELETE` were revoked in
`20260821000001` because creation/deletion is `service_role`-only. Services
remain the authoritative business layer; RLS is defense-in-depth, and every
mutation still validates input and authorization in `lib/server/`.

---

# API Security

Every request validates:

- Authentication
- Authorization
- Request body
- Query parameters
- Path parameters

Reject invalid requests early.

---

# Input Validation

Validate:

- Required fields
- Length
- Format
- Enum values
- UUIDs
- Dates
- Numeric ranges

Never rely on frontend validation.

---

# Output Validation

Do not expose internal fields.

Examples

Never return:

- Internal tokens
- Password hashes
- Secrets
- Service credentials
- Hidden metadata

Return only what clients require.

---

# File Upload Security

Allowed file types should be explicitly defined.

Validate:

- MIME type
- File extension
- File size

Reject executable files.

Store uploaded files outside the database.

Use randomized storage paths.

---

# SQL Injection

Always use the typed Supabase client (PostgREST parameterizes queries) or
parameterized SQL for any raw query.

Never build SQL using string concatenation.

---

# XSS Protection

Treat all user-generated content as untrusted.

Escape rendered content where appropriate.

Avoid rendering raw HTML.

---

# CSRF

Authentication is cookie-based today, so CSRF is a live concern:

- `@supabase/ssr` sessions use `SameSite=Lax` cookies.
- Mutations are Server Actions (POST-only, framework-handled) or the single
  `POST /auth/signout` Route Handler; `GET /auth/signout` is a deliberate 405.
- Never perform state-changing operations on `GET`.

Keep `SameSite` and cookie security flags intact and do not add CORS-permissive
credentials handling.

---

# CORS

Restrict allowed origins.

Never use unrestricted origins in production.

Development and production should have separate configurations.

---

# Rate Limiting

Protect public endpoints.

Examples

Authentication

Password reset

File uploads

Search

Rate limits should be configurable.

---

# Secrets Management

Never store secrets in source code.

Use environment variables or a managed secret store.

Examples

- API keys
- Database URLs
- JWT secrets
- Third-party credentials

Rotate secrets periodically.

---

# Logging

Log important security events.

Examples

- Login
- Logout
- Permission denied
- Password reset
- Role changes
- Failed authentication
- Suspicious activity

Never log:

- Passwords
- Tokens
- Secrets
- Sensitive personal information

---

# Audit Logs

Audit logging is server-side log lines via `lib/server/audit.ts` with
secret/redaction handling. Actions record who/what/when for:

- Asset deleted
- Project archived
- Document removed
- Assignment / notification events

Audit log lines are append-only in the sense that the server controls them and
never logs secrets. A durable, immutable audit table is not yet implemented
(see `docs/MIGRATION.md` risks) — that remains an aspirational hardening item.

---

# Data Protection

Encrypt data in transit using HTTPS.

Sensitive data at rest should rely on managed platform encryption.

Backups should also be encrypted.

---

# Session Management

Sessions should:

- Expire automatically
- Be revocable
- Respect logout
- Invalidate compromised credentials

Never assume long-lived sessions are safe.

---

# Password Policy

Password management is delegated to Supabase Auth.

Avoid implementing custom authentication unless required.

---

# Error Messages

Security errors should reveal minimal information.

Good

```
Invalid credentials.
```

Avoid

```
User exists but password is incorrect.
```

Do not leak implementation details.

---

# AI Security

AI must never:

- Bypass authorization
- Access hidden data
- Execute privileged actions directly
- Invent permissions

Every AI action must pass through the same authorization layer as REST endpoints.

---

# MCP Security

MCP tools should inherit user permissions.

AI tools may only perform actions the requesting user is authorized to perform.

Every tool invocation should be logged.

---

# Background Work

Synchronous derivatives and report generation run inside the server-side
layer; they must re-validate input from the request before processing and
never trust caller-supplied data (defense in depth on top of server-side
validation).

---

# Dependencies

Keep dependencies updated.

Remove unused packages.

Monitor known vulnerabilities.

Prefer mature, actively maintained libraries.

---

# Backups

Backups should be:

- Automated
- Encrypted
- Regularly tested

Recovery procedures should be documented.

---

# Monitoring

Monitor:

- Authentication failures
- Unusual traffic
- Error spikes
- Failed uploads
- Rate-limit events

Alerts should prioritize security-impacting events.

---

# Security Reviews

Before each production release:

- Review new endpoints
- Review permissions
- Review file handling
- Review dependency updates
- Review configuration changes

Security is an ongoing process.

---

# Incident Response

If a security incident occurs:

1. Contain the issue.
2. Preserve logs.
3. Assess impact.
4. Patch the vulnerability.
5. Notify affected stakeholders if required.
6. Record the incident and lessons learned.

---

# Final Principle

Every feature should be designed under the assumption that it will eventually be attacked.

Good security minimizes the impact of mistakes, limits the blast radius of failures, and protects users without compromising usability.
