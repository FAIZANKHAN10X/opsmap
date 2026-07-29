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

Authentication is handled by Supabase Auth.

The backend trusts verified tokens only.

Every authenticated request must include:

```
Authorization: Bearer <access_token>
```

Unauthenticated requests receive:

```
401 Unauthorized
```

---

# Authorization

Authentication identifies the user.

Authorization determines what they may do.

Every protected endpoint performs authorization checks.

Never assume because a user is authenticated that they are authorized.

---

# Role-Based Access Control (RBAC)

Example roles

- Admin
- Manager
- Operator
- Viewer

Permissions are assigned to roles.

Examples

```
View Assets

Edit Assets

Delete Assets

Manage Users

Upload Documents

Export Reports
```

Components should derive behavior from permissions.

Not role names.

---

# Object-Level Permissions

Role checks alone are insufficient.

Example

A manager may edit only projects they belong to.

Authorization should validate:

- Role
- Organization
- Project
- Ownership
- Resource state

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

Always use parameterized queries through SQLAlchemy.

Never build SQL using string concatenation.

---

# XSS Protection

Treat all user-generated content as untrusted.

Escape rendered content where appropriate.

Avoid rendering raw HTML.

---

# CSRF

If cookie-based authentication is introduced in the future, implement CSRF protection.

Current bearer-token authentication reduces CSRF exposure but should still follow best practices.

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

Business-critical actions should be immutable.

Examples

- Asset deleted
- Project archived
- User invited
- Role changed
- Document removed

Audit logs should never be editable.

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

# Background Jobs

Workers should validate input before execution.

Jobs should never assume queued data is trustworthy.

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
