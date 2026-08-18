# IDEAS.md

# OpsMap — Future Ideas & Advanced Capabilities

> **This file is a backlog of ideas, not a roadmap.**
>
> The active roadmap (`docs/ROADMAP.md`) is scoped **only** to finishing the
> core 8AM HUB product — the real-estate business/owner platform. This
> document captures advanced capabilities that were previously planned so the
> context is not lost.
>
> Rules of engagement:
>
> - These are **NOT active roadmap commitments.** They are not scheduled.
> - They should **NOT be implemented while the core 8AM HUB roadmap is
>   incomplete.** The active roadmap ends when the core 8AM HUB product is
>   complete and production-ready (see "Roadmap Endpoint" in `ROADMAP.md`).
> - Their presence here does **not** imply a scheduled phase or priority.
> - They can be **reconsidered later** based on actual product needs — some
>   may never be needed at all.
>
> Nothing here should be treated as a promise or a plan.

---

# How to read an entry

Each idea below records:

- **What it was intended to do** — the original intent, preserved.
- **Original roadmap phase** — where it sat in the previous roadmap numbering
  (the "original" number refers to the original OpsMap roadmap; the earlier
  renumbered roadmap listed these as Phases 16–25).
- **Why it might be useful later** — the context that makes it worth revisiting.
- **Status** — `Future Idea` (plausibly useful later) or
  `Not Currently Planned` (no concrete need today).

---

# Ideas

## Recommendations (rule-based)

- **What it was intended to do:** Help users make decisions with a rule-based
  (non-AI) recommendation engine — similar assets, nearby assets, assets with
  similar status, and assets of a similar type.
- **Original roadmap phase:** Phase 16 (original Phase 11).
- **Why it might be useful later:** Once real property data exists, surfacing
  comparable/similar villas and developments could support pricing and
  purchase decisions for the owner team.
- **Status:** Future Idea / Not Currently Planned.

---

## Advanced Analytics

- **What it was intended to do:** Provide operational insights for managers:
  total assets, occupancy, availability, completion rate, revenue, and pending
  tasks, plus charts (asset distribution, status breakdown, project progress,
  activity timeline) so project health is understood at a glance.
- **Original roadmap phase:** Phase 17 (original Phase 12).
- **Why it might be useful later:** The 8AM HUB already shows data-driven KPI
  cards (PLACED, VILLA CAPACITY, SPOTS OPEN, VILLAS SOLD OUT). Deeper
  analytics could extend those KPIs with trends, breakdowns, and exportable
  operational reports once real data volume grows.
- **Status:** Future Idea / Not Currently Planned.

---

## AI Foundation

- **What it was intended to do:** Introduce AI responsibly — asset summaries,
  property description generation, natural language queries, and operational
  insights — enhancing existing workflows without replacing deterministic
  logic.
- **Original roadmap phase:** Phase 19 (original Phase 14).
- **Why it might be useful later:** Generating listing/brochure copy or plain-
  language summaries from property metadata could save the owner team time.
  Should be revisited only after the core product is stable and real data
  exists.
- **Status:** Future Idea / Not Currently Planned.

---

## Vector Search

- **What it was intended to do:** Semantic search over meaning, not just
  keywords — embeddings + a vector database, e.g. "find luxury homes with
  open kitchens" or "show unfinished projects near schools."
- **Original roadmap phase:** Phase 20 (original Phase 15).
- **Why it might be useful later:** Keyword search (Phase 7) may become
  insufficient as property data grows; semantic search would improve
  discoverability.
- **Status:** Future Idea / Not Currently Planned.

---

## RAG — Retrieval-Augmented Generation

- **What it was intended to do:** Let AI answer questions about project
  documentation — contracts, builder brochures, maintenance manuals,
  inspection reports, internal docs — by retrieving relevant documents and
  synthesizing an answer with an LLM.
- **Original roadmap phase:** Phase 21 (original Phase 16).
- **Why it might be useful later:** The document store (Phase 8) is a rich
  corpus; question-answering over contracts/inspection reports could be
  genuinely valuable once there is enough real documentation.
- **Status:** Future Idea / Not Currently Planned.

---

## MCP — Model Context Protocol

- **What it was intended to do:** Turn the AI into an operator by exposing
  internal tools (`search_assets()`, `update_asset()`, `assign_employee()`,
  `create_task()`, `upload_document()`, `schedule_inspection()`,
  `generate_report()`) so an AI performs actions using real tools instead of
  generating guesses.
- **Original roadmap phase:** Phase 22 (original Phase 17).
- **Why it might be useful later:** If an AI assistant is ever introduced,
  tool-calling over the existing action layer would be the natural
  integration point — the Server Actions already provide the tool surface.
- **Status:** Future Idea / Not Currently Planned.

---

## Enterprise Features

- **What it was intended to do:** Organizations, multi-tenancy, teams,
  departments, custom roles, project templates, and import/export.
- **Original roadmap phase:** Phase 23 (original Phase 18).
- **Why it might be useful later:** The product is currently a single-company
  owner platform; multi-tenancy and teams only matter if OpsMap is sold to
  multiple organizations.
- **Status:** Not Currently Planned.

---

## Performance Optimization

- **What it was intended to do:** Optimize query performance, pagination,
  caching, lazy loading, virtualized lists, and image optimization — explicitly
  measurement-driven (only after profiling).
- **Original roadmap phase:** Phase 24 (original Phase 19).
- **Why it might be useful later:** Performance work should only happen when
  real data shows it is needed. Production-required items (database indexes,
  Lighthouse, asset optimization) are already part of the active roadmap
  (Phase 17 — Production Readiness, Deployment & Validation).
- **Status:** Future Idea / Not Currently Planned.

---

# Retained from the old roadmap (not ideas)

For clarity, two previously "advanced" phases were **kept** in the active
roadmap because they are genuine requirements for finishing the 8AM HUB
product:

- **Audit Logs** (formerly Phase 18 / original Phase 13) → now
  **Phase 16 — Audit Logs & Security Hardening** (durable, immutable audit
  table; appropriate audit metadata/security hardening is part of the core
  product).
- **Production Readiness** (formerly Phase 25 / original Phase 20) → now
  **Phase 17 — Production Readiness, Deployment & Validation** (deploying and
  validating the actual product is the roadmap endpoint).

---

# Non-goals (also captured)

`docs/ROADMAP.md` lists features that are explicitly out of scope for the
core product (native mobile apps, billing/subscriptions, payment gateways,
live chat, video calls, workflow builders, autonomous AI agents, predictive
analytics, IoT integrations, offline mode, microservices). Those non-goals
remain there; they can be revisited only as ideas, never as scheduled work.