# DATABASE.md

# Database Design

> This document defines the database philosophy, entity relationships, naming conventions, normalization strategy, indexing approach, and future scalability guidelines for OpsMap.

---

# Philosophy

The database is the foundation of the platform.

Every feature ultimately depends on correctly modeled data.

A poorly designed database creates complexity everywhere else.

The database should represent the real business—not the user interface.

---

# Design Principles

## Single Source of Truth

Every piece of business data should exist in exactly one place.

Never duplicate information for convenience.

Compute values instead of storing them whenever possible.

---

## Model Reality

Tables should represent real business entities.

Examples

- Project
- Asset
- User
- Task
- Document
- Assignment

Avoid creating tables simply because a page needs them.

---

## Normalize First

Normalize data before considering denormalization.

Only duplicate data when measurements prove it is necessary.

---

## Stable IDs

Every record receives a permanent UUID.

Names may change.

Relationships may change.

IDs never change.

Every table should use:

```
id UUID PRIMARY KEY
```

---

# Primary Entity Hierarchy

```
Project                    ← root operational entity
│
├── Assets
│   └── assignees          (free-text JSONB, no assignments table)
│
├── Documents
│
├── Tasks                  (future)
│
└── Activity Logs          (future)

AssetType                  ← global configuration
AssetStatus                ← global configuration
Profile                    ← one row per Supabase Auth user
```

OpsMap is a single-company internal deployment. There is no multi-tenant Organization layer.

Projects are the primary operational boundary.

Assets always belong to a project.

Asset types and statuses are global configuration shared across all projects.

---

# Core Entities

## User (Auth + Profile)

Users live in Supabase Auth, not in an application `users` table.

The `profiles` table (one row per Auth user, created by the
`handle_new_user` trigger) stores:

- id (→ `auth.users(id)`)
- email
- full_name

Roles, preferences, and status are not modeled yet. There is no role system.

---

## Project

Represents a single operational environment.

Examples

- Housing Society
- Hotel
- Warehouse
- Factory
- Stadium
- Solar Farm

Projects own nearly every operational record.

---

## Asset

The most important entity.

Represents a physical object.

Examples

- Villa
- Apartment
- Parking Space
- Machine
- Hotel Room
- Hospital Bed
- Solar Panel
- Warehouse Rack

The application should never assume a specific asset type.

Assets are generic.

Behavior comes from metadata.

---

## Asset Type

Defines categories.

Examples

Villa

Apartment

Machine

Parking

Room

Rack

Keeping types separate allows future customization.

---

## Asset Status

Represents operational state.

Examples

Available

Occupied

Reserved

Maintenance

Offline

Completed

Statuses should be configurable.

Never hardcode them.

---

## Assignment

Assignments are free-text on the asset, not a separate table.

`assets.assignees` is a JSONB array of email/name strings; `assets.owner` is a
single free-text string.

Examples

Maintenance engineer

Sales representative

Operator

Security

Multiple assignees are supported (array). A dedicated assignments table may
come later if assignments need their own lifecycle.

---

## Task

Future (see `docs/ROADMAP.md`).

Represents work.

Examples

Inspection

Repair

Cleaning

Installation

Tasks belong to assets.

Not users.

Users are assigned to tasks.

---

## Document

Represents uploaded files.

Examples

Contracts

Manuals

Blueprints

Reports

Invoices

Documents belong to business entities.

Never to folders alone.

---

## Activity Log

Future (see `docs/ROADMAP.md`). Today, audit is server log lines only
(`lib/server/audit.ts`), not a table.

Immutable record of important actions.

Examples

Status changed

Asset assigned

User invited

Document uploaded

Activity logs should never be edited.

---

# Relationships

```
Projects

↓

Assets

↓

Documents

↓

Tasks (future)

↓

Activity (future)
```

AssetType and AssetStatus are referenced by Assets and are not nested under Project.

Users interact across projects and assets.

Assignments create relationships.

---

# Relationship Philosophy

Prefer explicit relationships.

Example

```
Asset

↓

Project
```

Instead of

```
project_name

project_location

project_city
```

Store references.

Not duplicated values.

---

# Foreign Keys

Every relationship should use foreign keys.

Example

```
asset.project_id

task.asset_id

document.asset_id

assignment.user_id
```

Never store relationship names.

Always store IDs.

---

# UUID Strategy

All primary keys use UUIDs.

Reasons

- Globally unique
- Safe for distributed systems
- Difficult to guess
- Better for future integrations

Avoid integer IDs.

---

# Audit Fields

Every mutable table should include:

```
created_at

updated_at

created_by

updated_by
```

This provides traceability across the platform.

Current state: `created_at`/`updated_at` are populated; `created_by`/
`updated_by` remain nullable and are not yet populated (legacy pre-auth
model).

---

# Soft Deletes

Avoid permanent deletion for business records.

Use:

```
deleted_at
```

instead of physical deletion.

Benefits

- Recovery
- Audit
- Reporting
- Historical accuracy

Some entities, such as activity logs, should never be deleted.

---

# Status Fields

Avoid multiple boolean columns.

Bad

```
is_available

is_reserved

is_sold
```

Good

```
status
```

Statuses should come from controlled enums or lookup tables.

---

# Metadata

Avoid adding dozens of nullable columns for asset-specific information.

Instead:

Core attributes remain structured.

Specialized attributes belong inside metadata.

Example

```
metadata

↓

{
  "bedrooms": 4,
  "parking": 2,
  "solar_capacity": "15kW"
}
```

Use metadata only for genuinely variable properties.

Business-critical fields should remain first-class columns.

**Real-estate specialization (2026-08):** for the primary **8AM HUB** real-estate
use case, `assets.metadata` carries property-specific fields — address, area,
bedrooms, bathrooms, price, floor, has_pool, images, pax/capacity, and map
coordinates (`map_x`/`map_y`, and later `latitude`/`longitude` for geographic
pins). These are additive and consistent with the existing generalized model
(see the "Figma → current OpsMap" mapping in `docs/ROADMAP.md`). Do not add
dozens of nullable columns for them.

The 8AM HUB dashboard KPIs are data-driven: PLACED (OPS), VILLA CAPACITY,
SPOTS OPEN, and VILLAS SOLD OUT derive from asset status counts plus
capacity/pax metadata. User-facing status terminology (OPEN / FILLING /
SOLD OUT / NO OPS DATA) maps onto the existing configurable status engine;
no new status tables are required by the roadmap.

**Demo data isolation (2026-08):** any demo/mock dataset (roadmap Phase 13)
must remain cleanly separated from production/real data — it must never be
indistinguishable from real records, must never overwrite production rows, and
must be removable without destructive restructuring. Prefer additive,
isolated mechanisms (dedicated dataset/flag/schema or isolated records) over
in-place seeding.

---

# Naming Conventions

Tables

Plural

```
projects

assets

documents

tasks
```

Columns

Snake case

```
created_at

updated_at

project_id

asset_type_id
```

Foreign keys

Always end with

```
_id
```

---

# Indexing Strategy

Index frequently queried fields.

Examples

```
project_id

status

asset_type_id

created_at

updated_at
```

Composite indexes should reflect real query patterns.

Example

```
(project_id, status)

(project_id, asset_type_id)

(status, updated_at)
```

Do not index every column.

Indexes have maintenance costs.

---

# Search Strategy

Phase 1

PostgreSQL full-text search.

Phase 2

Hybrid search.

SQL

-

Embeddings

Phase 3

Semantic retrieval.

Search implementation should remain isolated from database design.

---

# Transactions

Use transactions whenever multiple records must remain consistent.

Examples

Assigning users

Updating asset status

Bulk operations

Financial operations

Either all changes succeed,

or none do.

---

# Constraints

Prefer database constraints over application assumptions.

Examples

- Foreign keys
- Unique constraints
- Check constraints
- NOT NULL where appropriate

The database should protect itself.

---

# File Storage

Never store uploaded files inside PostgreSQL.

Only store metadata.

Store binaries in Supabase Storage (buckets `documents` and `reports`, both
private).

Database stores

- filename
- mime type
- size
- storage path
- thumbnail/resized paths (image derivatives)
- owner
- timestamps

---

# Deployment Scope

OpsMap targets a single company and a single deployment.

Do not introduce multi-tenant organization hierarchies unless product requirements change and a new ADR supersedes this model.

---

# AI Readiness

The schema should support future AI features without redesign.

Examples

- Vector references
- Embedding status
- Document indexing
- AI summaries
- Recommendation metadata

These should be added through extension tables rather than modifying core entities unnecessarily.

---

# Scalability Principles

The database should comfortably support:

- Large numbers of assets within a company deployment
- Large activity record volumes
- A small number of concurrent internal users
- Large document collections

Performance should come from good schema design before optimization.

---

# Database Evolution

Database changes should be additive whenever possible.

Avoid breaking migrations.

Prefer:

Add columns.

Add tables.

Add relationships.

Over:

Renaming or removing existing structures.

Every schema migration should preserve data integrity.

---

# Final Principle

The database is the operational model of the business.

The frontend visualizes it.

The backend protects it.

The AI understands it.

Everything else in OpsMap is built upon this foundation.
