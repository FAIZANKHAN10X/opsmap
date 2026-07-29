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
Organization
│
├── Projects
│
│   ├── Assets
│   │
│   ├── Tasks
│   │
│   ├── Documents
│   │
│   ├── Activity Logs
│   │
│   └── Users
│
└── Settings
```

Projects are the primary operational boundary.

Assets always belong to a project.

---

# Core Entities

## Organization

Represents a customer or company using the platform.

Responsibilities

- Billing (future)
- Users
- Projects
- Permissions
- Branding

---

## User

Represents a human using the application.

Stores

- profile
- authentication reference
- preferences
- role
- status

Authentication remains delegated to Supabase Auth.

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

Connects users to assets.

Examples

Maintenance engineer

Sales representative

Operator

Security

Future support

Multiple assignees.

---

## Task

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
Organization

↓

Projects

↓

Assets

↓

Tasks

↓

Documents

↓

Activity
```

Users interact across multiple levels.

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

Store binaries in Supabase Storage.

Database stores

- filename
- mime type
- size
- storage path
- owner
- timestamps

---

# Future Multi-Tenancy

Every major entity should be capable of belonging to an organization.

```
organization

↓

projects

↓

assets

↓

tasks
```

This allows multiple customers to share one deployment safely.

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

- Millions of assets
- Millions of activity records
- Thousands of concurrent users
- Multiple organizations
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
