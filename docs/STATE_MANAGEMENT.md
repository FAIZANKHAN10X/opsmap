# STATE_MANAGEMENT.md

# State Management

> This document defines how state flows throughout the OpsMap frontend. It establishes ownership, synchronization, caching, and update strategies to ensure predictable, scalable, and maintainable applications.

---

# Philosophy

State is one of the primary sources of frontend complexity.

The goal is to make state:

- Predictable
- Minimal
- Observable
- Easy to reason about

Every piece of state should have exactly one owner.

---

# Core Principle

Not all state is the same.

Different types of state have different lifecycles and responsibilities.

Never treat all state equally.

---

# State Categories

OpsMap divides frontend state into six categories.

```
Application State

├── Server State
├── UI State
├── URL State
├── Form State
├── Derived State
└── Temporary State
```

Each category follows different rules.

---

# Server State

Server state is owned by the backend.

Examples

- Projects
- Assets
- Users
- Documents
- Tasks
- Notifications
- Reports

The frontend should never become the source of truth.

---

## Principles

The frontend requests data.

The backend owns data.

The frontend displays data.

---

## Never Duplicate

Avoid storing copies of server data in multiple places.

Bad

```
Assets

↓

React Query

↓

Context

↓

Component State
```

Good

```
Assets

↓

Server (services/repositories)

↓

Components
```

(With or without an intermediate cache layer, the server is the single
source of truth.)

One source.

Many consumers.

---

# UI State

UI state exists only to control the interface.

Examples

- Sidebar open
- Active tab
- Selected row
- Open modal
- Expanded section
- Theme
- Current tool

UI state should never contain business data.

---

# URL State

Anything users should be able to bookmark belongs in the URL.

Examples

- Search query
- Filters
- Selected project
- Pagination
- Sorting
- Current view

Example

```
/assets

?page=2

&status=available

&search=villa
```

Refreshing the page should preserve context.

---

# Form State

Forms own their own temporary state.

Examples

- Name
- Email
- Description
- Price
- Notes

Form state should remain isolated until submission.

Avoid syncing forms with global state.

---

# Derived State

Derived state is computed.

Never stored.

Example

Store

```
deposit

total_price
```

Compute

```
remaining_balance
```

Another example

Store

```
asset.status
```

Compute

```
status_color
```

Compute instead of duplicate.

---

# Temporary State

Temporary state has a short lifespan.

Examples

- Hover
- Dragging
- Tooltip
- Loading spinner
- Context menu
- Cursor position

Temporary state should remain local.

---

# Ownership Rules

Every state has one owner.

Example

```
Server

↓

Asset List

↓

Asset Card
```

AssetCard does not own assets.

It receives them.

---

# Data Flow

The application follows one-directional data flow.

```
User

↓

UI Event

↓

API Request

↓

Backend

↓

Response

↓

Server Cache

↓

Components

↓

Render
```

Avoid circular state updates.

---

# Server Cache

Current state: there is no client-side server cache layer today. Server data
is fetched per request through Server Actions / Server Components, with
client polling only for notifications (30 s refresh).

Target state: server data should be cached.

Responsibilities

- Fetching
- Caching
- Revalidation
- Background refresh
- Cache invalidation

Components should not manage these concerns directly.

If a caching layer (e.g. React Query/SWR) is added, the server remains the
single source of truth; the cache is a projection.

---

# Cache Invalidation

After mutations:

Refresh only affected resources.

Bad

Refresh entire application.

Good

Invalidate:

```
Asset

Project KPIs

Search Results
```

Keep invalidation as granular as possible.

---

# Optimistic Updates

Use optimistic updates only when:

- Failure is unlikely
- Rollback is simple
- User experience benefits

Examples

Good

- Toggle favorite
- Rename asset
- Update status

Avoid optimistic updates for complex operations.

---

# Real-Time Updates

Future versions may support real-time synchronization.

Possible events

- Asset updated
- User joined
- Status changed
- Task completed
- Notification created

Real-time updates should merge into existing state rather than replacing it.

---

# Selection State

Selection is UI state.

Examples

Selected asset

Selected task

Selected row

Selected document

Selection should not modify server state.

---

# Workspace State

The interactive workspace owns:

- Zoom
- Pan
- Current tool
- Selection
- Hover
- Viewport

Business data remains separate.

---

# Search State

Search consists of:

- Query
- Filters
- Sort
- Pagination

These belong in URL state whenever possible.

This allows:

- Bookmarking
- Sharing
- Browser history
- Refresh persistence

---

# Filter State

Filters should remain independent.

Examples

Status

Type

Owner

Assigned User

Date Range

Combining filters should not require special logic.

---

# Loading State

Every async request should expose loading state.

Examples

Initial loading

Background refresh

Mutation

Pagination

Loading should be scoped.

Avoid global loading screens.

---

# Error State

Errors belong close to where they occur.

Examples

Upload failure

↓

Upload component

Search failure

↓

Search component

Avoid global error state unless necessary.

---

# Notifications

Notifications should not be stored inside unrelated components.

Use a centralized notification system.

Examples

Success

Error

Warning

Information

---

# Theme State

Theme is application-level UI state.

Examples

Light

Dark

System

Theme should persist across sessions.

---

# Authentication State

Authentication is global.

Contains

- User
- Session
- Permissions

Business data should remain separate.

---

# Permissions

Permissions should never be duplicated.

Always derive UI behavior from authenticated user capabilities.

Example

```
can_edit_assets

↓

Show Edit Button
```

Do not hardcode permissions inside components.

---

# Component Communication

Prefer props.

Then composition.

Then shared state.

Avoid unnecessary global stores.

---

# Global State

Only promote state to global scope if:

Multiple unrelated components need it.

Examples

Authentication

Theme

Notifications

Avoid putting everything into one global store.

---

# Local State

Default to local state.

If state is used by one component,

keep it there.

Promote only when necessary.

---

# Side Effects

Side effects should remain predictable.

Examples

- API requests
- Navigation
- Analytics
- Notifications

Keep rendering logic pure.

---

# State Persistence

Persist only what improves user experience.

Examples

Theme

Sidebar state

Last project

Preferred view

Never persist sensitive information.

---

# Offline Considerations

Offline support is out of scope for the initial release.

The architecture should not prevent future implementation.

---

# Performance

Avoid unnecessary re-renders.

Guidelines

- Keep state localized
- Memoize only when beneficial
- Avoid deeply nested providers
- Avoid excessive global subscriptions

Measure before optimizing.

---

# AI State

AI conversations should remain isolated.

AI should never become a source of business truth.

Generated content remains temporary until explicitly accepted by the user.

---

# Future State Sources

Potential future integrations

- Real-time subscriptions
- WebSocket events
- MCP tool responses
- AI assistants
- Background job updates

These should integrate into existing state flows rather than introducing parallel systems.

---

# State Anti-Patterns

Avoid

- Duplicating server data
- Global state for everything
- Deep prop drilling when composition solves it
- Hidden state mutations
- Components owning business logic
- Synchronizing multiple copies of the same data

Every anti-pattern increases maintenance cost.

---

# Decision Checklist

Before creating new state, ask:

- Who owns this data?
- Does it already exist elsewhere?
- Is it temporary or persistent?
- Should refreshing the page preserve it?
- Can it be derived instead of stored?
- Does it belong in the URL?
- Does it belong on the server?

If these questions cannot be answered clearly,

the state probably belongs somewhere else.

---

# Final Principle

The frontend is a projection of backend state.

Server state represents reality.

UI state represents interaction.

Derived state represents computation.

Keeping these responsibilities separate is the foundation of a scalable frontend architecture.
