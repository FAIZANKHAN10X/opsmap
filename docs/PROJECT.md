# PROJECT.md

# OpsMap

> A visual operations platform for managing physical assets through an interactive map rather than traditional tables.

---

# Product Direction (2026-08)

The primary product is the **8AM HUB** — a real-estate business/owner
dashboard (subtitle "INTERNAL OPERATIONS"). Its product/design requirements
are Figma-derived and provided externally as the authoritative source of
truth (see `docs/ROADMAP.md`). A customer-facing browse/dashboard experience
with a separate access model is a later implementation.

The target user-facing information architecture follows the 8AM HUB Figma
structure and is **not** the current OpsMap sidebar:

- DASHBOARD (property map + KPI area)
- ULLUWATU "26 (the development/site)
- CONTACTS (new)
- DATABASE (new/reworked dedicated database experience)
- SETTINGS
- SIGN OUT
- PROPERTY ADDRESS

This does **not** make OpsMap a generic consumer marketplace, and it does
**not** rewrite the backend to match the terminology. The generalized
asset/project/operations model stays underneath and remains the engine for
real estate and any future industry: internally it is still Project, Asset,
AssetStatus, and Asset metadata; the user-facing application presents ULLUWATU
"26, Villa, Property, Property Map, and Villa List. The specialization is
terminological and experiential. The 8AM HUB visual design is extremely
minimal (white background, black borders, black Figtree typography, blue
accent) and is the visual source of truth — the current dark enterprise UI is
not the target. See `docs/ROADMAP.md` for the phase plan and the
"Figma → current OpsMap" mapping.

---

# Vision

OpsMap is an enterprise operations platform that allows organizations to manage physical assets using an interactive visual workspace.

Instead of navigating spreadsheets, long tables, or deeply nested forms, users interact directly with a live representation of the physical world.

The platform should feel less like a CRM and more like a mission control system.

The visual workspace is always the center of the experience.

Everything else exists to support it.

---

# Problem Statement

Most management software stores information in rows.

Rows become tables.

Tables become filters.

Eventually users spend more time searching than managing.

When organizations operate hundreds or thousands of physical assets, understanding the current operational state becomes difficult.

Examples include:

- Real estate developments
- Hotels
- Warehouses
- Construction projects
- Manufacturing facilities
- Parking structures
- Stadium seating
- Hospitals
- Data centers
- Solar farms
- Shipping terminals

Although every industry is different, they all share the same underlying problem.

There are physical assets.

Those assets have operational data.

Users need to understand both at the same time.

OpsMap solves this by making the physical layout the primary interface.

---

# Core Philosophy

## The Map Is The Product

The interactive map is not an additional feature.

It is the primary interface.

Users should spend most of their time interacting with the workspace rather than navigating menus.

---

## Data Drives Everything

Visual appearance is never manually controlled.

Every object derives its appearance from live operational data.

Nothing is hardcoded.

Everything is computed.

Example

```
Database

↓

Business Rules

↓

Visual State

↓

Rendered Object
```

If the underlying data changes, the interface changes automatically.

---

## Visual Before Text

Humans recognize patterns much faster visually than through tables.

Users should understand:

- occupancy
- availability
- progress
- bottlenecks
- risks
- workload

within seconds.

The interface should reduce cognitive load rather than increase it.

---

## Operational Awareness

The dashboard exists to answer one question immediately:

> "What requires attention right now?"

Every design decision should improve operational awareness.

---

# Goals

The platform should allow users to:

- View an entire project instantly
- Understand operational status visually
- Open detailed information with one click
- Navigate thousands of assets efficiently
- Filter large datasets
- Track progress
- Monitor payments
- Assign employees
- View documents
- Manage timelines
- Search quickly
- Make operational decisions faster

---

# Product Principles

## Single Source of Truth

The database is the only source of truth.

No duplicated state.

No manually synchronized information.

---

## Live System

The application should always feel alive.

Changes made anywhere should immediately be reflected throughout the interface.

---

## Minimal Clicks

Users should never need six clicks to answer a simple operational question.

Every common workflow should require as few interactions as possible.

---

## Information Hierarchy

Users should naturally notice:

1. Critical alerts
2. Overall project health
3. Asset status
4. Details

Decoration should never compete with information.

---

## Progressive Disclosure

Show only what users need.

Reveal complexity gradually.

Overview first.

Details second.

---

# Primary Users

Examples include:

## Real Estate Developers

Managing:

- Villas
- Apartments
- Buildings
- Construction progress

---

## Hotels

Managing:

- Rooms
- Occupancy
- Maintenance
- Reservations

---

## Warehouses

Managing:

- Storage units
- Inventory locations
- Equipment
- Dock assignments

---

## Manufacturing

Managing:

- Machines
- Production lines
- Maintenance schedules

---

## Stadiums

Managing:

- Seating
- Reservations
- Maintenance
- Events

---

## Hospitals

Managing:

- Rooms
- Equipment
- Departments
- Bed availability

---

# Asset Model

Every physical object follows the same concept.

```
Project

↓

Asset

↓

Operational Data

↓

Visual Representation
```

An asset may represent:

- Villa
- Apartment
- Parking space
- Warehouse unit
- Machine
- Hotel room
- Solar panel
- Hospital room
- Office
- Dock
- Seat

The software should never assume a specific asset type.

Everything should be configurable.

---

# Workspace

The workspace is the heart of the application.

It displays an interactive visual layout representing a real physical environment.

Examples include:

- Blueprint
- Floor plan
- Site map
- Grid
- Seating map
- Parking layout
- GIS map

Objects should support:

- Hover
- Click
- Multi-select
- Pan
- Zoom
- Search
- Filter

Future versions may support drag-and-drop where appropriate.

---

# Status System

Every asset has a status.

Status determines appearance.

Example:

Available

Pending

Occupied

Completed

Maintenance

Offline

Reserved

Inactive

The status system should be configurable.

Colors should remain consistent across the entire platform.

---

# Dashboard

The dashboard should answer three questions immediately.

## What is happening?

Displayed through KPIs.

Examples:

- Total Assets
- Available
- Occupied
- Pending
- Revenue
- Capacity

---

## Where is it happening?

Displayed through the interactive workspace.

---

## Why is it happening?

Displayed through detailed panels, timelines, notes and documents.

---

# Design Language

The interface should communicate confidence.

Characteristics:

- Modern
- Professional
- Enterprise
- Minimal
- Information-dense
- Fast

Avoid:

- Excessive animations
- Decorative graphics
- Consumer-style interfaces
- Unnecessary gradients
- Visual noise

---

# User Experience

The application should feel like software used by professional operations teams.

Interactions should be:

- Immediate
- Predictable
- Consistent
- Responsive

Users should always know:

- where they are
- what changed
- what needs attention
- what actions are available

---

# Scalability

The architecture should not depend on any specific industry.

Changing the underlying map should allow the platform to support entirely different businesses.

Examples:

- Real Estate
- Hotels
- Warehouses
- Factories
- Hospitals
- Airports
- Stadiums
- Shopping malls
- Solar farms
- Construction sites
- Ports
- Office campuses

The interaction model should remain identical.

Only the underlying data and map change.

---

# Long-Term Vision

OpsMap should evolve into a platform where operations teams manage physical environments through visual interaction instead of spreadsheets.

Future capabilities include:

- AI-assisted operations
- Predictive recommendations
- Semantic search
- Document intelligence
- Workflow automation
- Multi-project management
- Real-time collaboration
- Role-based permissions
- Mobile field operations
- External integrations
- MCP-powered AI assistants

> **Note:** The active roadmap (`docs/ROADMAP.md`) is scoped **only** to
> finishing the core **8AM HUB** real-estate owner product. The capabilities
> above are long-term ideas, tracked in `docs/IDEAS.md` — they are **not**
> active commitments and must not be implemented while the core 8AM HUB
> roadmap is incomplete. The generalized asset/project/operations
> architecture remains, and the active product is 8AM HUB (INTERNAL
> OPERATIONS) on top of it.

The long-term objective is not simply to display assets.

The objective is to provide a real-time operational model of an organization.

Users should feel like they are controlling a live system rather than editing records inside a database.
