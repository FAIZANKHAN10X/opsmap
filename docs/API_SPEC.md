# API_SPEC.md

# API Specification

> This document defines the API philosophy, standards, conventions, versioning, request/response formats, authentication, pagination, filtering, and endpoint contracts for OpsMap.

---

# Philosophy

The API is the contract between the frontend and backend.

The frontend should never depend on internal implementation details.

The backend may change internally.

The API contract should remain stable.

---

# Design Principles

## Resource-Oriented

Endpoints represent resources.

Good

```
GET /projects

GET /assets

POST /tasks
```

Avoid action-based endpoints.

Bad

```
POST /createProject

POST /updateAsset

POST /deleteUser
```

---

## Predictability

Every endpoint should behave consistently.

Users should never need to guess:

- request structure
- response structure
- error format

---

## Stateless

Each request contains everything required.

The API should never rely on previous requests.

---

## Versioning

All endpoints begin with

```
/api/v1
```

Example

```
GET /api/v1/projects

GET /api/v1/assets
```

Breaking changes require a new version.

---

# Authentication

Authentication handled through Supabase Auth.

Every protected request includes

```
Authorization

Bearer <access_token>
```

Authentication middleware validates

- identity
- session
- permissions

---

# Authorization

Authentication answers

"Who are you?"

Authorization answers

"What are you allowed to do?"

Every protected endpoint performs permission checks.

---

# HTTP Methods

GET

Retrieve data.

POST

Create resources.

PUT

Replace an entire resource.

PATCH

Update specific fields.

DELETE

Soft delete resources where applicable.

---

# Standard Response Format

Successful response

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

List response

```json
{
  "success": true,
  "data": [],
  "pagination": {},
  "message": null
}
```

Error response

```json
{
  "success": false,
  "error": {
    "code": "ASSET_NOT_FOUND",
    "message": "Asset not found."
  }
}
```

Responses should remain consistent across the platform.

---

# Pagination

Large collections always use pagination.

Query parameters

```
page

limit
```

Response

```json
{
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 432,
    "pages": 18
  }
}
```

Never return thousands of records in one request.

---

# Sorting

Sorting uses

```
sort

order
```

Example

```
GET /assets

?sort=name

&order=asc
```

Allowed values

```
asc

desc
```

---

# Filtering

Filtering should be composable.

Example

```
GET /assets

?status=available

&type=villa

&project_id=...

&assigned_to=...

&page=1
```

Multiple filters should work together.

---

# Search

Keyword search

```
GET /assets

?search=luxury
```

Future semantic search should preserve the same API.

Only backend implementation changes.

---

# Field Selection

Future support

```
?fields=id,name,status
```

Allows lightweight responses.

---

# Relationships

Avoid deeply nested payloads.

Bad

```
Project

↓

Assets

↓

Tasks

↓

Documents

↓

Activity

↓

Users
```

Instead

Return related resources separately when practical.

---

# Endpoint Groups

---

## Authentication

```
POST /auth/login

POST /auth/logout

GET /auth/me

POST /auth/refresh
```

---

## Users

```
GET /users

GET /users/{id}

POST /users

PATCH /users/{id}

DELETE /users/{id}
```

---

## Organizations

```
GET /organizations

GET /organizations/{id}

POST /organizations

PATCH /organizations/{id}
```

---

## Projects

```
GET /projects

GET /projects/{id}

POST /projects

PATCH /projects/{id}

DELETE /projects/{id}
```

---

## Assets

```
GET /assets

GET /assets/{id}

POST /assets

PATCH /assets/{id}

DELETE /assets/{id}
```

---

## Asset Types

```
GET /asset-types

POST /asset-types

PATCH /asset-types/{id}
```

---

## Asset Statuses

```
GET /asset-statuses

POST /asset-statuses

PATCH /asset-statuses/{id}
```

Status configuration remains data-driven.

---

## Tasks

```
GET /tasks

GET /tasks/{id}

POST /tasks

PATCH /tasks/{id}

DELETE /tasks/{id}
```

---

## Documents

```
GET /documents

POST /documents

DELETE /documents/{id}
```

Uploads handled through multipart requests.

---

## Assignments

```
POST /assignments

PATCH /assignments/{id}

DELETE /assignments/{id}
```

---

## Search

```
GET /search
```

Future implementations may internally use:

- SQL
- Full-text
- Vector search

The endpoint remains unchanged.

---

## Reports

```
GET /reports

POST /reports/generate
```

Report generation may become asynchronous.

---

## Notifications

```
GET /notifications

PATCH /notifications/{id}
```

---

## Activity

```
GET /activity
```

Read-only.

Activity is immutable.

---

# Status Codes

200

Success

201

Created

204

No Content

400

Bad Request

401

Unauthorized

403

Forbidden

404

Not Found

409

Conflict

422

Validation Error

429

Rate Limited

500

Internal Server Error

Use standard HTTP semantics.

---

# Validation

Every request validates

- body
- query
- path parameters

Validation errors should identify

- field
- reason

Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "fields": [
      {
        "field": "name",
        "message": "Required."
      }
    ]
  }
}
```

---

# Idempotency

GET

Always safe.

PUT

Idempotent.

DELETE

Idempotent.

POST

Not guaranteed unless explicitly designed.

---

# Rate Limiting

Public endpoints

Lower limits.

Authenticated endpoints

Higher limits.

Authentication endpoints

Strict limits.

---

# File Uploads

Uploads use

```
multipart/form-data
```

Files stored in Supabase Storage.

Database stores metadata only.

---

# Date Format

Always use ISO 8601.

Example

```
2026-07-30T18:42:31Z
```

Never use localized date strings.

---

# UUID Format

Every identifier is a UUID.

Never expose sequential integer IDs.

---

# Error Codes

Use stable machine-readable codes.

Examples

```
PROJECT_NOT_FOUND

ASSET_NOT_FOUND

PERMISSION_DENIED

INVALID_STATUS

FILE_TOO_LARGE
```

Messages may change.

Codes should remain stable.

---

# Deprecation

Deprecated endpoints remain available during the transition period.

Responses should include deprecation headers when appropriate.

Breaking changes require a new API version.

---

# Performance

Default list responses should remain lightweight.

Avoid unnecessary joins.

Support pagination on all large collections.

Return only requested information.

---

# Future Extensions

The API should accommodate future capabilities without redesign.

Examples

- AI endpoints
- MCP tool endpoints
- Webhooks
- GraphQL gateway
- Real-time subscriptions

These should extend the platform rather than replace existing contracts.

---

# AI Endpoints

AI interactions should remain explicit.

Examples

```
POST /ai/summarize

POST /ai/compare

POST /ai/search

POST /ai/report
```

AI endpoints should never bypass business services or permission checks.

---

# MCP Integration

MCP tools should invoke the same application services used by REST endpoints.

There must be a single source of business logic.

REST clients, AI assistants, and future integrations should all produce identical results when performing equivalent operations.

---

# Final Principle

The API is a long-term contract.

Backend implementations may evolve.

Databases may change.

Services may be refactored.

The API should remain stable, predictable, and consistent for every client that depends on it.
