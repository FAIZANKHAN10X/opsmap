# CODING_STANDARDS.md

# Coding Standards

> This document defines the coding conventions, architectural boundaries, and engineering practices for OpsMap. Every contribution to the codebase should follow these standards to ensure consistency, maintainability, and scalability.

---

# Philosophy

Code is read far more often than it is written.

Every decision should optimize for:

- Readability
- Predictability
- Maintainability
- Simplicity

Avoid writing clever code.

Write obvious code.

---

# General Principles

## Prefer Clarity

Good

```typescript
const remainingBalance = totalPrice - deposit;
```

Bad

```typescript
const rb = tp - dp;
```

Names should describe intent.

---

## Keep Functions Small

A function should perform one responsibility.

If a function requires scrolling to understand it,

it is probably doing too much.

Target:

- 10–30 lines where practical
- Early returns over deeply nested conditionals

---

## One Responsibility

Every:

- Function
- Class
- Component
- Service
- Module

should have one primary responsibility.

---

## Prefer Composition

Build larger systems by combining smaller pieces.

Avoid inheritance unless it provides clear value.

---

# Naming Conventions

## Files

Use lowercase with hyphens for TypeScript files.

```
asset-service.ts

project-repository.ts

search-routes.ts
```

Use PascalCase for React component filenames.

```
Sidebar.tsx

AssetCard.tsx

StatusBadge.tsx
```

---

## Variables

Use descriptive names.

Good

```
project_id

remaining_balance

available_assets
```

Bad

```
id

tmp

data

value

x
```

---

## Boolean Variables

Always read naturally.

Good

```
is_active

has_permission

can_edit

is_archived
```

Avoid

```
active

permission

editable
```

---

## Functions

Use verbs.

Examples

```
create_asset()

update_project()

assign_employee()

calculate_progress()

search_assets()
```

Avoid vague names.

```
handle()

process()

execute()

run()
```

---

## Classes

Use nouns.

```
AssetService

ProjectRepository

NotificationService

SearchEngine
```

---

# Backend Standards

---

## Routes

Routes should only:

- Receive requests
- Validate input
- Call services
- Return responses

Never place business logic in routes.

---

## Services

Services own business rules.

Examples

```
AssetService

ProjectService

DocumentService
```

Services should not know about HTTP.

---

## Repositories

Repositories own database access.

Responsibilities

- CRUD
- Filtering
- Pagination
- Query optimization

Repositories should not contain business rules.

---

## Types

Persistent types come from the generated `types/database.ts` (via
`supabase gen types typescript`). Domain-facing types live in `types/domain.ts`.
Inputs are validated and coerced in `lib/server/validation.ts`; row→domain
mapping happens in `lib/server/mappers.ts`. Keep UI types independent of
database types.

---

# Frontend Standards

---

## Components

One component.

One responsibility.

Good examples

- Sidebar
- AssetCard
- KPIWidget
- SearchBar
- Legend

Avoid giant "God components."

---

## Component Size

Aim for components under 200 lines.

If significantly larger,

consider extracting child components.

---

## Props

Keep props explicit.

Prefer

```
<AssetCard
    asset={asset}
    selectable
/>
```

Avoid long prop lists.

---

## State

Keep state as local as possible.

Only lift state when necessary.

Never duplicate server state.

---

## API Calls

React components must never call fetch directly.

All API communication goes through the services layer.

Example

```
AssetService.getAssets()
```

---

# Folder Rules

Each folder owns a single concern.

Example

```
components/

services/

repositories/

actions/

hooks/
```

Avoid dumping unrelated files together.

---

# Error Handling

Never silently ignore errors.

Bad

```typescript
try {
  // ...
} catch {
  // swallow
}
```

Good

- Catch specific exceptions
- Log useful context
- Return meaningful errors

---

# Comments

Write code that rarely needs comments.

Use comments only for:

- Why something exists
- Business constraints
- Non-obvious decisions

Avoid comments explaining what the code already says.

Bad

```typescript
// Increment count
count += 1;
```

---

# Logging

Log meaningful events.

Good

```
Asset updated

User assigned

Document uploaded
```

Avoid noisy logs.

Never log secrets.

---

# Constants

Never hardcode repeated values.

Use constants or configuration.

Good

```
DEFAULT_PAGE_SIZE

MAX_UPLOAD_SIZE

STATUS_COLORS
```

---

# Magic Numbers

Avoid unexplained numbers.

Bad

```
if progress > 83:
```

Good

```
COMPLETION_THRESHOLD = 83
```

---

# Imports

Group imports consistently.

TypeScript

1. React / framework
2. Third-party libraries
3. Internal modules (`@/...`)

Example

```typescript
import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { AssetService } from "@/lib/server/services/assets";
```

---

# Async Rules

Use async only when it provides value.

Do not make everything asynchronous.

Background work (derivatives, reports) is synchronous in the server-side
layer today; reintroduce a job queue only as a deliberate decision.

---

# Database Rules

Never build SQL inside routes.

Never expose data-access rows directly to the UI.

Always validate input.

Prefer transactions for multi-step operations.

---

# API Rules

Business mutations are Server Actions (`actions/`), not HTTP endpoints. The
HTTP surface is limited to Route Handlers where a raw response is needed
(health, document download/preview/thumbnail, seed-defaults, auth). Every
action and handler returns the shared envelope
`{success, data, pagination, error}`.

Good

```
getAssetsAction()

createAssetAction()

updateAssetAction()

GET /api/documents/[id]/download
```

Avoid raw HTTP/multipart endpoints where a Server Action suffices.

```
/createAsset

/updateProperty
```

---

# Security Rules

Never trust frontend validation.

Always validate:

- Request body
- Query parameters
- Uploaded files
- Permissions

Every request.

---

# AI Integration Rules

AI must never:

- Skip permission checks
- Modify the database directly
- Bypass services
- Invent data

AI interacts through application services and MCP tools only.

---

# Git Standards

Branch names

```
feature/map-selection

feature/search

fix/login

refactor/assets

docs/architecture
```

Commit messages

```
feat: add asset search

fix: prevent duplicate uploads

refactor: extract project service

docs: update roadmap
```

Follow Conventional Commits where practical.

---

# Pull Request Checklist

Before merging:

- Code builds
- Lint passes
- Types pass
- Tests pass
- No dead code
- No debugging statements
- Documentation updated if required

---

# Code Review Questions

Every reviewer should ask:

- Is this the simplest solution?
- Does it duplicate existing logic?
- Does it belong in this layer?
- Is it readable?
- Will another developer understand it in six months?
- Does it follow the system principles?

---

# Definition of Good Code

Good code is:

- Easy to understand
- Easy to modify
- Easy to test
- Difficult to misuse
- Consistent with the rest of the project

The goal is not to impress future developers.

The goal is to make future development obvious.

---

# Final Principle

Whenever there are multiple valid implementations, prefer the one that is easiest for another engineer—or an AI coding agent—to read, understand, and safely extend.
