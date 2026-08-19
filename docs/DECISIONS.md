# DECISIONS.md

# Architecture Decision Records (ADR)

> This document records significant architectural and technical decisions made throughout the lifecycle of OpsMap. Every major decision should include the context, rationale, alternatives considered, trade-offs, and final outcome.

> **Migration note (Phases 13–14, 2026):** the ADRs below are the historical
> record of the original FastAPI / SQLAlchemy / Alembic / Redis + RQ
> architecture. ADR-001, ADR-005, and ADR-006 are marked **Superseded** by
> [ADR-013](#adr-013), which records the completed migration to Next.js +
> TypeScript + Supabase (see also [`docs/MIGRATION.md`](MIGRATION.md)). The
> older ADRs are preserved as reference for why the original choices were made.

---

# Purpose

Software outlives conversations.

Months later, team members should be able to answer:

- Why was this chosen?
- What alternatives were considered?
- What trade-offs were accepted?
- Is this decision still valid?

This document provides those answers.

---

# Principles

An ADR should be created when a decision:

- Changes architecture
- Introduces new infrastructure
- Changes security
- Affects scalability
- Changes development workflow
- Has long-term maintenance impact

Do not create ADRs for minor implementation details.

---

# ADR Template

Every decision should follow the same format.

```
ADR-XXX

Status

Accepted
Proposed
Deprecated
Superseded

Date

YYYY-MM-DD

Decision

A concise statement describing the decision.

Context

Why was a decision needed?

Options Considered

Option A

Pros

Cons

Option B

Pros

Cons

Decision

Which option was selected?

Consequences

Benefits

Trade-offs

Future Considerations
```

---

# Status Definitions

## Proposed

Still under discussion.

---

## Accepted

Approved and implemented.

---

## Deprecated

No longer recommended.

Existing systems may still rely on it.

---

## Superseded

Replaced by another ADR.

Reference the newer ADR.

---

# ADR-001

Status

Superseded (by ADR-013 — Next.js migration)

Date

2026-07-30 (superseded 2026-08-17)

Decision

Use FastAPI as the backend framework.

Context

OpsMap is API-first and requires high-performance asynchronous request handling.

Options Considered

FastAPI

Pros

- Async-first
- Excellent typing support
- Automatic OpenAPI generation
- Modern ecosystem

Cons

- Smaller ecosystem than Django

Django

Pros

- Mature ecosystem
- Built-in admin
- Large community

Cons

- Heavier framework
- More opinionated
- Unnecessary features for this project

Decision

Use FastAPI.

Consequences

Benefits

- High performance
- Clean API design
- Excellent developer experience

Trade-offs

Admin functionality must be built or added separately.

---

# ADR-002

Status

Accepted

Decision

Use Supabase PostgreSQL.

Context

A managed relational database is required with authentication and storage integration.

Options Considered

Supabase

Pros

- Managed PostgreSQL
- Integrated Auth
- Storage
- Good developer experience

Cons

- Vendor dependency

Self-hosted PostgreSQL

Pros

- Full control

Cons

- Higher operational complexity

Decision

Use Supabase.

Consequences

Benefits

- Faster development
- Managed infrastructure

Trade-offs

Some platform coupling.

---

# ADR-003

Status

Accepted

Decision

Backend owns business logic.

Context

Prevent inconsistent behavior between frontend and backend.

Decision

All calculations, permissions, workflows, and business rules live on the backend.

Consequences

Frontend remains a presentation layer.

Business logic has a single source of truth.

---

# ADR-004

Status

Accepted

Decision

Frontend is a projection of backend state.

Context

Duplicated business logic causes inconsistent behavior.

Decision

Frontend computes presentation.

Backend computes business state.

Consequences

Simpler frontend.

More reliable behavior.

---

# ADR-005

Status

Superseded (by ADR-013 — Next.js migration)

Date

2026-07-30 (superseded 2026-08-17)

Decision

Use SQLAlchemy ORM.

Context

Database access should remain maintainable, typed, and testable.

Decision

Use SQLAlchemy for persistence.

Raw SQL may be used only for justified performance cases.

---

# ADR-006

Status

Superseded (by ADR-013 — Next.js migration)

Date

2026-07-30 (superseded 2026-08-17)

Decision

Use Redis + RQ for background jobs.

Context

The application requires asynchronous processing.

Options Considered

RQ

Celery

Decision

RQ provides sufficient capability with lower operational complexity.

Consequences

Simpler worker architecture.

Future migration remains possible.

---

# ADR-007

Status

Accepted

Decision

Use Supabase Storage.

Context

Documents and media require secure object storage.

Decision

Use managed storage integrated with authentication.

Consequences

Reduced infrastructure maintenance.

---

# ADR-008

Status

Accepted

Decision

Use LangChain for AI orchestration.

Context

Multiple LLM providers and tools are expected over time.

Decision

Abstract AI orchestration through LangChain.

Consequences

Improved flexibility.

Additional dependency introduced.

---

# ADR-009

Status

Accepted

Decision

Adopt Retrieval-Augmented Generation (RAG) for AI features.

Context

AI responses should be grounded in project-specific data.

Decision

Retrieve relevant context before generating responses.

Consequences

Higher answer quality.

Additional indexing complexity.

---

# ADR-010

Status

Accepted

Decision

Adopt Model Context Protocol (MCP).

Context

Future AI assistants require structured access to application capabilities.

Decision

Expose application functionality through MCP-compatible tools.

Consequences

Better AI interoperability.

Additional tooling requirements.

---

# ADR-011

Status

Accepted

Decision

Use a documentation-first development process.

Context

Large systems become inconsistent without shared engineering guidance.

Decision

Core architecture documents must exist before implementation begins.

Consequences

Higher initial effort.

Greater long-term consistency.

---

# ADR-012

Status

Accepted

Date

2026-07-30

Decision

OpsMap is an internal operations tool for a single business with a small trusted user base (~4–5 people). Optimize for simplicity, readability, maintainability, fast feature development, and low operational complexity. Do not introduce architecture that solves problems the product does not have.

Context

Earlier documentation and domain modeling allowed multi-tenant / enterprise-oriented patterns (organizations, multi-customer scale, platform extensibility). The product is not a SaaS offering and is not intended for millions of users. One company, one deployment, one PostgreSQL database, one backend, one frontend.

Options Considered

Option A — Continue designing as a multi-tenant enterprise platform

Pros

- Flexible if product positioning changes later

Cons

- Higher complexity, slower delivery, overbuilt for 4–5 internal users

Option B — Internal-tool simplicity first (selected)

Pros

- Faster features, easier maintenance, lower operational burden

Cons

- Some earlier multi-tenant scaffolding may be simplified over time if unused

Decision

Prefer the simplest solution that satisfies current requirements. Do not build for hypothetical customers, hypothetical scale, or speculative extensibility.

Avoid unless explicitly requested:

- Multi-tenancy and organization hierarchies (unless the business genuinely needs them)
- Microservices, event buses, CQRS, event sourcing
- Generic plugin systems and premature abstraction
- Overly generic repositories
- Complex permission systems and enterprise workflow engines
- Distributed caching, message brokers, and job queues (Redis + RQ were
  accepted earlier but are superseded by ADR-013; reintroduce a queue only
  for a real slow path)
- Premature optimization

When abstraction is considered, justify it with a concrete present need. “Future scalability” or “might be useful later” alone is not sufficient.

Consequences

Benefits

- Clear product scope for implementation decisions
- Faster iteration for an internal team
- Lower cognitive and operational load

Trade-offs

- Existing domain pieces (e.g. Organization) may remain for continuity until a deliberate simplification is requested; new work must not expand multi-tenant platform surface without explicit need
- Revisit this ADR if product scope materially changes (e.g. true multi-customer SaaS)

Future Considerations

- Authentication can stay simple (shared internal users, roles only if needed)
- Background jobs (Redis + RQ, superseded by ADR-013) only if a real slow
  path emerges
- AI remains optional enhancement, not a core dependency

---

# ADR-013

Status

Accepted

Date

2026-08-17

Supersedes

ADR-001 (FastAPI), ADR-005 (SQLAlchemy), ADR-006 (Redis + RQ)

Decision

Replace the Python stack with Next.js + TypeScript + Supabase as the single
application architecture. Next.js (App Router, Server Components, Server
Actions, Route Handlers) owns all business logic; Supabase provides
PostgreSQL, Auth, and Storage.

Context

The original stack (FastAPI + SQLAlchemy + Alembic + Redis + RQ) was
migrated in Phases 0–13 and hardened in Phase 14, including live
verification against a real Supabase project. The product is a single-company
internal tool for a small trusted team, so a two-runtime (Python + Node)
architecture with a job queue added operational complexity without product
need.

Options Considered

- Keep the FastAPI + SQLAlchemy + Redis/RQ stack (hybrid with Next.js): two
  runtimes, two test suites, async infra, no simplification.
- Migrate fully to Next.js + Supabase (selected): one language/runtime, one
  deployment, managed Postgres/Auth/Storage, RLS at the database layer.

Decision Detail

- Business logic lives in the Next.js server-side layer
  (`frontend/lib/server/`: services, repositories, storage, errors,
  validation, pagination, mappers, payloads, audit).
- Mutations are Server Actions; the HTTP surface is limited to a few Route
  Handlers (health, document download/preview/thumbnail, seed-defaults, auth).
- Supabase Auth provides cookie-session auth (`@supabase/ssr` + middleware).
- Row access is enforced by RLS (profiles self-scoped; notifications
  recipient-scoped; shared tables `authenticated` + `using (true)`); the
  service-role key is confined to privileged server-side operations.
- Image derivatives (Sharp) and report generation run synchronously during
  the request; email runs synchronously and is log-only until SMTP is
  configured. No Redis, no RQ, no workers.
- Schema, RLS, and Storage buckets are versioned as SQL migrations under
  `supabase/migrations/` (0001–0005).

Consequences

Benefits

- One language and runtime for the entire product
- RLS provides defense-in-depth at the database layer
- No broker/worker infrastructure to operate
- Synchronous pipelines are simpler and adequate at this scale

Trade-offs

- No async processing; revisit with a job queue only if a real slow path
  emerges (see ADR-012)
- Some platform coupling to Supabase (same trade-off as ADR-002)
- Email delivery is log-only until an SMTP provider is configured

Future Considerations

- Reintroduce background jobs only for a demonstrated slow path
- Replace log-only email with real SMTP delivery when needed
- Keep the same services/repositories layering as the codebase grows

---

# ADR-014

Status

Accepted

Date

2026-08-18

Supersedes

ADR-012 (deferral of the Phase 1 role system)

Decision

Implement the Phase 1 business-user roles (Admin, Manager, Operator, Viewer)
scoped to the single-company RLS model: a `role` column on `profiles` plus
SECURITY DEFINER `user_role()` / `set_user_role()` helpers, role-scoped RLS
write policies, and enforcement at the Server Action layer
(`requireRole`), with a permission-aware client UI. Role changes flow only
through `public.set_user_role()` so users can never escalate themselves.

Context

ADR-012 deferred roles to Phase 14. The product is a single-company internal
tool for a small trusted team. Prior to this ADR, `profiles` had no role
field and every signed-in user was effectively an admin for shared
master-data writes. We needed a minimal, additive role model that cannot
be bypassed by the client and keeps RLS as defense-in-depth rather than the
sole control.

Options Considered

- Full RBAC tables (roles / user_roles / permissions tables): overkill for a
  small trusted team and against ADR-012's "minimal additive" steer.
- Client-side-only gating: rejected — never authoritative.
- Action-layer enforcement only (no RLS): rejected — a future API surface or
  direct PostgREST access would bypass the role checks.
- RLS-only enforcement: rejected — policies are hard to test locally and the
  app already centralizes policy in Server Actions.
- Profiles `role` column + SECURITY DEFINER helper + action-layer enforcement
  + role-scoped RLS write policies (selected).

Decision Detail

- Roles: `viewer` (read-only), `operator` (create/update assets + documents),
  `manager` (+ deletes + project/asset-type/asset-status management),
  `admin` (+ role management). Read access stays
  `authenticated using (true)` for shared tables; writes are role-gated.
- `supabase/migrations/20260818000001_phase14_roles.sql`: `profiles.role`
  with a CHECK constraint; `public.user_role()` (SECURITY DEFINER, reads the
  caller's profile) and `public.set_user_role(target_user_id, new_role)`
  (SECURITY DEFINER, admin-only — the only role-change path, guarding against
  self-escalation); profile self-update policy keeps `role` pinned to
  `user_role()`; admin select/update-all policies; `profiles_role_idx`.
- `frontend/lib/server/authorize.ts`: `requireRole(actor, minimum, action,
  resource)` throws a 403 `ForbiddenError` when the actor is null or below
  the minimum level (viewer < operator < manager < admin). `withServerContext`
  resolves the actor from the session + profiles row (missing profile → role
  `viewer`; unreadable → null → fail closed).
- Mutating Server Actions call `requireRole` first; services populate
  `created_by`/`updated_by` and add the actor to audit lines.
- Client UI uses `usePermissions` (`stores/user-context.tsx`) to hide/disable
  write controls; the server remains authoritative.
- Reports and per-recipient notification state are intentionally not
  role-gated (analytical read / self-scoped state).

Consequences

Benefits

- Minimal additive schema; no roles tables to maintain
- Fail-closed: unauthenticated or unresolved actors get 403 on mutations
- Self-escalation is impossible (role changes only via the SECURITY DEFINER)
- First profile is promoted to admin (`20260819000001_bootstrap_first_admin.sql`)
  so a real owner can create developments/properties; later sign-ups stay viewer
  until an admin assigns a role
- Two enforcement layers (action + RLS) with a simple mental model

Trade-offs

- `viewer` still sees all shared rows (read is not per-row scoped; fine for a
  single-company tool)
- Action-layer checks duplicate some RLS policy logic
- Role changes need an admin UI surface in the future (action + RPC exist)

Future Considerations

- Add an admin UI for `setUserRole`
- Move to per-row read scoping only if multi-company access emerges

---

# ADR-015

Status

Accepted

Date

2026-08-18

Supersedes

None (extends ADR-013's log-only email)

Decision

Send email via SMTP through nodemailer when `SMTP_HOST` is configured;
otherwise keep the validated, log-only fallback from Phase 9. `sendEmail`
never throws — delivery failures are returned as results so assignment
pipelines are never corrupted by a mail outage. SMTP credentials live only
in a server-only module.

Context

ADR-013 kept email synchronous and log-only until an SMTP provider was
configured. Phase 14 (Real-Data Readiness) requires real delivery for
assignment notifications. The environment has no SMTP credentials, so the
feature must degrade safely and be testable without a live mail server.

Options Considered

- Third-party email API (e.g. Resend/SendGrid): adds another provider and
  SDK; the single-company tool already operates an SMTP-capable mail
  server. Revisit if transactional volume grows.
- nodemailer + env-gated SMTP (selected): standard, dependency-light, works
  with any provider's SMTP relay, and degrades to the existing log-only path
  with zero configuration.
- Stay log-only indefinitely: rejected — real delivery is a Phase 14
  completion criterion (documented decision is allowed, but SMTP support
  is strictly better for a small team).

Decision Detail

- `frontend/lib/server/email/config.ts` (server-only): `getSmtpConfig()`
  returns null when `SMTP_HOST` is unset; otherwise host/port (default 587)/
  secure (SMTP_SECURE=`true`)/user/pass/from (MAIL_FROM, default
  `OpsMap <no-reply@opsmap.app>`). `getAppUrl()` from `APP_URL` /
  `NEXT_PUBLIC_APP_URL` (default localhost:3000).
- `frontend/lib/server/email/transport.ts`: `sendViaSmtp` via nodemailer
  `createTransport`; `sendMail` with `text` body; returns ok/failed, never
  throws; `transport.close()` in `finally`.
- `frontend/lib/server/services/email.ts`: validates input and truncates
  subject/body (as Phase 9), then SMTP when configured, else log-only.
- `frontend/.env.example` documents `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/
  `SMTP_USER`/`SMTP_PASS`/`MAIL_FROM`/`APP_URL`; `/api/health` reports
  `email: "smtp" | "log_only"`.
- Dependencies: `nodemailer@^6.9.16` + `@types/nodemailer@^6.4.17`.

Consequences

Benefits

- Real delivery with zero-config fallback for local dev
- Never throws → pipelines stay resilient to mail outages
- Credentials cannot reach client bundles (server-only module)

Trade-offs

- SMTP has no delivery analytics/feedback loop (fine at this scale)
- Requires `MAIL_FROM`/relay reputation tuning for deliverability
- SMTP path is verified by mocked unit tests only (no live credentials)

Future Considerations

- Switch to a provider API (Resend/SendGrid) if volume or deliverability
  demands it
- Add queue-backed delivery only if a real slow path emerges (ADR-012/013)

---

# Creating New ADRs

When introducing a significant architectural change:

1. Create a new ADR.
2. Assign the next sequential number.
3. Record the date.
4. Explain the context.
5. Document alternatives.
6. State the final decision.
7. Describe consequences.
8. Mark the status.

Do not modify historical ADRs after acceptance.

If a decision changes, create a new ADR and mark the previous one as superseded.

History is valuable.

---

# Reviewing ADRs

Major ADRs should be reviewed periodically to ensure they still reflect the project's needs.

If circumstances change:

- Create a new ADR.
- Link to the previous one.
- Explain the rationale for the change.

Avoid rewriting history.

Document evolution instead.

---

# Final Principle

Architecture is the accumulation of decisions.

Code explains **how** the system works.

Architecture Decision Records explain **why** it works that way.

Protecting that knowledge is as important as protecting the code itself.
