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
- role (`admin|manager|operator|viewer`, default `viewer`; see
  `20260818000001_phase14_roles.sql`, ADR-014 — `public.user_role()` /
  `public.set_user_role()` SECURITY DEFINER, admin-only, self-escalation
  guarded)

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

Defines property categories (owner-facing "Property Type"). The canonical
taxonomy is seeded by `20260822000001_canonical_property_types.sql` and
`DEFAULT_ASSET_TYPES` (`lib/server/constants.ts`):

Villa, House, Apartment, Land, Commercial, Other

Stale Phase-14-generated types (`phase14-type-*`) are soft-deleted by that
migration; assets referencing them were remapped to `villa` first. Keeping
types separate allows future customization.

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

## Contact

First-class business entity (Phase 15). Workspace-global, not project-scoped.

People behind the properties: owners, clients, agents, vendors, leads.

Examples

`full_name`

`company`

`email`

`phone`

`whatsapp`

`notes`

`type` is one of `lead`, `client`, `owner`, `agent`, `vendor`, `other`.

Contacts carry the standard audit columns (`created_by`, `updated_by`) and
soft delete (`deleted_at`).

---

## Property Contact

Explicit many-to-many join between `contacts` and `assets`, giving each
relationship a role.

`property_contacts.role` is one of `owner`, `assignee`, `agent`, `client`,
`vendor`, `other`.

The unique constraint `(asset_id, contact_id, role)` prevents duplicate or
multi-property-role rows for the same contact on the same asset.

Contacts are backfilled from `assets.owner` (type `owner`) and
`assets.assignees` (type `other`); the legacy free-text fields remain as the
source of truth until explicitly migrated.

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

Contacts ⇄ Assets (property_contacts join, role-scoped)

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
`updated_by` are populated from `profiles` for `projects`, `assets`,
`asset_types`, `asset_statuses`, and `documents` (Phase 14 — nullable for
legacy rows, non-null for new writes via server actions).

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
pins). Property media files live in the existing `documents` table/storage
bucket with `category: image`; the optional primary/cover image is
`metadata.cover_document_id` (a document UUID), not a separate media table.
These are additive and consistent with the existing generalized model
(see the "Figma → current OpsMap" mapping in `docs/ROADMAP.md`). Do not add
dozens of nullable columns for them.

**Canonical property model (Phase 15, 2026-08):** validated metadata keys are
enforced at the service boundary by `normalizeOperationalMetadata`
(`lib/server/validation.ts`):
- counts (int ≥ 0): `capacity`, `pax`, `placed`, `bedrooms`, `parking`
- numbers (finite ≥ 0): `bathrooms` (decimals allowed), `area_sqm`,
  `plot_area_sqm`, `price`
- strings (trim, ≤ 500 chars): `address`, `floor`, `view`, `furnishing`
- string array: `features` (deduped, ≤ 30 items)
- coordinates (finite): `map_x`, `map_y`; cover image stays
  `metadata.cover_document_id`

**Real geographic positioning (P0 map, 2026-08):** `assets` carries first-class
nullable `latitude numeric(9,6)` / `longitude numeric(9,6)` columns (WGS84,
CHECK-constrained to valid ranges via `chk_assets_latitude`/`chk_assets_longitude`,
migration `20260822000002_asset_geo_coordinates`). A property is *placed* only
when both are set; service-layer validation (`normalizeCoordinates`) enforces
both-or-none and range checks. Plain numerics by design — PostGIS is deferred
until proximity/spatial queries exist. The legacy `metadata.map_x`/`map_y`
site-plan pixels remain historical only and are not written by the current UI.
The property map is rendered via Google Maps (`@vis.gl/react-google-maps` in
`frontend/features/map/`; `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` /
`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` — see `frontend/.env.example` and
`frontend/features/map/geo.ts`).

Contacts are linked via the `property_contacts` join (`role`: owner /
assignee / agent / client / vendor / other); the legacy free-text
`assets.owner` / `assets.assignees` fields remain for search/backfill
compatibility but are not part of the primary create/edit UX.

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

contacts

property_contacts

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

Active hardening (`20260821000001_schema_hardening`):

- UUID PKs default to `gen_random_uuid()` (`projects`, `asset_types`,
  `asset_statuses`, `assets`, `documents`, `notifications`, `contacts`,
  `property_contacts`) — `profiles.id` remains FK-only.
- JSONB defaults: `assets.assignees` → `'[]'`, `assets.metadata` / `notifications.metadata` → `'{}'`.
- CHECKs: `projects.status IN ('active','archived')`, `documents.category IN ('contract','report','image','manual','other')`, `documents.size_bytes >= 0`.
- Partial unique indexes `WHERE deleted_at IS NULL` on `projects.slug`, `asset_types.slug`, `asset_statuses.slug` so soft-deleted rows do not block slug reuse.

---

# File Storage

Never store uploaded files inside PostgreSQL.

Only store metadata.

Store binaries in Supabase Storage (buckets `documents` and `reports`, both
private; `reports` is restricted to `application/json` via
`20260821000001`).

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
