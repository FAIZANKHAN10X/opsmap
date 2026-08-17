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
