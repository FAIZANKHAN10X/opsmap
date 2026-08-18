# ARCHITECTURE.md

# OpsMap Architecture

> **Scope note (2026-08):** the active roadmap (`docs/ROADMAP.md`) is scoped
> only to finishing the core **8AM HUB** real-estate owner product. Sections
> of this document that describe future capabilities (recommendations,
> vector search, RAG, MCP) are **reference material for future ideas** — they
> are tracked in `docs/IDEAS.md` and are not active commitments.

> This document describes the technical architecture of OpsMap. It explains how the system is organized, how services communicate, and where responsibilities belong.

---

# Architecture Philosophy

OpsMap follows a modular service-oriented architecture.

The system should remain easy to understand while allowing future expansion.

Every module owns one responsibility.

Every dependency must exist for a reason.

---

# High-Level Architecture

```
                        Browser

                           │

                      Next.js Frontend
                 (React + TypeScript + Tailwind)

                           │
                     Server Actions /
                     Route Handlers
                           │

                  Next.js Server-side Layer
            (lib/server: repositories + services)

                           │

                       Supabase Platform
      ┌──────────────┼──────────────┐
      │              │              │
   PostgreSQL      Storage        Auth
                           │

              External AI Services
      ┌──────────────┼──────────────┐
      │              │              │
      LLM API     Vector DB     Future MCP
```

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- TailwindCSS

Responsibilities

- Dashboard
- Interactive map
- Forms
- Tables
- Filters
- API communication
- Client-side interactions

The frontend should never contain business logic.

---

## Backend

The Next.js server-side layer (`lib/server/`).

Responsibilities

- Server Actions and Route Handlers
- Authentication (Supabase Auth)
- Validation
- Business rules
- Service orchestration

Business logic lives server-side; the browser never runs it.

---

## Database

Supabase

Using

- PostgreSQL
- Authentication
- Storage

Supabase is the single source of truth.

---

## Data Access

Typed Supabase client (`@supabase/supabase-js`) + PostgreSQL schema.

Responsibilities

- Repositories (`lib/server/repositories/`)
- Row→domain mappers
- Queries
- Relationships

Business logic should never live inside data-access models.

---

## Background Processing

None. Reports and image derivatives run synchronously in the server-side
layer; email runs synchronously and is log-only until SMTP is configured.

The API should remain fast.

Anything slow belongs outside the request path (a future decision).

---

# Repository Structure

```
opsmap/

docs/

frontend/

supabase/

scripts/

README.md
```

---

# Frontend Structure

```
frontend/

app/

actions/

components/

features/

hooks/

lib/

lib/server/

middleware.ts

services/

stores/

styles/

types/

tests/

utils/

public/
```

---

## app/

Contains routing.

Responsible only for page composition.

No business logic.

---

## components/

Reusable UI.

Examples

Sidebar

Topbar

Button

Card

Modal

Status Badge

Asset Card

---

## features/

Feature-specific UI.

Examples

Asset Management

Search

Authentication

Projects

Dashboard

Map

Each feature owns its own components.

---

## hooks/

Reusable React hooks.

Examples

useAssets()

useProjects()

useSearch()

---

## services/

Frontend API layer.

Responsibilities

- HTTP requests
- Authentication
- Error handling

React components should never call fetch directly.

---

## lib/

Utilities

Formatting

Constants

Helpers

Configuration

---

## types/

Shared TypeScript types.

---

# Server-side Structure

```
frontend/lib/server/

errors.ts          AppError hierarchy + envelopes

action-context.ts  wraps Server Actions

http.ts            wraps Route Handler responses

audit.ts           redacting audit logger

repositories/      data access

services/          business logic

storage.ts         Supabase Storage (documents, reports)

constants.ts       shared constants

pagination.ts      pagination math

validation.ts      input validation

mappers.ts         row → domain mappers

payloads.ts        request/response payload shapes
```

---

## repositories/

Database access.

Responsibilities

Queries

CRUD

Pagination

Filtering

Handlers should never talk directly to Supabase clients.

---

## services/

Business logic.

Examples

AssetService

ProjectService

SearchService

NotificationService

DocumentService

ReportService

---

## services/storage.ts

Supabase Storage bucket access for document binaries and generated report
artifacts.

---

# API Layer

## actions/

Server Actions ("use server") — mutations and reads consumed by components.

Responsibilities

Receive inputs

Validate

Call services

Return envelopes

Nothing more.

---

## app/api/

Route Handlers — external HTTP surface.

Examples

/health

/asset-statuses/seed-defaults

/documents/[id]/download

/documents/[id]/preview

/documents/[id]/thumbnail

---

# Services

---

## Authentication Service

Auth is provided by Supabase Auth, not an in-app service.

Login

Password sign-in via `signInWithPassword` (client) on `/login`

Logout

`POST /auth/signout` (Route Handler; POST-only so a plain link can never log anyone out)

Session validation

`middleware.ts` refreshes the cookie session on every matched request and
gates protected routes (deny-by-default → redirect to `/login`); the
dashboard layout re-verifies `auth.getUser()` server-side.

Authorization

RLS scopes rows per user (see "Authorization" below). There is no role
system.

---

## Project Service

Owns

Projects

Project settings

Project metadata

---

## Asset Service

Owns

Assets

Status

Assignment

Availability

Operations

---

## Search Service

Responsibilities

Keyword search

Filtering

Sorting

Ranking

Initially uses PostgreSQL.

Later can use semantic search.

---

## Recommendation Service

Future (see `docs/ROADMAP.md`).

Initially

Rule-based

Future

AI-assisted

Responsibilities

Related assets

Nearby assets

Similar assets

Risk suggestions

---

## Document Service

Responsibilities

Upload

Download

Storage

Metadata

Permissions

Future

Document indexing

---

## Notification Service

Responsibilities

Emails

Alerts

Future

Slack

Teams

WhatsApp

---

# API Design

The HTTP surface is deliberately small. Business mutations are Server Actions
(`actions/`), not HTTP endpoints. Route Handlers (`app/api/`) exist only where
a raw HTTP response is required:

```
GET  /api/health
POST /api/asset-statuses/seed-defaults
GET  /api/documents/[id]/download
GET  /api/documents/[id]/preview
GET  /api/documents/[id]/thumbnail
GET  /auth/callback
POST /auth/signout
```

Every action and Route Handler returns the shared envelope
`{success, data, pagination, error}` with stable error codes (see
`lib/server/errors.ts`). The historical FastAPI `/api/v1` REST contract is
recorded in `docs/API_SPEC.md`.

---

# Request Flow

```
Browser

↓

Server Action / Route Handler

↓

Validation

↓

Service

↓

Repository

↓

Supabase (PostgreSQL / Storage / Auth)

↓

Service

↓

Response

↓

Frontend
```

Business logic lives only inside services.

---

# Data Flow

```
User

↓

Frontend

↓

API

↓

Service

↓

Database

↓

Computed Result

↓

Frontend

↓

UI
```

---

# Image Derivative Flow

```
User uploads image

↓

Server Action stores original

↓

Synchronous derivative pipeline

↓

Resize

↓

Generate Thumbnail

↓

Update Database (paths)

↓

Frontend receives update
```

---

# Search Architecture

Phase 1

PostgreSQL

Full-text search

Ranking

Filters

Sorting

---

Phase 2

Semantic Search

Embeddings

Vector Database

Similarity

Natural language search

Frontend remains unchanged.

---

# Recommendation Architecture

Phase 1

Deterministic

Price

Location

Status

Category

Owner

---

Phase 2

AI-assisted

Embeddings

Similarity

Behavior

Usage

---

# File Storage

Supabase Storage, two private buckets

```
documents/   original uploads + image derivatives (resized/thumbnail)
reports/     generated JSON report summaries
```

Buckets are `public = false`. Binaries are read/written server-side through
the service-role client (`lib/server/storage.ts`) and served via the
document Route Handlers; client-facing storage RLS is therefore not required.

Never store files inside PostgreSQL.

---

# Security

Authentication

Authorization

Role-Based Access

Validation

Rate Limiting

Audit Logs

Every endpoint should verify permissions.

---

# Authorization

There is no role system. Row access is governed by Supabase RLS:

- `profiles` — a user may read/update only their own row (`auth.uid()`).
- `notifications` — a user may read/update only notifications addressed to
  them (matched by email). Creation is privileged (service_role, server-side).
- shared tables (`projects`, `asset_types`, `asset_statuses`, `assets`,
  `documents`) — `authenticated` + `using (true)` because OpsMap is a
  single-company shared workspace with no per-user row ownership.

The `anon` role has no table grants (migration `0005` revokes the pre-RLS
auto-exposed grants); `service_role` bypasses RLS and is used only for
privileged server-side operations.

---

# Logging

Log

Authentication

Errors

Uploads

Changes

Permission updates

Background jobs

Search failures

Logs should explain actions.

Not simply failures.

---

# Future AI Layer

The AI layer is optional.

The application must function completely without it.

Future AI services include

Property summaries

Natural language search

Document Q&A

Recommendations

Workflow automation

---

# Future RAG

```
Documents

↓

Chunking

↓

Embeddings

↓

Vector Database

↓

Relevant Chunks

↓

LLM

↓

Answer
```

Used only where semantic understanding is valuable.

---

# Future MCP

The application exposes internal capabilities as tools.

Examples

search_assets()

update_asset()

assign_user()

create_task()

upload_document()

schedule_inspection()

AI should call tools instead of inventing answers.

---

# Scalability

The architecture should support

Single project

Multiple projects

Thousands of assets

Role isolation (authentication is live; authorization is RLS-scoped, no role system)

Cloud deployment

OpsMap is a single-company internal deployment. There is no multi-tenant organization layer.

The frontend should remain unchanged as the backend grows.

---

# Deployment

Frontend

Vercel (or any Node host)

Database

Supabase

Storage

Supabase Storage

Vector Database

Cloud provider

No local infrastructure is required beyond development.

---

# Architectural Goal

The architecture should make it easy to:

- Add new asset types
- Replace services
- Introduce AI
- Scale to larger datasets
- Integrate external systems
- Maintain the codebase over time

A developer joining the project should understand where new functionality belongs without needing to refactor existing modules.
