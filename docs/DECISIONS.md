# DECISIONS.md

# Architecture Decision Records (ADR)

> This document records significant architectural and technical decisions made throughout the lifecycle of OpsMap. Every major decision should include the context, rationale, alternatives considered, trade-offs, and final outcome.

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

Accepted

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

Accepted

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

Accepted

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
- Distributed caching, message brokers (beyond already-accepted Redis + RQ when needed for real work)
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
- Background jobs (Redis + RQ) only when a real slow path exists
- AI remains optional enhancement, not a core dependency

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
