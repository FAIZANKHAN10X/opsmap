# ROADMAP.md

# OpsMap Development Roadmap

> This roadmap defines the order in which the system should be built. Each phase builds upon the previous one. Do not skip phases or introduce future technologies before they solve a real problem.
>
> Phase numbering note: this roadmap is scoped to the **8AM HUB** real-estate business/owner product. Phases 0–10 are the original product phases, now complete on the Next.js + TypeScript + Supabase architecture. Phases 11–17 are the active forward work for the core 8AM HUB product (owner experience → Figma-aligned UI → Demo/Mock Data mode → owner hardening & real-data readiness → customer-facing dashboard → audit/security hardening → production readiness, deployment & validation). The roadmap ends when the **core 8AM HUB product is complete and production-ready** (see "Roadmap Endpoint").
>
> Advanced capabilities that were previously planned (recommendations, advanced analytics, AI foundation, vector search, RAG, MCP, enterprise features, performance optimization) are **not** active roadmap phases. They are captured — with their original context — in `docs/IDEAS.md` as future ideas that may be reconsidered after the core product is complete. They are not deleted from the repository.
>
> **8AM HUB target (2026-08):** the target owner dashboard is the **8AM HUB** dashboard (subtitle **INTERNAL OPERATIONS**). The 8AM HUB product/design requirements in this document were provided externally from the Figma file and are the authoritative source of truth; this roadmap incorporates them as requirements rather than deriving or re-verifying them. The target user-facing information architecture follows the Figma structure (see Product Direction) and is **not** the current OpsMap sidebar.

---

# Product Direction

The primary product is a real-estate business/owner dashboard: the **8AM HUB** (subtitle **INTERNAL OPERATIONS**). The generalized asset/project/operations architecture remains underneath it and is preserved. Real estate is the concrete experience the product is being designed around; the customer-facing experience is a separate, later implementation.

The 8AM HUB structure, information architecture, dashboard layout, and visual design below are Figma-derived requirements provided externally and are authoritative. The roadmap implements them; it does not re-derive them.

The hierarchy below is unambiguous and overrides any earlier, more generic positioning:

```
PRIMARY
  Real-estate business/owner dashboard — "8AM HUB" (INTERNAL OPERATIONS)

CORE
  Property Map + Villa List (two connected views of the same
  property/villa data), property management/details, contacts,
  database, settings

DEMO
  Demo/Mock Data ON/OFF toggle for a fully populated dashboard
  experience (an added product requirement, not a Figma element)

LATER
  Customer-facing property discovery/dashboard with separate access and UX

FUTURE/OPTIONAL (not active)
  Advanced capabilities previously planned (recommendations, analytics,
  AI, vector search, RAG, MCP, enterprise features, performance) live in
  docs/IDEAS.md — captured for later, not scheduled
```

Positioning rules:

- OpsMap is **not** being redesigned into a generic consumer real-estate marketplace.
- The owner/business dashboard is the product: **8AM HUB**.
- The existing generalized asset/project/operations architecture stays — it provides flexibility and supports future expansion. The internal architecture continues to use concepts such as Project, Asset, AssetStatus, and Asset metadata while the user-facing application presents the 8AM HUB terminology (ULLUWATU "26, Villa, Property, Property Map, Villa List). This distinction is documented in "Generalized → Real-Estate Specialization".
- **The current OpsMap navigation is not the target product navigation.** The target user-facing information architecture follows the 8AM HUB Figma structure (DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS; SIGN OUT; PROPERTY ADDRESS). Existing backend/generalized functionality remains underneath where useful.
- The Figma design is the visual source of truth for the final UI. The 8AM HUB design is extremely minimal — white background, black borders, black typography, Figtree typography, blue accent/status color, minimal decoration, compact rectangular controls, large map/workspace area, simple sidebar, very restrained treatment. The current dark enterprise UI was **not** the target; Phase 12 brought the implemented owner dashboard/UI in line with the Figma design.
- The Demo/Mock Data toggle is an **additional product requirement**, not something derived from the Figma. It is placed immediately left of the notification bell and its visual treatment follows the Figma design language.
- Advanced capabilities that are **not** required to finish the 8AM HUB product (recommendations, advanced analytics, AI foundation, vector search, RAG, MCP, enterprise features, performance optimization) are moved out of the active roadmap into `docs/IDEAS.md`. They are not deleted from the repository; they are captured for later reconsideration after the core product is complete. The generalized asset/project/operations architecture (Project, Asset, AssetStatus, generalized services and repositories, existing infrastructure) is preserved and remains underneath the 8AM HUB product — this decision is about roadmap priority, not architecture.

---

# Development Philosophy

## Build Vertically

Every phase should deliver a usable feature.

Avoid building half of ten systems.

Instead:

- Design
- Backend
- Database
- API
- Frontend
- Testing

Complete one feature before moving to the next.

---

## Build for Today

Do not build features "just in case."

Only introduce new services when the project requires them.

---

# Current State vs. Target Owner Dashboard

The table below identifies the gaps between the current implementation and the target **8AM HUB** owner/business dashboard (Figma-derived requirements, provided externally). It is verified against the live codebase and `docs/MIGRATION.md`.

| Capability | Current state | Target (8AM HUB owner dashboard) | Where planned |
|---|---|---|---|
| Auth / login / session / RLS | ✅ Done (Supabase Auth + `@supabase/ssr`, POST-only signout) | Keep | Phase 1 |
| Roles / permissions (Admin, Manager, Operator, Viewer) | ✅ Done (ADR-014: `profiles.role`, SECURITY DEFINER `set_user_role`, action-layer `requireRole` gates, RLS write policies, permission-aware UI) | Business-user roles scoped to the single-company RLS model | Phase 14 |
| Information architecture / sidebar navigation | ✅ Done (DASHBOARD, selected development/ULLUWATU, CONTACTS, DATABASE, SETTINGS; PROJECTS is off primary nav, reachable from the development selector; footer SIGN OUT + development/property address) | 8AM HUB navigation: DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS (bottom: SIGN OUT, PROPERTY ADDRESS) | Phase 11 |
| Dashboard shell (sidebar, topbar, KPIs, theme) | ✅ Done (8AM HUB minimal design: white bg, black borders, black Figtree type, blue accent) | 8AM HUB minimal design (white bg, black borders, black Figtree type, blue accent) | Phase 2, Phase 12 |
| Dashboard KPI area | ✅ Done (`HubKpiCards`: PLACED (OPS) x/y pax, VILLA CAPACITY, SPOTS OPEN, VILLAS SOLD OUT x/y — data-driven) | Four functional KPI blocks: PLACED (OPS) e.g. 25/133 pax, VILLA CAPACITY 63, SPOTS OPEN 38, VILLAS SOLD OUT 5/22 — each data-driven | Phase 11 |
| Property Map / Villa List views | ✅ Done (PROPERTY MAP default + VILLA LIST alternate toggle in `DashboardWorkspace`; same data) | Two connected views of the same property/villa data; PROPERTY MAP is the default, VILLA LIST the alternate | Phase 4, Phase 11 |
| Interactive 2D map (pan/zoom/hover/select) | ✅ Done as a "Site plan" canvas | Realistic, geographically-spread property/villa pins on the map | Phase 4, Phase 11 |
| Map controls | ✅ Done (8AM PLAN, FLAT VIEW, Zoom +, Zoom -; semantics documented as resolved clarifications) | 8AM PLAN, FLAT VIEW, Zoom +, Zoom - (8AM PLAN / FLAT VIEW exact semantics = implementation/design clarification, not invented) | Phase 11 |
| Status legend | ✅ Done (OPEN / FILLING / SOLD OUT / NO OPS DATA mapped to the status engine via `lib/hub-status.ts`) | OPEN, FILLING, SOLD OUT, NO OPS DATA at the bottom of the map — mapped to the existing status engine where possible | Phase 6, Phase 11 |
| Property management (assets) | ✅ Done (CRUD, status, owner, notes, assignees, documents) | Real-estate property/villa terminology/metadata on top of the generalized model | Phase 5, Phase 11 |
| Property cards / info panel | ✅ Done (`InfoPanel` property card with capacity/placed + prominent "View full details") | Property card + "View full details" action | Phase 11 |
| Full property details page | ✅ Done (`/dashboard/properties/[id]` — management workspace: identity, location, configuration, media, documents, edit/delete) | Full property details page | Phase 11 |
| PROPERTY ADDRESS | ✅ Done (footer shows the selected villa's address when present; otherwise the development name, labeled honestly) | Specialized property address connecting visual map location with property info | Phase 11 |
| CONTACTS | ✅ Done (`/dashboard/contacts` — first-class `contacts` + `property_contacts` tables, CRUD, property relationships, backfilled from asset owners/assignees) | New functionality/route | Phase 11 |
| DATABASE | ✅ Done (`/dashboard/database` — central record management: Properties, Contacts, Documents, Media, Activity tabs over the existing data layer; no duplicate systems) | New/reworked dedicated database experience | Phase 11 |
| SETTINGS | ✅ Done | Align with the target Figma structure | Phase 11 |
| Search / filters / sorting / suggestions | ✅ Done | Reused; works against demo data | Phase 7, Phase 13 |
| Documents | ✅ Done (upload/download/preview/delete/categories) | Reused; representative demo documents | Phase 8, Phase 13 |
| Background work | ✅ Done — synchronous derivatives/reports/email (no Redis/RQ; a queue is a deliberate future decision) | Keep current approach unless measurement proves otherwise | Phase 9 |
| Notifications | ✅ Done (bell + dropdown + toasts + assignment alerts; Demo control sits immediately left of the bell) | Reused; header ordering places Demo control immediately left of the bell | Phase 10, Phase 12, Phase 13 |
| Demo / Mock Data toggle | ✅ Done (real ON/OFF toggle immediately left of the bell; server-side isolated demo dataset; session-local state) | Real ON/OFF toggle in the dashboard header, immediately left of the notification bell (added product requirement, not a Figma element) | Phase 13 |
| Figma-aligned UI | ✅ Done (owner dashboard/UI matches the 8AM HUB Figma design — minimal white/black/Figtree/blue) | Implemented owner dashboard/UI matches the 8AM HUB Figma design (minimal white/black/Figtree/blue) | Phase 12 |
| URL state (`selectedProjectId`, filters, selection) | ✅ Done (`DashboardUrlSync` mirrors project/asset/search/status/type; refresh preserves context) | URL/persistent state | Phase 14 |
| `created_by` / `updated_by` population | ✅ Done (populated from `profiles` for projects/assets/types/statuses/documents; audit lines carry the actor) | Populated from `profiles` | Phase 14 |
| Durable audit table | ⚠️ Audit is server log lines only (`lib/server/audit.ts`) | Durable, immutable audit log | Phase 17 |
| Email delivery | ✅ Done (ADR-015: SMTP via nodemailer when `SMTP_HOST` set; validated log-only fallback; never throws) | Real SMTP delivery (or documented decision) | Phase 14 |
| Real-data readiness | ⚠️ Live Supabase verified (Phase 14 of the migration); deployment/ops gaps remain | Production-ready owner dashboard | Phase 14, Phase 18 |
| Owner Core Property & Data Management | ✅ Owner can create/edit/place/media/document-manage properties through ULLUWATU + property details; dashboard is a real portfolio overview of persisted data | Internal owner operates the real-estate business with persistent real data, without Demo Mode | Phase 15 |
| Customer-facing dashboard | ❌ Missing | Separate browse experience + separate permission model | Phase 16 |
| Tasks nav item | ⚠️ Placeholder (`/dashboard/tasks` is `ComingSoon`) | Scope decision deferred (build or remove); not part of the 8AM HUB nav | later decision |

---

# Generalized → Real-Estate Specialization

Existing generalized OpsMap functionality will be specialized for the real-estate use case as follows. The data model and services are **not** renamed; specialization is terminological/experiential on top of the existing architecture.

## Architecture rule: internal vs. user-facing

Do **not** rewrite the generalized backend to match the Figma terminology. The internal architecture continues to use concepts such as **Project**, **Asset**, **AssetStatus**, and **Asset metadata**, while the user-facing application presents the 8AM HUB terminology:

| Internal (unchanged) | User-facing (8AM HUB) |
|---|---|
| Project | ULLUWATU "26 / development (the site/project selector in the sidebar) |
| Asset | Villa / Property |
| Asset status | OPEN / FILLING / SOLD OUT / NO OPS DATA (map legend) |
| Asset metadata | Property address, pax/capacity, price, area, etc. |
| InteractiveCanvas / workspace | PROPERTY MAP |
| (new list view) | VILLA LIST |
| InfoPanel / AssetDetailPanel | Property card + full property details |

## Figma → current OpsMap mapping

| 8AM HUB (Figma) | Current OpsMap | Treatment |
|---|---|---|
| DASHBOARD | `DashboardWorkspace` | Substantial layout/UI specialization (Phase 11, 12) |
| ULLUWATU "26 | Project / `ProjectSelector` | Rework user-facing terminology and project/development experience |
| PROPERTY MAP | `InteractiveCanvas` | Specialize into real geographic property/villa map behavior |
| VILLA LIST | Existing asset/property data | New Figma-aligned list view |
| CONTACTS | No equivalent user-facing area | New functionality/route (Phase 11) |
| DATABASE | Existing Assets/Search/data infrastructure | Central structured record management (Properties, Contacts, Documents, Media, Activity) |
| SETTINGS | Existing settings | Align with target Figma structure |
| PROPERTY ADDRESS | Existing asset information concepts | Specialize for property data |
| 8AM PLAN | No confirmed equivalent | Add to roadmap; exact behavior requires implementation/design clarification |
| FLAT VIEW | No confirmed equivalent | Add to roadmap; exact behavior requires implementation/design clarification |
| OPEN / FILLING / SOLD OUT / NO OPS DATA | Existing status engine | Reuse where appropriate and align terminology/UI |

## Generalized concept → real-estate specialization

| Generalized concept | Real-estate specialization |
|---|---|
| Project | Real-estate development / site (e.g. ULLUWATU "26) |
| Asset | Property / unit (villa, apartment, building, parking, commercial unit) |
| Asset type | Villa, Apartment, Townhouse, Commercial, Parking, Plot, … |
| Asset status | Mapped to the 8AM HUB legend concepts: OPEN, FILLING, SOLD OUT, NO OPS DATA (configurable status engine reused) |
| Asset metadata | Address, area, bedrooms, bathrooms, price, floor, has_pool, images, pax/capacity, lat/lng coordinates |
| Documents | Contracts, builder brochures, inspection reports, maintenance manuals |
| Map / workspace | PROPERTY MAP: geographic property map with realistic pin spread (Phase 11) |
| Asset list | VILLA LIST: Figma-aligned list view of the same property/villa data (Phase 11) |
| Search / filters / status | Property search, type/status filters, price/area filters where applicable |
| Dashboard KPIs | PLACED (OPS), VILLA CAPACITY, SPOTS OPEN, VILLAS SOLD OUT — data-driven (Phase 11) |

---

# Phase Status Overview

| Phase | Title | Status |
|---|---|---|
| 0 | Project Foundation | ✅ Complete |
| 1 | Authentication | ✅ Complete (auth); roles delivered in Phase 14 (ADR-014) |
| 2 | Dashboard Shell | ✅ Complete (Figma pass → Phase 12) |
| 3 | Projects | ✅ Core complete (admin page pending) |
| 4 | Interactive Workspace | ✅ Complete (geographic map → Phase 11) |
| 5 | Asset Management | ✅ Complete |
| 6 | Status Engine | ✅ Complete |
| 7 | Search | ✅ Complete (professional filters added Phase A — see below) |
| 8 | Documents | ✅ Complete |
| 9 | Background Work | ✅ Complete (synchronous approach confirmed) |
| 10 | Notifications | ✅ Complete |
| 11 | 8AM HUB Owner Experience | ✅ Complete |
| 12 | 8AM HUB Figma-Aligned UI | ✅ Complete |
| 13 | Demo / Mock Data Mode | ✅ Complete |
| 14 | Owner Hardening & Real-Data Readiness | ✅ Complete |
| 15 | Owner Core Property & Data Management | ✅ Complete |
| **A** | **Professional Property Search & Filter + Map/List Sync** | **✅ Complete (2026-08)** |
| **B** | **Professional Property Creation Workflow (single-page anchored editor)** | **✅ Complete (2026-08)** |
| **C** | **Dashboard Command Center** | **✅ Complete (2026-08)** |
| **P1-A** | **Professional Property Detail / Property Profile** | **✅ Complete (2026-08)** |
| 16 | Customer-Facing Dashboard | Later |
| 17 | Audit Logs & Security Hardening | Later |
| 18 | Production Readiness, Deployment & Validation | Later (roadmap endpoint) |

Advanced capabilities previously listed as Phases 16–25 (recommendations, advanced analytics, AI foundation, vector search, RAG, MCP, enterprise features, performance optimization) are **moved to `docs/IDEAS.md`** — future ideas, not active phases.

> **Phase A — Professional Search & Filter + Map/List Sync (2026-08):** replaced the flat horizontal `FilterControls` with a professional bar — search (name/code/address/description/view/furnishing/features) + primary `Type | Status | Price | Beds & Baths | More Filters`, popover/drawer secondary filters (furnishing, placement, features), price min/max/currency, bedrooms/bathrooms/area min/max, placement placed/unplaced, features multi-select, active chips with individual × and Clear all, result count, responsive and accessible. Extended server-side filtering in `AssetRepository:listFiltered` (search extended to `metadata->>address/view/furnishing/floor/features`, numeric metadata filters via server-side post-filter to preserve JSONB model) and parity in `listDemoAssets`; demo mode stays read-only and project-scoped. Map/list share ONE filter state (`useShell`); filtered markers disappear, list→map focuses marker, map→list selects row and scrolls into view, unplaced never fakes coordinates. Suite: 500/500 tests / 64 files, typecheck, lint, build pass.

> **Phase B — Professional Property Creation Workflow (2026-08):** replaced the giant flat `AssetForm` with a single-page anchored editor (`features/assets/PropertyEditor.tsx`) — 9 sections (Basics, Details, Features & Amenities, Commercial, Location with embedded Google Map, Photos, Documents, Contacts, Operations) with sticky anchor nav, field-level validation, beforeunload dirty guard, and section scroll. Location embeds `PropertyMap` directly (click-to-place, pending marker, both-or-none `latitude/longitude` validated server-side, advanced collapsed lat/lng). Photos: multi-file select, local preview URLs, `cover_pendingId` + reorder (←/→), delete, existing gallery when editing (cover ring, Set cover, Delete), staged upload — pending files uploaded after `createAsset` (then cover set via `updateAsset` `cover_document_id`), edit uploads immediately — reuse `documents` bucket + `image` derivatives, respect 10MB/MIME. Documents: in-flow multi-upload with display name + category mapping to existing `contract/report/image/manual/other` (Floor Plan/Brochure→other), existing docs list + delete. Contacts: search `listContacts` + role select + link, quick-create (`createContact`) inline without leaving editor, existing links from `listAssetContacts` and `unlinkAssetContact` for persisted removals. Save: create staged (`createAsset` → `uploadDocument` images → cover → docs → `linkAssetContact` → `bumpRefresh` → `toast` → `router.push(/dashboard/properties/[id])`), edit (`updateAsset` + pending uploads/links). Demo mode early return read-only. After save property row + metadata normalized + lat/lng + media/docs + contacts persist and detail page shows all. Responsive and a11y preserved. Suite: 505/505 tests / 65 files, typecheck, lint, build pass.

> **Phase C — Dashboard Command Center (2026-08):** rebuilt `DashboardOverview` as business command center (header → KPIs → operational overview → Needs Attention → properties requiring attention → recent activity). Header shows `8AM HUB · INTERNAL OPERATIONS`, greeting + project context (demo `Uluwatu 26 · 16` vs real `n properties`). KPIs reuse `HubKpis` (`Placed 25/92`, `Villa Capacity 16`, `Spots Open 4`, `Units Sold 3/16` demo) via `summarizeProject` shared path. Operational overview `ClickableStatusDistribution` renders `by_status` with `Click to filter` → `router.push(/dashboard/development?status=slug)`. Needs Attention derives 5 signals from current records (active `available/reserved/occupied/pending` only): `withoutPhotos` (image docs `storage_path` check), `unplaced` (`latitude IS NULL`), `missingOps` (`capacity/price` null), `withoutContacts` (`property_contacts` count), `maintenance` (`status slug maintenance`); each `AttentionIssue` has `label/count/description/severity/actionLabel/href`, `unplaced` uses `setPlacementFilter` + push, `maintenance` uses status push. Properties requiring attention compact list (max 8, `code·name` + `issues` chips + `View` → `/dashboard/properties/[id]`). Recent Activity derived from `updated_at` of `assets/contacts/documents` project-scoped, 8 items, `property/contact/document → href`, `timeAgo`, `Derived from record timestamps — not audited history`. Demo parity: `buildDemoDashboardData` returns 16 summary + 1 maintenance issue + 5 recent villas, no photos gap suppressed. Empty `0 total_assets` → `Your property workspace is ready.` CTA, loading skeletons, error `Dashboard failed to load` retry, no fake zeros. Respects `selectedProjectId` + `demoMode` + `refreshKey`, RLS, no map/filters duplication. Suite: 505/505 tests / 65 files, typecheck, lint, build pass, browser verified demo 16 + real 0/1.

> **P1-A — Professional Property Detail / Property Profile (2026-08):** rebuilt `/dashboard/properties/[id]` as canonical profile (header → gallery → overview/key facts → commercial → features → location → documents → contacts → operations → activity). Header shows `code`, `name`, `project/type/status/address`, `price` via `formatPrice`, status pill, `Edit/Delete/Place on map` (via `PropertyEditor` drawer, not second form), demo read-only. Anchor nav sticky pills (`Overview/Gallery/Details/Features/Location/Documents/Contacts/Operations/Activity`) scroll to refs. Gallery prominent: `AssetMedia` cover + thumbnails, `cover_document_id` badge, `Add Photo` multi, count, lightbox. Overview/Key Facts `Bedrooms/Bathrooms/Built-up/Plot/Parking/Floor` (real-estate language, omit empty). Commercial `price/currency` formatted. Features chips from `metadata.features` (presets + custom). Location real Google Map (`PropertyMap` `h-56`, `assets=[asset]`, `isPlaced` check, `Place on map` → `PropertyEditor`, `Not placed` honest, no fake coords). Documents `AssetDocuments` with category (`contract/other` mapping), preview/download. Contacts `property_contacts` with `roleLabel`/`contactTypeLabel`, link/remove via existing. Operations `status/capacity/placed/notes` + placement. Activity honest `Created/Last updated` locale + `Derived from record timestamps — not audited history` (no `audit_logs` table). Responsive `max-w-4xl`, `grid md:grid-cols-2`, map touch-friendly, no horizontal overflow. Demo 16 villas correct, read-only. Suite: 505/505 tests / 65 files (property-details 2/2), typecheck, lint, build pass, browser verified real `1301` + demo `Villa Melasti` with all sections.

> **Reconciliation (`chore(phase5)` — see `docs/MIGRATION.md` #20):** a
> repository-wide audit against the locked 8AM HUB specification closed the
> remaining genuine deviations: NotificationCenter and ReportsPage are
> read-only in Demo Mode, `createNotification` requires admin and
> `generateProjectSummaryReport` requires operator+ (server-side
> `requireRole`), the dashboard KPI card is correctly labeled **VILLA
> CAPACITY**, the property info panel no longer shows an arbitrary first
> property when nothing is selected, and the DATABASE property details panel
> links to the canonical `/dashboard/properties/[id]` route. Intentional
> designs (workspace renders no KPI cards — Dashboard owns KPIs; Activity is
> record-level recency, honest as "durable audit log → Phase 17") were
> documented, not changed. Suite: 498/498 tests / 64 files, typecheck, lint,
> and build all pass at that phase.

---

# Phase 0 — Project Foundation

**Status: ✅ Complete.**

## Goal

Set up a clean, scalable project structure.

### Deliverables

- Repository structure
- Next.js setup
- Supabase project setup
- Database schema + RLS migrations
- Supabase Auth
- Environment configuration
- TailwindCSS
- TypeScript
- Basic layout
- Dark/Light theme support
- Linting
- Formatting
- Git workflow

### Definition of Done

- Frontend and server-side layer communicate.
- Database connection works.
- Project runs locally.

---

# Phase 1 — Authentication

**Status: ✅ Complete (authentication). Roles are deferred to Phase 14.**

## Goal

Secure the application.

### Features

- Login
- Logout
- Session management
- Protected routes
- User profile

### Roles

- Admin
- Manager
- Operator
- Viewer

The role system above was implemented in Phase 14 — Owner Hardening & Real-Data Readiness, scoped to the single-company RLS model (see ADR-014). `profiles.role` drives action-layer `requireRole` gates and RLS write policies; role changes flow only through the SECURITY DEFINER `public.set_user_role()`.

### Definition of Done

Users can authenticate and access only authorized areas. (Roles delivered in Phase 14 — ADR-014.)

---

# Phase 2 — Dashboard Shell

**Status: ✅ Complete. Visual reconciliation with Figma is scheduled for Phase 12.**

## Goal

Create the application layout.

### Features

- Sidebar
- Top navigation
- KPI cards
- Responsive layout
- Theme
- Breadcrumbs

### Definition of Done

Dashboard structure is complete without business data.

---

# Phase 3 — Projects

**Status: ✅ Core complete (server-side CRUD, project selector, project switcher). The full project-admin UI page is a placeholder and remains open work.**

## Goal

Support multiple operational projects.

### Features

- Create project
- Edit project
- Archive project
- Delete project
- Project switcher

The `/dashboard/projects` admin page is currently a `ComingSoon` placeholder (legacy OpsMap route, no longer in the 8AM HUB sidebar); project creation/edit is exercised through the server actions and the topbar `ProjectSelector`. Completing the project-admin UI page (project bootstrap) is open work, tracked in Phase 15 — Owner Core Property & Data Management.

### Definition of Done

Projects become the top-level entity.

---

# Phase 4 — Interactive Workspace

**Status: ✅ Complete (site-plan canvas). Geographic property-map support is scheduled for Phase 11.**

## Goal

Build the heart of the application.

### Features

- Interactive map canvas
- Zoom
- Pan
- Hover
- Selection
- Focus
- Asset highlighting

The current workspace is a pan/zoom/select canvas laid out on world coordinates (`map_x`/`map_y` in asset metadata, deterministic grid fallback in `lib/workspace-layout.ts`). Real-estate property pins with realistic geographic spread are part of Phase 11.

### Future Support

- Blueprint
- Grid
- SVG
- GIS
- Image overlay

### Definition of Done

Users can visually navigate a project.

---

# Phase 5 — Asset Management

**Status: ✅ Complete.**

## Goal

Manage physical assets.

### Features

- Create asset
- Update asset
- Delete asset
- Asset details
- Status
- Owner
- Notes
- Documents
- Assigned users

Real-estate property terminology/metadata sits on top of this phase (Phase 11).

### Definition of Done

Assets exist independently of the UI.

---

# Phase 6 — Status Engine

**Status: ✅ Complete.**

## Goal

Visualize operational state.

### Features

Configurable statuses

Examples

- Available
- Reserved
- Sold
- Maintenance
- Pending
- Offline

Status colors

Legend

Automatic visual updates

### Definition of Done

UI appearance is computed from backend data.

---

# Phase 7 — Search

**Status: ✅ Complete.**

## Goal

Enable fast discovery.

### Features

- Keyword search
- Filters
- Sorting
- Pagination
- Suggestions

### Filters

- Status
- Type
- Owner
- Employee
- Date
- Project

### Definition of Done

Users can quickly locate assets.

---

# Phase 8 — Documents

**Status: ✅ Complete.**

## Goal

Attach information to assets.

### Features

- Upload
- Download
- Delete
- Preview
- Categories

Supported examples

- PDFs
- Images
- Contracts
- Reports

### Definition of Done

Every asset can contain documentation.

---

# Phase 9 — Background Work

**Status: ✅ Complete (current approach).**

## Goal

Keep the request path fast.

### Current Approach

- Image resizing and thumbnail generation run synchronously in the
  server-side layer during upload.
- Report generation runs synchronously on demand.
- Email runs synchronously and is log-only until SMTP is configured.

Reintroducing a job queue is a deliberate future decision (do not add
Redis/RQ/celery infrastructure speculatively).

### Definition of Done

Long-running work never blocks users.

---

# Phase 10 — Notifications

**Status: ✅ Complete.**

## Goal

Improve awareness.

### Features

- Success messages
- Errors
- Email notifications
- Assignment alerts

### Future

- Slack
- Teams
- WhatsApp

### Definition of Done

Users receive important updates automatically.

---

# Phase 11 — 8AM HUB Owner Experience

**Status: ✅ Complete.**

## Goal

Build the owner dashboard as the **8AM HUB** (subtitle **INTERNAL OPERATIONS**): the Figma-derived information architecture, the four functional KPI blocks, the Property Map + Villa List views, property cards and full property details, and the Contacts / Database / Settings areas — on top of the existing generalized architecture (which is **not** renamed).

### Resolved clarifications (recorded, not invented)

The Figma specifies **8AM PLAN** and **FLAT VIEW** buttons without defining exact behavior. Implemented semantics (provisional — confirm with the product owner):

- **8AM PLAN** → fit the viewport to all property pins (`fitToPoints`).
- **FLAT VIEW** → reset to the default flat viewport (`resetView`).

KPI definitions were also confirmed at implementation time and are documented in code (`types/domain.ts` `HubKpis` + `lib/server/services/dashboard.ts`):

- **PLACED (OPS)** → placed pax / total pax capacity (asset metadata `placed`, `capacity`/`pax`).
- **VILLA CAPACITY** → count of villas carrying capacity.
- **SPOTS OPEN** → count of villas whose status maps to OPEN.
- **VILLAS SOLD OUT** → sold villas / total villas (status engine).

Default status-slug → legend mapping lives in `frontend/lib/hub-status.ts` (available → OPEN; reserved/occupied/pending → FILLING; sold → SOLD OUT; maintenance/offline/unknown → NO OPS DATA).

## 8AM HUB Information Architecture

The target user-facing navigation follows the Figma structure exactly:

```
DASHBOARD
ULLUWATU "26
CONTACTS
DATABASE
SETTINGS
------------------
SIGN OUT
PROPERTY ADDRESS
```

This **replaces** the current OpsMap sidebar (Dashboard / Projects / Assets / Search / Tasks / Documents / Reports / Settings) as the user-facing navigation. Existing backend/generalized functionality remains underneath where useful; routes/screens map to current features per "Generalized → Real-Estate Specialization". The Demo/Mock Data control lives in the topbar, immediately left of the notification bell (Phase 13).

### Concrete Deliverables

- **8AM HUB navigation** — implement the Figma sidebar (DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS; SIGN OUT and PROPERTY ADDRESS at the bottom). DASHBOARD is the primary view hosting the map and KPI area.
- **Dashboard KPI area** — four large KPI blocks treated as **functional** concepts (not decorative cards), driven by real data:
  - **PLACED (OPS)** — e.g. 25 / 133 pax
  - **VILLA CAPACITY** — e.g. 63
  - **SPOTS OPEN** — e.g. 38
  - **VILLAS SOLD OUT** — e.g. 5 / 22
- **Property Map + Villa List views** — two **connected** views of the same property/villa data. PROPERTY MAP is the selected/default view; VILLA LIST is the alternate view. No extra behavior beyond this two-view relationship is invented.
- **Map controls** — **8AM PLAN**, **FLAT VIEW**, **Zoom +**, **Zoom -**. The exact functional semantics of 8AM PLAN and FLAT VIEW are **not** established by the Figma alone; record them as an implementation/design clarification to resolve with the product owner rather than inventing behavior.
- **Map status legend** — **OPEN**, **FILLING**, **SOLD OUT**, **NO OPS DATA** at the bottom of the map, representing property/villa operational states; map these onto the existing status engine where possible (Phase 6).
- **Property information / PROPERTY ADDRESS** — the map connects visual property locations with property information, matching the product direction (map → property/villa → information → full details).
- **Property cards + full details** — upgrade `InfoPanel`/`AssetDetailPanel` into a property card with a prominent **"View full details"** action opening a full property details page.
- **CONTACTS** — new dedicated user-facing area/route (no current equivalent).
- **DATABASE** — new/reworked dedicated database experience over the existing assets/search/data infrastructure.
- **SETTINGS** — align the existing settings with the target Figma structure.

### KPI data requirements

Each KPI is data-driven; exact definitions are confirmed with the product owner at implementation time. Candidate data sources:

| KPI | Example | Candidate data |
|---|---|---|
| PLACED (OPS) | 25 / 133 pax | Count of placed/occupied positions vs. total pax capacity across villas; per-villa pax capacity in asset metadata |
| VILLA CAPACITY | 63 | Count of villas holding capacity (active villas); per-villa capacity from asset metadata |
| SPOTS OPEN | 38 | Count of villa spots/villas in the OPEN state (status engine) |
| VILLAS SOLD OUT | 5 / 22 | Count of SOLD OUT villas vs. total villas (status engine) |

### Dependencies

- Phases 0–10 (complete). Reuses `InteractiveCanvas`, `workspace-layout`, `status-colors`, `AssetRepository` list/filter, documents, and the dashboard summary.

### Completion Criteria

- Owner signs in and lands on the 8AM HUB dashboard with the Figma navigation (DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS; SIGN OUT, PROPERTY ADDRESS).
- The four KPI blocks render and are driven by real data (placements, capacity, open spots, sold out).
- PROPERTY MAP is the default view; VILLA LIST is the alternate view; both reflect the same property/villa data.
- Map controls (8AM PLAN, FLAT VIEW, Zoom +, Zoom -) are present; 8AM PLAN / FLAT VIEW semantics are documented as resolved clarifications.
- The status legend (OPEN / FILLING / SOLD OUT / NO OPS DATA) reflects the status engine.
- Clicking a pin opens a property card; "View full details" opens the full property details page.
- CONTACTS, DATABASE, and SETTINGS exist per the Figma structure.
- The generalized asset/project/data model is not broken or renamed; specialization is terminological/experiential.

---

# Phase 12 — 8AM HUB Figma-Aligned UI

**Status: ✅ Complete.**

## Goal

Bring the implemented owner dashboard/UI in line with the **8AM HUB Figma design**, the visual source of truth for the final UI. The 8AM HUB design is extremely minimal: white background, black borders, black typography, **Figtree** typography, blue used as an accent/status color, minimal decoration, compact rectangular controls, large map/workspace area, simple sidebar, and a very restrained visual treatment. The current dark enterprise UI was **not** the target visual design; this phase brought the owner dashboard toward the 8AM HUB design. Existing architecture/functionality is preserved — this phase is visual/UX implementation against Figma, not a product-concept redesign.

### Concrete Deliverables

- **UI audit** — diff the current owner dashboard against the 8AM HUB design: dashboard shell, sidebar, topbar, map/canvas, property cards, details page, KPI blocks, filters, empty/loading/error states, and light/dark themes.
- **Design-system implementation** — implement the 8AM HUB design language into the existing design system (`docs/UI_SYSTEM.md`): white background, black borders, black typography, Figtree, blue accent, compact rectangular controls, restrained decoration.
- **Header controls per Figma** — finalize topbar ordering and design the Demo/Mock Data control (immediately to the left of the notification bell) following the Figma design language, with an obvious ON/OFF state (see Phase 13). The Demo control is an **added product requirement**, not a Figma element.
- **Map, cards, and details visuals** — property pins, property cards, and the full property details page match the 8AM HUB design.
- **Responsive & accessibility** — responsive behavior and accessibility requirements from the design system hold.

### Dependencies

- Phase 11 (functional owner experience exists to be styled).
- Design tokens in `docs/UI_SYSTEM.md`.

### Completion Criteria

- The owner dashboard matches the 8AM HUB Figma design for the defined screens (minimal white/black/Figtree/blue treatment).
- The topbar shows the Demo control immediately to the left of the notification bell (visual design ready).
- Light/dark themes and responsive behavior match the Figma design.
- Accessibility requirements from `docs/UI_SYSTEM.md` hold.

### Delivered

- **Design-system re-theme** — `frontend/styles/tokens.css` retuned from the dark "mission-control" palette to the 8AM HUB light language (white surfaces, near-black borders, black Figtree type, blue accent `#2563eb`, compact 2/4/6px radii, restrained shadows). Because every component consumes `var(--ops-*)` tokens, the dashboard shell, sidebar, topbar, map/canvas, property pins, info panel, full property details page, KPI blocks, filters, tables, forms, and empty/loading/error states all render in the 8AM HUB treatment.
- **Figtree typography** — `frontend/app/layout.tsx` swapped `Geist` for **Figtree** (`next/font/google`), `globals.css` switched `color-scheme` to `light` and maps `--font-sans` to the Figtree variable.
- **Demo control** — new `frontend/features/demo/DemoToggle.tsx`, placed in the topbar **immediately left of the notification bell**. Visual design ready (compact rectangular control, black border, white surface, `DEMO · OFF` badge); the real ON/OFF behavior is Phase 13.
- **KPI copy** — `HubKpiCards` renders Figma-style `x / y pax` / `x / y` (spaced slashes).
- **Verification** — `npm run typecheck`, `npm run lint`, `npm test` (259/259) and `npm run build` all pass.

### Remaining clarifications

- **Dark theme** — the app ships the Figma light theme only; there is no dark-mode toggle in the codebase and the Figma source of truth is white. The "light/dark themes" criterion is treated as satisfied for light; dark-theme parity is a documented gap, to revisit only if a Figma dark spec exists.

---

# Phase 13 — Demo / Mock Data Mode

**Status: ✅ Complete.**

## Goal

Provide a proper Demo/Mock Data mode in the owner dashboard. **The Demo control is an additional product requirement — it is NOT derived from the Figma** (the 8AM HUB Figma does not define it). Its visual treatment follows the 8AM HUB Figma design language. It is a real ON/OFF toggle, not a one-time "load data" action, not a permanent database seed, and not a UI-only fake. It must behave as a predictable state transition:

```
DEMO OFF  → dashboard uses normal/real data, no demo records shown
DEMO ON   → demo data activated; map shows multiple realistic property pins;
            cards/details/filters/search/stats work against demo data
DEMO OFF  → demo data unloaded/deactivated; dashboard returns to the real-data
            state with no stale demo records; turning ON again restores the demo
OFF → ON → OFF → ON must each work correctly
```

### Concrete Deliverables

- **Demo dataset** — realistic, not unnecessarily huge: multiple properties, realistic property names/IDs, realistic locations with enough geographic spread for a meaningful map, property status, useful property metadata, cards, details, filters/search support, dashboard statistics, and representative images/documents where the architecture supports them.
- **Isolated demo-data architecture** — demo data is cleanly separated from production/real data. Exact mechanism (dedicated demo dataset, fixture/seed mechanism, isolated demo records, or another approach) is decided at implementation time based on the existing architecture. The design must make demo mode safely restrictable, disableable, or removable without major architectural restructuring.
- **Reuse over duplication** — where practical, demo mode exercises the same server actions, services, repositories, and UI components that real data uses. Reuse existing fixtures/seeds/factories/mock/demo infrastructure if it exists; today only the idempotent status `seed-defaults` route and the test-only `fakeClient` exist.
- **Demo toggle UI** — a compact, accessible control in the dashboard header, **immediately to the left of the notification bell**:

  ```
  [ ... header controls ... ] [ Demo OFF | Demo ON ] [ 🔔 ]
  ```

  Styling/wording follows the 8AM HUB Figma design language (white background, black borders, black Figtree type, blue accent, compact rectangular control); state visually obvious. The placement is a product requirement, not a Figma element.

### Dependencies

- Phase 12 (header/control placement + visual design per Figma).
- Phases 4–8 (map, assets, statuses, search, documents) as the data flow demo mode drives.

### Completion Criteria (Demo Mode acceptance)

1. The dashboard contains the Demo/Mock Data control immediately left of the notification bell.
2. Demo mode has a clear ON/OFF state.
3. Starting from OFF, switching ON activates the demo dataset.
4. The map visibly populates with realistic property pins.
5. Property selection works with demo properties.
6. Property cards/info panels work with demo properties.
7. "View full details" works with demo properties.
8. Existing search/filter/status functionality works against demo data where applicable.
9. Switching OFF removes/deactivates the demo experience cleanly.
10. Real/production data is not accidentally overwritten or contaminated.
11. Switching ON again restores the demo experience correctly.
12. OFF → ON → OFF → ON works reliably.
13. Demo mode is clearly separated from production data.
14. The implementation can later be restricted, disabled, or removed without major architectural restructuring.

### Delivered

- **State model** — Demo mode is **session-local, in-memory client state** (`demoMode` in the shell store; not persisted, no cookie/URL/localStorage). OFF → ON → OFF → ON is a deterministic boolean transition; a page refresh returns to OFF/normal data. This is a deliberate choice for determinism and zero stale-state leakage (see "Remaining limitations").
- **Isolated demo-data architecture** — a **server-side demo provider** (`frontend/lib/demo/provider.ts`) selected by an explicit `demo` flag on the existing server actions (`listAssets`, `getAsset`, `getProjectSummary`). Demo mode **never writes** to the database: no inserts, no seeds, no deletes, no dedicated demo tables. Real data is untouched by construction.
- **Demo dataset** — `frontend/lib/demo/dataset.ts` (pure, client-safe): 16 villas (`V-101`–`V-116`) across all four legend concepts (OPEN 4 / FILLING 6 / SOLD OUT 3 / NO OPS DATA 3), realistic names, owners, assignees, notes, metadata (capacity/placed, bedrooms/bathrooms/area, view, floor), and explicit `map_x`/`map_y` world coordinates so the Property Map shows a realistic spread.
- **Reuse over duplication** — demo asset status/type **slugs are resolved against the real status engine** at request time, then the same aggregation (`summarizeProject`) and the same filter/sort/pagination semantics power demo data. KPI numbers (PLACED 25 / 92 pax, VILLA CAPACITY 16, SPOTS OPEN 4, VILLAS SOLD OUT 3 / 16) **emerge from the dataset** through the shared path — never hardcoded.
- **Demo toggle UI** — `frontend/features/demo/DemoToggle.tsx` is now a real `role="switch"` control immediately left of the notification bell: neutral black-border `DEMO · OFF` state, blue-accent `DEMO · ON` state, `aria-checked`/labels for accessibility. The project selector is disabled while demo mode is on and shows the demo development; the sidebar PROPERTY ADDRESS shows the demo project name.
- **Demo surfaces** — dashboard KPI cards, Property Map, Villa List, info panel, property selection, and "View full details" all operate on the demo dataset through the existing components/data flow. Demo properties are read-only (upload/delete hidden on the details page).
- **Verification** — `npm run typecheck`, `npm run lint`, `npm test` (280/280, +21 demo tests) and `npm run build` all pass.

### Remaining limitations

- **Refresh resets Demo OFF** (chosen state model). A hard refresh while on a demo property page therefore shows the property as not-found until Demo is switched back ON from the dashboard.
- **No demo documents/images** — documents are storage-backed (`documents` table + storage bucket); synthesizing files without real blobs would render broken previews, so demo assets expose the read-only empty documents state instead.
- **Global topbar search** remains real-data scoped; the dashboard workspace filters (search/status/type) work against demo data via the demo `listAssets` path.

---

# Phase 14 — Owner Hardening & Real-Data Readiness

**Status: ✅ Complete.** Roles/permissions, URL state, `created_by`/`updated_by` + audit coverage, and SMTP email are implemented (ADR-014/015). Durable audit table → Phase 17. Real-data readiness + remaining production-checklist items stay open (deployment/ops gaps → Phase 18); owner-side property operations land in Phase 15.

## Goal

Make the 8AM HUB owner dashboard production-ready with real data: business-user permissions, persistent/URL state, durability gaps, and the production checklist.

### Concrete Deliverables

- **Business-user roles** — ✅ Done (ADR-014). Role column on `profiles` (`20260818000001_phase14_roles.sql`), `public.user_role()` / `public.set_user_role()` SECURITY DEFINER helpers, role-scoped RLS write policies, action-layer `requireRole` gates (viewer < operator < manager < admin), and permission-aware UI (`usePermissions`). Admin-only `setUserRole` action (self-escalation guard). Unauthenticated actors fail closed (403).
- **URL/persistent state** — ✅ Done. `DashboardUrlSync` mirrors project/asset/search/status/type to the URL via `replace()` (no history spam) and hydrates the shell store on mount; `demoMode` stays session-local.
- **Audit/creation metadata** — ✅ Done. `created_by` / `updated_by` populated from `profiles` for projects, assets, asset types, asset statuses, and documents; audit log lines now carry the acting user.
- **Durable audit table** — the durable, immutable audit-log table is delivered by Phase 17 (Audit Logs & Security Hardening). This phase only ensures audit log lines cover new demo/property actions (no duplicated work).
- **Email delivery** — ✅ Done (ADR-015). nodemailer SMTP delivery engaged when `SMTP_HOST` is configured (`.env.example` documents `SMTP_*`/`MAIL_FROM`/`APP_URL`); validated log-only fallback when unset; `sendEmail` never throws.
- **Real-data readiness** — ⚠️ Open. Owner-side property operations are built in Phase 15; the first real deployment creates real project(s)/property data through the UI (not demo data) and verifies search/filter/status/documents/notifications/reports against real data (Phase 18).
- **Production checklist** — ⚠️ Partially done. Security/reliability/logging/health checks (`/api/health` now reports email mode) landed with this phase; CI/CD, environment setup, Lighthouse, database indexes, and deployment/ops gaps remain (folded into Phase 18).

### Dependencies

- Phases 11–13.

### Completion Criteria

- ✅ Owner users can be assigned business roles and the UI reflects permissions (ADR-014; admin-only `setUserRole`, RLS + action-layer enforcement, `usePermissions` UI gating).
- ✅ Refreshing the page preserves the selected project, filters, and selection (URL state via `DashboardUrlSync`).
- ✅ New records carry `created_by` / `updated_by`; audit log lines carry the acting user for demo/property actions.
- ✅ Real email delivery works via SMTP when configured; a documented log-only decision is recorded otherwise (ADR-015).
- ✅ Owner-side property operations are delivered by Phase 15; the production checklist is completed and the 8AM HUB owner dashboard runs against real data in Phase 18 (deployment/ops items).

---

# Phase 15 — Owner Core Property & Data Management

**Status: ✅ Complete.** Owner operating system follow-up (2026-08-19) closed remaining owner-workflow gaps that were technically routed but not usable: property details is now a management workspace (edit/delete), media is a real image gallery on the existing documents/storage stack (`category: image` + `metadata.cover_document_id`), the dashboard is a portfolio overview of persisted properties (not just KPI cards), first-property click-to-place works because the map canvas stays available while creating, and Demo Mode gates the leftover documents/status-engine write surfaces.

## Objective

> **An internal owner can operate the real estate business through 8AM HUB using persistent real data without needing Demo Mode.**

The owner must be able to actually operate the business through the application — create and manage developments and properties, drive the map/list/details/KPIs from real data, and manage the operational numbers that matter — rather than relying on the demo dataset. This phase lands before any customer-facing work.

## Scope (in)

- **Dashboard vs ULLUWATU "26 separation (mandatory).** Both may read the same underlying data, but they are separate experiences and components:
  - **DASHBOARD** — business/operations overview: KPI cards, status distribution, and a useful operational summary/alerts. **No property map. No villa-management workspace.** It answers *"How is the business doing?"*
  - **ULLUWATU "26** — the development/property operations workspace: property map, villa list, property selection, create/edit/delete, status, location, capacity/placed, documents/images, and property details. It answers *"Let me operate/manage the properties."*
- **DATABASE stays structured record management.** The grid/table-oriented CRUD surface (existing `AssetsPage`/`AssetForm`/`AssetDetailPanel`) is the Properties tab; Contacts, Documents, Media and Activity tabs browse the same source-of-truth records and link to the canonical detail routes (`/dashboard/contacts/[id]`, `/dashboard/properties/[id]`). It is **not** turned into another map workspace, and it does not duplicate the Contacts or property-detail interfaces.
- **Property create/edit/delete** from the operations workspace (map + list) and the property detail page — not only DATABASE.
- **Operational data**: status, location (map click-to-place with typed-input fallback), and capacity/placed — with validation, persisting to real data and flowing into dashboard KPIs.
- **Project bootstrap** — the owner can create the development/project they are operating. Minimum flow: **create development → select development → create villa → configure villa → place villa → see villa on map → see villa in list → see property details → see KPI changes on Dashboard**.
- **Documents/images**: reuse the existing document/image infrastructure (upload, storage, thumbnails). **No new upload/storage architecture.** Expose the existing documents/image flow from the ULLUWATU "26 operations workspace and the property detail page.
- **Change propagation**: mutations propagate correctly to the ULLUWATU "26 map, villa list, property details, and Dashboard KPIs without manual refresh.
- **Minimal SETTINGS role management** (admin only): see users, see current role, change role via the existing `set_user_role`. No invitation system, no team-management system, no multi-tenancy, no unnecessary user-lifecycle features.
- **Full test coverage** matching the existing suites (services, actions, RLS, e2e).

## Out of scope

- Customer-facing dashboard (Phase 16), durable audit log (Phase 17), production readiness/deployment (Phase 18).
- Formal CRM / `contacts` table — CONTACTS is now first-class (Phase 2): `contacts` + `property_contacts` tables, CRUD + property relationships, backfilled from asset owners/assignees. Remaining CRM depth (lead pipeline, conversations, call logging) is deferred.
- Any new property fields beyond the current model; pricing/billing systems; advanced analytics; anything in `docs/IDEAS.md`.
- A new upload/storage architecture (reuse existing documents/images infra).
- Invitation system, team management, multi-tenancy, or extra user-lifecycle features.
- Removing Demo Mode — it stays as an opt-in, read-only preview that cannot contaminate real data.
- **Demo Mode write surfaces:** the standalone `/dashboard/documents` page and the SETTINGS Status Engine now hide mutation controls while Demo Mode is ON (read-only notice, matching the Phase 15 pattern).

## Dependencies

- Phases 11–14 (owner experience, Figma-aligned UI, demo mode, owner hardening — roles/RLS, URL state, audit metadata, email).
- Existing `assets` CRUD + `requireRole`/RLS permissions (Phase 14), existing storage/documents/images infrastructure, existing KPI aggregation (`getProjectSummary`).

## Decision checkpoints

1. **Schema: typed columns vs metadata hardening.** The proposed promotion of `capacity` / `placed` / `map_x` / `map_y` into typed `assets` columns is a checkpoint, **not a committed change**. Before implementing any migration, verify:
   - current KPI semantics, especially `placed_capacity`;
   - all current metadata read/write paths;
   - whether typed columns materially simplify the owner workflows;
   - whether the migration introduces unnecessary complexity.
   If typed columns are clearly justified, use them. Otherwise keep the existing `metadata` model and harden validation there. **Do not change the schema merely for theoretical cleanliness.**
   - **RESOLVED — keep `metadata` JSONB; validation hardened in the service layer.** Verified (a) KPI semantics: `placed_capacity` = sum of `capacity` over villas with `capacity > 0`, `villa_capacity` = count of those, `placed` = sum of `placed` — all already robust to string/number via `metaNum` with 0 default; (b) full metadata paths: writes via `AssetForm`/`AssetService`/demo dataset seeds, reads via `summarizeProject`, `readAssetPosition` (`workspace-layout.ts`), property detail panels, and `toAsset` — a column promotion would force all of these plus demo-provider materialization (assets built purely from metadata) and a backfill to change, i.e. dual-source risk; (c) typed columns do not simplify the owner workflow — that simplification comes from the form, not the schema; (d) migration adds backfill/dual-source complexity and re-specializes the deliberately generalized `assets` model. Outcome: `normalizeOperationalMetadata` in `lib/server/validation.ts` (capacity/pax/placed = non-negative integers, map_x/map_y = finite numbers, empty values dropped, unrelated keys preserved) is enforced in `AssetService.create`/`update`.
2. **Workspace split mechanics** — confirm the route/component split of DASHBOARD vs ULLUWATU "26 introduces no regressions to map interactions or URL state.
   - **RESOLVED — Step 3 done.** `/dashboard` now renders `DashboardOverview` (KPI cards + status distribution; no property map, villa list, filters, or info panel). `/dashboard/development` renders `DevelopmentWorkspace` (property map + villa list + info panel + filters; no KPI cards). Both surfaces read the same real-data path (`getProjectSummary`, `listAssets`, `listAssetStatuses`/`listAssetTypes`) and share the unchanged shell state (project, asset, filters, demo mode, `DashboardUrlSync`), so map interactions and URL state are preserved. `DashboardWorkspace` (the duplicated combined surface) is removed.
3. **Property fields** — do not invent fields; use the current model and existing Figma/business requirements to determine the minimum set. A cover photo is added only if the Figma direction justifies it.

## Implementation sequence

1. Resolve decision checkpoint 1 (schema) — **resolved: keep `metadata`; `normalizeOperationalMetadata` validation added to the service layer** (see Decision checkpoints above).
2. Update `AssetService` create/update to accept and validate the operational fields (capacity/placed ≥ 0, finite map coordinates); keep Phase 14 `requireRole` gates; update KPI reads as needed. — **done: `AssetService` validates via `normalizeOperationalMetadata` (Step 1), and the owner property form (`AssetForm`) now exposes Capacity / Placed / Map X / Map Y with basic/operational/detail grouping; empty operational values are omitted, unrelated metadata is preserved, and validation stays in the service layer.**
3. Split DASHBOARD and ULLUWATU "26 into separate experiences/components — **done (see Decision checkpoint 2 resolution): `DashboardOverview` on /dashboard, `DevelopmentWorkspace` on /dashboard/development**.
4. Extend the property form (capacity/placed/status/location) and add create/edit/delete + click-to-place on the operations workspace and property detail page. — **workspace part done (Step 4a): the ULLUWATU "26 workspace now supports Add villa (createAsset), Edit selected villa (updateAsset), Delete/soft-delete with manager+ permission + confirmation, and click-to-place (canvas click → world coords via `screenToWorld` in `workspace-layout.ts`, synced into the form's Map X/Map Y, typed-input fallback kept). Selection is preserved: new villa is selected after create, the edited villa stays selected, selection clears after delete. Demo mode stays read-only (no write actions rendered). Property detail page CRUD remains for a later step.**
5. Add change propagation (shared invalidation/refetch after mutations) so map, villa list, details, and KPIs stay consistent. — **done (Step 5). Two-layer propagation, no new state library:** (a) **server-action revalidation boundary** — `createAsset`/`updateAsset`/`deleteAsset` in `actions/assets.ts` now call `revalidatePath` on `/dashboard`, `/dashboard/development`, `/dashboard/database`, `/dashboard/assets`, `/dashboard/search`, and `/dashboard/properties/[id]` after success (never on failure), invalidating the Next.js route/data cache so the next navigation re-renders fresh RSC; (b) **shared shell refresh signal** — `ShellContext` gained `refreshKey` + `bumpRefresh()` (existing context, not a new store); both mutation surfaces (`DevelopmentWorkspace`, `AssetsPage`) bump it after a successful create/update/delete, and every data surface (`DashboardOverview` KPIs, `DevelopmentWorkspace` map/list, `AssetsPage` DATABASE, `PropertyDetailsPage`, `SearchPage`) includes `refreshKey` in its load-effect deps so any mounted consumer refetches immediately without a manual browser refresh. Read-only surfaces keep their `reloadToken` for manual retry. Demo Mode stays isolated/read-only (mutations are gated client-side, so `bumpRefresh` is never called from demo). Tests cover the action revalidation boundary (create/update/delete + failure no-op) and the shared signal (shell context, dashboard KPI recalculation, ULLUWATU internal consistency).
6. Add the minimal project-bootstrap UI (create/rename/archive a development) and refresh the project selector. — **done (Step 6). `/dashboard/projects` (previously a ComingSoon placeholder) is now a `ProjectsPage` listing active developments with Create (name + auto-slug + description), Rename, Archive (existing `status: "archived"` via `updateProject`, no new archive model), and Delete (existing soft-delete) — all through the existing project actions/service/repository and the existing manager+ `requireRole` gate/RLS. The page is reachable from the new PROJECTS sidebar item and a "Manage developments" footer link in the selector dropdown. Project selector now lists only `status: "active"` developments, subscribes to the shared `refreshKey`/`bumpRefresh` signal, and refetches after any mutation (new development selectable immediately; rename reflected; if the selected development is archived/deleted it is cleared and the seed effect recovers the first active one). `project` mutations add the same server-action `revalidatePath` boundary as assets (`/dashboard`, `/dashboard/projects`, `/dashboard/development`). Empty state: the ProjectsPage shows a "Create your first development" CTA and the ULLUWATU workspace shows a bootstrap CTA when nothing is selected; Demo Mode and non-manager roles stay read-only.**
7. Expose documents/images upload from the ULLUWATU "26 workspace and property detail page (reuse existing flow). — **done (Step 7). Reuses the existing document infrastructure end-to-end — no new tables, buckets, or upload architecture:** the `AssetDocuments` component (already powering the DATABASE `AssetDetailPanel` and `PropertyDetailsPage`) is now embedded in the ULLUWATU `InfoPanel` for the selected villa, giving the owner workspace direct document access (list / upload with progress / preview / download / delete) with the existing category set (`contract | report | image | manual | other`), MIME/size validation, and Sharp thumbnail+resized generation at upload time. Mutations keep the existing permission model (operator+ can upload, manager+ can delete — enforced in server actions via `requireRole`, mirrored in RLS, and reflected in the UI); Demo Mode stays read-only. Propagation uses the same Phase 15 mechanism: document mutations (`createDocument`/`updateDocument`/`deleteDocument`/`uploadDocument`) now call `revalidatePath` on `/dashboard/development`, `/dashboard/database`, and `/dashboard/properties/[id]` after success (never on failure), and `AssetDocuments` subscribes to the shared `refreshKey` signal so any mounted consumer refetches immediately after a mutation. Tests cover the revalidation boundary (success revalidates, failure no-op), unauthorized access (viewers rejected for upload/delete, operators can upload but not delete), and the component (list/upload persists and refreshes/delete removes/permission gating/demo read-only/error state).**
8. Add the minimal admin users/roles surface in SETTINGS using the existing `set_user_role`. — **done (Step 8). SETTINGS now includes a Users & Roles section (above the Status Engine, same page, single scroll — no Settings redesign). Admins see the full profile list (name/email/role/member since — only fields already exposed by the profiles model) with a per-user role `<select>` whose options are exactly Admin / Manager / Operator / Viewer; non-admins see a read-only notice and never get role controls or even a fetch. All role changes go through the existing `setUserRole` action → `public.set_user_role()` SECURITY DEFINER — no role logic duplicated in the UI. Authorization is unchanged and layered: the action requires `admin` via `requireRole`, the SQL definer re-checks the caller is admin and validates the role, and RLS (`profiles_admin_select_all` / `profiles_update_own` self-escalation check) stays intact; failures surface as clean toasts. A new admin-only `listUsers` action reads profiles through the authenticated client (RLS governs visibility) with the existing pagination/mapper patterns. Propagation reuses the Phase 15 mechanism: `setUserRole` calls `revalidatePath("/dashboard/settings")` on success, and the section subscribes to `refreshKey` and calls `bumpRefresh` after a change so the list reflects the new role immediately. Self-role changes follow the existing model (the definer permits them) but require an explicit confirm to prevent accidental lockout. Demo Mode disables role controls (read-only).**
9. Align demo mode with any model changes (read-only preview still renders; never writes). — **done (Step 9). Final demo-mode safety audit of every Phase 15 mutation surface. Demo Mode is a client-only shell flag (`stores/shell-context.tsx`); server READS accept an explicit `demo` flag and serve read-only materialized data from `lib/demo/provider.ts` (never writes — covered by `tests/actions/demo.test.ts`), and server WRITE actions accept no demo flag, so writes are prevented solely by UI gating (`!demoMode`) plus the existing `requireRole`/RLS gates. Audited surfaces, all confirmed read-only in demo: ULLUWATU `DevelopmentWorkspace` (add/edit/delete + click-to-place gated), `InfoPanel` (onEdit/onDelete undefined), `AssetDocuments` (upload/delete hidden), `UsersRolesSection` (selects disabled), `ProjectSelector` (static demo button), `ProjectsPage` (`canMutate = canManage && !demoMode`), `PropertyDetailsPage` (read-only), `DashboardOverview` (read-only KPIs with demo summary). One genuine Phase 15 gap found and fixed: DATABASE `/dashboard/database` (`AssetsPage` + `AssetDetailPanel`) had no demo gating — with a real project selected while demo was ON it rendered real assets and permitted real asset create/edit/delete. Fix: `AssetsPage` reads `demoMode`, lists the demo dataset (`listAssets(..., true)`, `project_id` cleared) even without a selected project, hides the New-asset button/empty-state action, gates the create/edit forms, and shows a read-only banner; `AssetDetailPanel` hides Edit/Delete and shows a "Demo Mode is read-only" note. New focused regression test `tests/components/assets-page.test.tsx` (4 tests) proves demo mode cannot create/edit/delete assets from DATABASE and renders the demo dataset without a selected project. Verification: 385 tests / 53 files pass, `tsc` exit 0, lint clean, production build succeeds. Pre-existing (pre-Phase 15) demo-write vectors intentionally left unfixed and flagged as remaining concerns: the standalone `/dashboard/documents` page (Phase 11, not in sidebar nav) and the SETTINGS Status Engine (Phase 14) both still render mutation controls in demo mode — recommend gating in a follow-up before real-data rollout. RESOLVED in Phase 3.1 (`fix(phase3.1): enforce demo mode read-only safety`): the standalone Documents page was already fully gated (`!demoMode` around the upload form and delete button, plus the existing `requireRole` operator+/manager+ and RLS write gates); the one residual Status Engine gap was its empty-state "Seed defaults" action, which is now gated by `canMutate` (`!demoMode`) with a read-only message in demo. New regression tests `tests/components/documents-page.test.tsx` and `tests/components/status-engine-page.test.tsx` prove upload/delete and seed/create/update/delete are blocked in demo while authorized real-mode behavior is preserved.**
10. Update docs (ROADMAP status, notes) and Graphify; run the full test suite, typecheck, lint, and build.
11. Settings & Integration Configuration Foundation (Phase 4 of the migration plan; see MIGRATION entry 19). — **done. SETTINGS is now a configuration center with a locked IA — General / Users & Access / Integrations (Supabase, WhatsApp) / Notifications / System — behind a new `SettingsPage` shell (left nav, local section state; the standalone section pages are retained and unchanged). General keeps one source of truth: the Workspace card reads/edits the canonical `Project` record (`getProject`/`updateProject`, manager+ via `requireRole`; demo renders read-only `DEMO_PROJECT_VIEW`), and its operational defaults host the existing `AssetTypesSection` + `StatusEnginePage`. Users & Access keeps the canonical `UsersRolesSection`. Integrations: Supabase shows a live status panel fed by the new server action `getSupabaseIntegrationStatus` (probes database/storage/buckets/auth through the RLS-governed client; returns the public URL only, never a key), and WhatsApp is an honest foundation slot ("Not connected", no credential fields — no WhatsApp functionality shipped). Notifications is a "coming soon" notice; System is a read-only health panel (service, environment, Supabase, email transport, config source). Decision recorded: Supabase is deployment/bootstrap configuration (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` public, `SUPABASE_SERVICE_ROLE_KEY` server-only in `lib/env.ts`), and runtime project switching is not supported (NEXT_PUBLIC vars are inlined at build time, auth cookies are project-scoped, RLS is per-database) — the UI honestly reports the configured state only. Secrets are never surfaced: the status action returns no keys, the UI lists only public env var names, and the static boundary guard still forbids service-role references in client files. Demo Mode stays read-only end to end; viewers cannot modify; manager+ for config changes; server-side authoritative. Verification: suite 468/468 tests / 63 files pass, typecheck clean, lint clean, production build succeeds. `HealthResponse` gained an `email` transport field matching the existing `/api/health` response.**

## Acceptance criteria

- An owner can create a development, then create a villa with capacity/placed/status/location from the ULLUWATU "26 map/list, and immediately see it on the map and in the villa list.
- Dashboard KPIs (PLACED (OPS), VILLA CAPACITY, SPOTS OPEN, VILLAS SOLD OUT) reflect edits to capacity/placed/status without a manual refresh.
- DASHBOARD shows no property map or villa-management workspace; ULLUWATU "26 is the property operations workspace; DATABASE remains the table/grid CRUD surface.
- Property details, map marker, villa list, and DATABASE row stay consistent after any mutation.
- Documents/images upload works from the operations workspace and property detail page using the existing infrastructure.
- Admin can view users and change roles via the existing `set_user_role`; non-admins cannot.
- Deleting a villa removes it from map/list/search; soft-delete and Phase 14 permission gates (operator+ edit, manager+ delete) are enforced in actions and RLS.
- Demo mode still works as a read-only preview and never contaminates real data.
- Typecheck, lint, build, and the full test suite (existing + new) are green.

---

# Phase 16 — Customer-Facing Dashboard

**Status: ⏳ Later.** Not an immediate priority; it is scheduled only after the owner/business experience is solid.

## Goal

Let customers browse and look around properties with a separate experience and permission model — distinct from business owners.

### Concrete Deliverables

- **Customer browse experience** — a customer can browse/look around properties, interact with the property map, view property cards, and open full property details.
- **Optional customer sign-in** — customers may optionally authenticate; browsing works without owner credentials.
- **Separate dashboard/UX** — a distinct customer dashboard/experience, not a clone of the owner dashboard.
- **Separate permission model** — customers get read-only access to published/listed properties only; they can never access owner management data or the owner dashboard.
- **Publishing/visibility model** — owners can choose which properties customers can see (additive, e.g. a published/listed flag), so demo and real property data both support it.

### Dependencies

- Phases 11–15 solid. Requires a distinct auth/session scope, separate route space, and customer-scoped RLS policies.

### Completion Criteria

- A customer can browse properties on a map, open property cards, and open full property details without owner authentication.
- The customer cannot access the owner dashboard, owner management UI, or owner data.
- Owners can publish/unpublish properties for the customer experience.

---

# Phase 17 — Audit Logs & Security Hardening

**Status: ⏳ Later.** (Consolidated from the previously preserved "Audit Logs"
phase — durable audit logging is genuine security hardening for the owner
platform, so it stays active. The advanced-idea phases formerly numbered
16–25 have moved to `docs/IDEAS.md`.)

## Goal

Track important actions with a durable, immutable audit log and close the
remaining owner-platform security-hardening gaps.

### Durable audit log

Server log-line audit (`lib/server/audit.ts`) exists and already carries the
acting user (Phase 14, ADR-014). This phase adds the durable, immutable
audit-log table:

- Login / signout
- Asset / property changes
- Status updates
- Role changes (`role.changed` already emitted in Phase 14)
- User actions
- Document uploads / deletions
- Report generation

### Security hardening

- Audit-table RLS (write-only via service role; read by admins)
- Any remaining rate-limiting / input / file-validation gaps surfaced by the
  production checklist (Phase 18)

### Definition of Done

Every important action is traceable through the durable audit table.

---

# Phase 18 — Production Readiness, Deployment & Validation

**Status: ⏳ Later.** (Consolidated from the previously preserved "Production
Readiness" phase; deploying and validating the actual 8AM HUB product is the
roadmap endpoint.)

## Goal

Deploy, validate, and monitor the actual 8AM HUB product against real data.
This is the final phase of the active roadmap.

### Final checklist

#### Security

- Authentication
- Authorization / roles (Phase 14)
- Rate limiting
- Input validation
- File validation

#### Reliability

- Logging
- Error handling
- Monitoring
- Health checks (extend `/api/health` as needed)

#### Developer Experience

- Documentation
- API docs
- Environment setup
- Testing / CI
- CI/CD pipeline

#### Performance

- Lighthouse
- Database indexes (review live query plans)
- Asset optimization

### Real-data validation

- First real deployment creates real project(s)/property data through the UI
  (not demo data)
- Verify search / filter / status / documents / notifications / reports
  against real data
- Verify owner roles/permissions, URL state, `created_by` / `updated_by`, and
  audit metadata against real data

### Definition of Done

The application is ready for real-world deployment, deployed, and validated
against real data.

---

# Roadmap Endpoint

**Core 8AM HUB product complete and production-ready.**

After Phase 18 is complete, the active roadmap ends. Further work belongs to:

- The customer-facing dashboard (Phase 16) if it has not shipped yet, and
- Future ideas in `docs/IDEAS.md` — NOT the active roadmap.

New ideas must not be added to this roadmap as new phases; they belong in
`docs/IDEAS.md` until the product genuinely requires them.

---

# Features That Are Explicitly Out of Scope (For Now)

Do **not** build these until the core platform is stable:

- Native mobile apps
- Billing and subscriptions
- Payment gateways
- Live chat
- Video calls
- Complex workflow builders
- AI agents making autonomous decisions
- Predictive analytics
- IoT integrations
- Offline mode
- Microservices

The items above are non-goals for the core 8AM HUB product. Advanced
product capabilities that were previously planned are tracked — with their
original context — in `docs/IDEAS.md`.

---

# Success Criteria

The project is considered successful when:

- The real-estate business owner can sign in to the **8AM HUB** (INTERNAL OPERATIONS) and manage properties through the Figma-derived dashboard: DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS, with SIGN OUT and PROPERTY ADDRESS.
- The four KPI blocks (PLACED (OPS), VILLA CAPACITY, SPOTS OPEN, VILLAS SOLD OUT) are driven by real data.
- PROPERTY MAP (default) and VILLA LIST are two connected views of the same property/villa data; map → property/villa → information → full details works end to end.
- The owner dashboard/UI matches the 8AM HUB Figma design (minimal white background, black borders, black Figtree typography, blue accent, restrained treatment).
- Demo mode turns the dashboard into a fully populated, realistic real-estate operation on demand — cleanly separated from real data, reliably OFF → ON → OFF → ON, with the Demo control immediately left of the notification bell.
- The platform is intuitive for first-time users.
- The interactive workspace (property map) is the primary method of navigation.
- All business state originates from the database.
- Services remain modular and easy to extend.
- AI enhances, but does not define, the product.
- The same generalized architecture can support multiple industries simply by changing the underlying asset map, with real estate as the primary concrete use case.

---

# Guiding Principle

Every completed phase should leave the application in a usable, deployable state.

Never sacrifice architecture for speed, and never sacrifice simplicity for unnecessary sophistication.