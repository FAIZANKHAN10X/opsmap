# ARCHITECTURE.md

# OpsMap Architecture

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

                           │
                     HTTPS / REST API

                           │

                     FastAPI Backend

      ┌──────────────┬──────────────┬──────────────┐
      │              │              │              │
 Authentication   Asset Service  Search Service  Document Service
      │              │              │              │
      └──────────────┴──────────────┴──────────────┘
                     │
              Recommendation Service
                     │
              Notification Service
                     │
                Background Jobs
                     │
                Redis + RQ Worker
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

FastAPI

Responsibilities

- REST API
- Authentication
- Validation
- Business rules
- Service orchestration

The backend owns the application.

---

## Database

Supabase

Using

- PostgreSQL
- Authentication
- Storage

Supabase is the single source of truth.

---

## ORM

SQLAlchemy

Responsibilities

- Models
- Relationships
- Queries

Business logic should never live inside ORM models.

---

## Background Processing

Redis

RQ

Responsibilities

- Image processing
- Email delivery
- AI jobs
- Report generation
- Future indexing

The API should remain fast.

Anything slow belongs in a worker.

---

# Repository Structure

```
opsmap/

docs/

frontend/

backend/

README.md
```

---

# Frontend Structure

```
frontend/

app/

components/

features/

hooks/

lib/

services/

types/

styles/

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

# Backend Structure

```
backend/

app/

api/

core/

database/

models/

schemas/

services/

repositories/

workers/

tasks/

utils/

tests/

main.py
```

---

## api/

FastAPI routes.

Responsibilities

Receive requests

Validate

Call services

Return responses

Nothing more.

---

## services/

Business logic.

Examples

AssetService

ProjectService

SearchService

RecommendationService

NotificationService

DocumentService

---

## repositories/

Database access.

Responsibilities

Queries

CRUD

Pagination

Filtering

Routes should never talk directly to SQLAlchemy.

---

## models/

Database models.

Only describe data.

No business rules.

---

## schemas/

Pydantic models.

Validation

Serialization

Responses

---

## workers/

Background workers.

RQ jobs.

---

## tasks/

Individual async jobs.

Examples

Resize images

Send emails

Generate reports

---

## core/

Configuration

Environment

Security

Logging

Dependencies

---

# Services

---

## Authentication Service

Responsibilities

Login

Logout

Session validation

Permissions

Role checking

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

REST

```
GET

POST

PUT

PATCH

DELETE
```

Example

```
/projects

/projects/{id}

/assets

/assets/{id}

/search

/documents

/users
```

Resources should be nouns.

Avoid verbs.

---

# Request Flow

```
Browser

↓

FastAPI Route

↓

Validation

↓

Service

↓

Repository

↓

Database

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

# Background Job Flow

```
User uploads image

↓

API stores original

↓

Create Job

↓

RQ Worker

↓

Resize

↓

Generate Thumbnail

↓

Update Database

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

Supabase Storage

Structure

```
projects/

assets/

documents/

images/

avatars/

exports/
```

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

# Roles

Examples

Admin

Manager

Operator

Viewer

Future implementations may support custom roles.

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

Multiple organizations

Role isolation

Cloud deployment

The frontend should remain unchanged as the backend grows.

---

# Deployment

Frontend

Vercel

Backend

Cloud VM or container

Database

Supabase

Storage

Supabase Storage

Redis

Managed Redis service

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
