# SYSTEM_PRINCIPLES.md

# System Principles

> This document defines the engineering philosophy and architectural rules of OpsMap. Every feature, service, and design decision should follow these principles.

---

# Philosophy

The software should remain simple internally while being powerful externally.

Complexity should emerge from well-designed systems working together, not from large components doing everything.

Every new feature must justify its existence.

---

# Product Scope (Internal Tool)

OpsMap is an **internal operations tool** for a single business.

It is **not** a multi-tenant SaaS product and is **not** designed for massive scale.

Expected context:

- One company
- One deployment
- One PostgreSQL database
- One backend
- One frontend
- Approximately 4–5 trusted internal users

Optimize for:

- Simplicity
- Readability
- Maintainability
- Fast feature development
- Low operational complexity

Do **not** introduce architecture that solves problems we do not have.

Do **not** build for hypothetical future customers or hypothetical scale.

Prefer straightforward, clean code over extensible designs whose only justification is “we might need it later.”

If additional abstraction seems necessary, explain the **present** requirement first. “Future scalability” alone is not enough.

See **ADR-012** in `DECISIONS.md`.

---

# Core Principles

## 1. Database Is The Source of Truth

The database owns all business state.

The frontend never invents data.

The backend never duplicates data.

The UI never stores permanent business state.

Everything displayed in the interface is computed from the current database state.

Never maintain multiple sources of truth.

---

## 2. UI Is A Projection

The interface is not the application.

It is a visual projection of business data.

```
Database

↓

Business Logic

↓

Computed State

↓

UI
```

If the data changes, the UI changes.

Never manually synchronize visual state.

---

## 3. Business Logic Belongs In The Backend

Business rules should never live inside React components.

Examples of backend logic:

- Asset status
- Availability
- Permissions
- Recommendations
- Calculations
- Validation
- Search ranking

Frontend responsibilities:

- Display data
- Collect user input
- Handle interactions

Nothing more.

---

## 4. Every Service Has One Responsibility

A service should solve one problem well.

Good examples:

Authentication Service

Search Service

Recommendation Service

Notification Service

Document Service

Image Service

Avoid services that know everything.

---

## 5. APIs Are Stateless

Every API request should contain everything required to complete it.

Servers should not rely on previous requests.

Benefits:

- Easier scaling
- Simpler debugging
- Better reliability

---

## 6. Composition Over Duplication

If the same logic exists twice, it belongs somewhere else.

Reuse:

- components
- services
- utilities
- hooks

Avoid copy-paste development.

---

## 7. Build Features, Not Pages

Think in capabilities.

Not:

Property Page

Dashboard Page

Settings Page

Instead:

Asset Management

Search

Authentication

Notifications

Documents

Recommendations

Pages simply assemble capabilities.

---

## 8. Progressive Complexity

Do not build for imaginary future requirements.

Build the simplest solution that supports today's needs.

Expand only when necessary.

Avoid premature abstraction.

---

## 9. AI Is An Enhancement

The platform must work perfectly without AI.

AI should improve workflows.

Never become a dependency.

Examples:

Good

Summaries

Recommendations

Document search

Natural language search

Poor

Replacing simple filters

Replacing CRUD operations

Replacing deterministic business rules

---

## 10. Compute Instead Of Store

Whenever possible:

Store facts.

Compute results.

Example

Store:

Payment amount

Deposit

Total price

Compute:

Remaining balance

Do not store values that can always be derived.

---

## 11. Explicit Is Better Than Magic

Developers should understand what happens.

Avoid hidden behavior.

Avoid clever code.

Readable systems outperform clever systems.

---

## 12. Favor Predictability

Users should always know:

What happened

Why it happened

What will happen next

Software should never surprise users.

---

# Backend Principles

---

## Thin Routes

Routes should be small.

Routes receive requests.

Services perform work.

```
Route

↓

Validation

↓

Service

↓

Database

↓

Response
```

Routes should never contain business logic.

---

## Services Own Logic

Business rules belong in services.

Example

Bad

```
route.py

if property.is_sold:
```

Good

```
PropertyService

determine_status()
```

---

## Models Represent Reality

Database models describe the business.

Not the interface.

Models should be independent of frontend requirements.

---

## Validation Everywhere

Never trust client input.

Validate:

- API requests
- Uploaded files
- Query parameters
- Authentication
- Permissions

Every request.

---

# Frontend Principles

---

## Server Owns Data

React should not become another database.

The frontend requests information.

The backend owns information.

---

## Components Stay Small

Each component should have one purpose.

Examples

Sidebar

Map

Asset Card

Status Badge

Toolbar

Filters

Avoid giant components.

---

## State Has Levels

Local UI state

Dropdowns

Modals

Selections

Server state

Assets

Users

Projects

Search

Do not mix them.

---

## Design For Scale

Everything should work for:

10 assets

100 assets

10,000 assets

Avoid assumptions based on small datasets.

---

# Database Principles

---

## Normalize First

Avoid duplicated information.

Relationships should reflect reality.

Example

Project

contains

Assets

Assets

belong to

Projects

Do not duplicate project information inside every asset.

---

## IDs Never Change

Every record receives a permanent identifier.

Names may change.

IDs do not.

---

## Relationships Matter

Design relationships carefully.

Projects

↓

Assets

↓

Tasks

↓

Documents

↓

Payments

↓

Employees

The data model should mirror the business.

---

# Search Principles

Search is its own capability.

Search should never become tightly coupled to the UI.

Future implementations may change without affecting frontend code.

Possible implementations:

SQL

Full-text search

Semantic search

Vector search

The interface should not care.

---

# Recommendation Principles

Recommendations should begin with deterministic logic.

Example

Similar location

Similar price

Same category

Nearby assets

Only introduce AI when deterministic methods reach their limits.

---

# Background Job Principles

Long-running work should never block users.

Examples

Image processing

Email

Reports

AI processing

Document indexing

Generate thumbnails

If something takes time, move it to a worker.

---

# AI Principles

AI should never replace deterministic systems.

Use AI where uncertainty exists.

Good examples

Summaries

Classification

Recommendations

Question answering

Comparisons

Bad examples

Math

Permissions

Authentication

Business rules

Financial calculations

Anything requiring exact correctness.

---

# Security Principles

Every request is authenticated.

Every action is authorized.

Never expose internal identifiers unnecessarily.

Never trust frontend validation.

Log important operations.

Protect uploaded documents.

Validate file types.

Rate limit public APIs.

Security is built into the architecture.

Not added later.

---

# Performance Principles

Measure before optimizing.

Optimize only where necessary.

Prioritize:

Correctness

Maintainability

Readability

Performance improvements should never make the system harder to understand without measurable benefit.

---

# Error Handling

Errors should be:

Expected

Meaningful

Recoverable

Every failure should provide enough information for both users and developers.

Avoid silent failures.

---

# Logging

Important actions should be traceable.

Examples

Login

Logout

Asset updates

Status changes

Document uploads

Permission changes

Search failures

Background job failures

Logs should explain what happened.

Not simply that something failed.

---

# Extensibility

Every subsystem should be replaceable.

Examples

Today

SQL Search

Tomorrow

Vector Search

Today

Simple Recommendations

Tomorrow

LLM Recommendations

Today

Email Notifications

Tomorrow

Slack

Teams

WhatsApp

Changing implementations should require minimal changes elsewhere.

---

# Engineering Mindset

When building any feature, ask:

Does this duplicate existing logic?

Can this responsibility live somewhere better?

Does this scale?

Can another developer understand it in six months?

Does this solve a real problem?

Would removing this simplify the system?

If the answer to the last question is "yes", reconsider adding it.

---

# Definition of Good Architecture

Good architecture is not measured by:

Number of services

Number of patterns

Number of technologies

It is measured by:

Clarity

Separation of concerns

Ease of change

Reliability

Predictability

Maintainability

A well-designed system should feel obvious after it has been built.

---

# Final Principle

The platform should always prioritize simplicity, correctness, and maintainability over unnecessary sophistication.

Software ages.

Clear architecture ages far better than clever architecture.
