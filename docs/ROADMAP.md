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
| Information architecture / sidebar navigation | ✅ Done (8AM HUB sidebar: DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS; SIGN OUT + PROPERTY ADDRESS at bottom) | 8AM HUB navigation: DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS (bottom: SIGN OUT, PROPERTY ADDRESS) | Phase 11 |
| Dashboard shell (sidebar, topbar, KPIs, theme) | ✅ Done (8AM HUB minimal design: white bg, black borders, black Figtree type, blue accent) | 8AM HUB minimal design (white bg, black borders, black Figtree type, blue accent) | Phase 2, Phase 12 |
| Dashboard KPI area | ✅ Done (`HubKpiCards`: PLACED (OPS) x/y pax, VILLA CAPACITY, SPOTS OPEN, VILLAS SOLD OUT x/y — data-driven) | Four functional KPI blocks: PLACED (OPS) e.g. 25/133 pax, VILLA CAPACITY 63, SPOTS OPEN 38, VILLAS SOLD OUT 5/22 — each data-driven | Phase 11 |
| Property Map / Villa List views | ✅ Done (PROPERTY MAP default + VILLA LIST alternate toggle in `DashboardWorkspace`; same data) | Two connected views of the same property/villa data; PROPERTY MAP is the default, VILLA LIST the alternate | Phase 4, Phase 11 |
| Interactive 2D map (pan/zoom/hover/select) | ✅ Done as a "Site plan" canvas | Realistic, geographically-spread property/villa pins on the map | Phase 4, Phase 11 |
| Map controls | ✅ Done (8AM PLAN, FLAT VIEW, Zoom +, Zoom -; semantics documented as resolved clarifications) | 8AM PLAN, FLAT VIEW, Zoom +, Zoom - (8AM PLAN / FLAT VIEW exact semantics = implementation/design clarification, not invented) | Phase 11 |
| Status legend | ✅ Done (OPEN / FILLING / SOLD OUT / NO OPS DATA mapped to the status engine via `lib/hub-status.ts`) | OPEN, FILLING, SOLD OUT, NO OPS DATA at the bottom of the map — mapped to the existing status engine where possible | Phase 6, Phase 11 |
| Property management (assets) | ✅ Done (CRUD, status, owner, notes, assignees, documents) | Real-estate property/villa terminology/metadata on top of the generalized model | Phase 5, Phase 11 |
| Property cards / info panel | ✅ Done (`InfoPanel` property card with capacity/placed + prominent "View full details") | Property card + "View full details" action | Phase 11 |
| Full property details page | ✅ Done (`/dashboard/properties/[id]` — `PropertyDetailsPage`) | Full property details page | Phase 11 |
| PROPERTY ADDRESS | ✅ Done (sidebar bottom block shows the selected project name) | Specialized property address connecting visual map location with property info | Phase 11 |
| CONTACTS | ✅ Done (`/dashboard/contacts` — `ContactsPage`, derived from asset owners/assignees) | New functionality/route | Phase 11 |
| DATABASE | ✅ Done (`/dashboard/database` — reuses the asset database UI) | New/reworked dedicated database experience | Phase 11 |
| SETTINGS | ✅ Done | Align with the target Figma structure | Phase 11 |
| Search / filters / sorting / suggestions | ✅ Done | Reused; works against demo data | Phase 7, Phase 13 |
| Documents | ✅ Done (upload/download/preview/delete/categories) | Reused; representative demo documents | Phase 8, Phase 13 |
| Background work | ✅ Done — synchronous derivatives/reports/email (no Redis/RQ; a queue is a deliberate future decision) | Keep current approach unless measurement proves otherwise | Phase 9 |
| Notifications | ✅ Done (bell + dropdown + toasts + assignment alerts; Demo control sits immediately left of the bell) | Reused; header ordering places Demo control immediately left of the bell | Phase 10, Phase 12, Phase 13 |
| Demo / Mock Data toggle | ✅ Done (real ON/OFF toggle immediately left of the bell; server-side isolated demo dataset; session-local state) | Real ON/OFF toggle in the dashboard header, immediately left of the notification bell (added product requirement, not a Figma element) | Phase 13 |
| Figma-aligned UI | ✅ Done (owner dashboard/UI matches the 8AM HUB Figma design — minimal white/black/Figtree/blue) | Implemented owner dashboard/UI matches the 8AM HUB Figma design (minimal white/black/Figtree/blue) | Phase 12 |
| URL state (`selectedProjectId`, filters, selection) | ✅ Done (`DashboardUrlSync` mirrors project/asset/search/status/type; refresh preserves context) | URL/persistent state | Phase 14 |
| `created_by` / `updated_by` population | ✅ Done (populated from `profiles` for projects/assets/types/statuses/documents; audit lines carry the actor) | Populated from `profiles` | Phase 14 |
| Durable audit table | ⚠️ Audit is server log lines only (`lib/server/audit.ts`) | Durable, immutable audit log | Phase 16 |
| Email delivery | ✅ Done (ADR-015: SMTP via nodemailer when `SMTP_HOST` set; validated log-only fallback; never throws) | Real SMTP delivery (or documented decision) | Phase 14 |
| Real-data readiness | ⚠️ Live Supabase verified (Phase 14 of the migration); deployment/ops gaps remain | Production-ready owner dashboard | Phase 14, Phase 17 |
| Customer-facing dashboard | ❌ Missing | Separate browse experience + separate permission model | Phase 15 |
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
| DATABASE | Existing Assets/Search/data infrastructure | New/reworked dedicated database experience |
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
| 7 | Search | ✅ Complete |
| 8 | Documents | ✅ Complete |
| 9 | Background Work | ✅ Complete (synchronous approach confirmed) |
| 10 | Notifications | ✅ Complete |
| 11 | 8AM HUB Owner Experience | ✅ Complete |
| 12 | 8AM HUB Figma-Aligned UI | 🔜 Next |
| 13 | Demo / Mock Data Mode | 🔜 Next |
| 14 | Owner Dashboard Hardening & Real-Data Readiness | 🔜 Next |
| 15 | Customer-Facing Dashboard | Later |
| 16 | Audit Logs & Security Hardening | Later |
| 17 | Production Readiness, Deployment & Validation | Later (roadmap endpoint) |

Advanced capabilities previously listed as Phases 16–25 (recommendations, advanced analytics, AI foundation, vector search, RAG, MCP, enterprise features, performance optimization) are **moved to `docs/IDEAS.md`** — future ideas, not active phases.

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

The role system above was implemented in Phase 14 — Owner Dashboard Hardening & Real-Data Readiness, scoped to the single-company RLS model (see ADR-014). `profiles.role` drives action-layer `requireRole` gates and RLS write policies; role changes flow only through the SECURITY DEFINER `public.set_user_role()`.

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

The `/dashboard/projects` admin page is currently a `ComingSoon` placeholder (legacy OpsMap route, no longer in the 8AM HUB sidebar); project creation/edit is exercised through the server actions and the topbar `ProjectSelector`. Completing the project-admin UI page is open work (tracked in Phase 14 hardening).

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

# Phase 14 — Owner Dashboard Hardening & Real-Data Readiness

**Status: 🔄 In progress.** Roles/permissions, URL state, `created_by`/`updated_by` + audit coverage, and SMTP email are implemented (ADR-014/015). Durable audit table → Phase 16. Real-data readiness + remaining production-checklist items stay open (deployment/ops gaps → Phase 17).

## Goal

Make the 8AM HUB owner dashboard production-ready with real data: business-user permissions, persistent/URL state, durability gaps, and the production checklist.

### Concrete Deliverables

- **Business-user roles** — ✅ Done (ADR-014). Role column on `profiles` (`20260818000001_phase14_roles.sql`), `public.user_role()` / `public.set_user_role()` SECURITY DEFINER helpers, role-scoped RLS write policies, action-layer `requireRole` gates (viewer < operator < manager < admin), and permission-aware UI (`usePermissions`). Admin-only `setUserRole` action (self-escalation guard). Unauthenticated actors fail closed (403).
- **URL/persistent state** — ✅ Done. `DashboardUrlSync` mirrors project/asset/search/status/type to the URL via `replace()` (no history spam) and hydrates the shell store on mount; `demoMode` stays session-local.
- **Audit/creation metadata** — ✅ Done. `created_by` / `updated_by` populated from `profiles` for projects, assets, asset types, asset statuses, and documents; audit log lines now carry the acting user.
- **Durable audit table** — the durable, immutable audit-log table is delivered by Phase 16 (Audit Logs & Security Hardening). This phase only ensures audit log lines cover new demo/property actions (no duplicated work).
- **Email delivery** — ✅ Done (ADR-015). nodemailer SMTP delivery engaged when `SMTP_HOST` is configured (`.env.example` documents `SMTP_*`/`MAIL_FROM`/`APP_URL`); validated log-only fallback when unset; `sendEmail` never throws.
- **Real-data readiness** — ⚠️ Open. First real deployment creates real project(s)/property data through the UI (not demo data); verify search/filter/status/documents/notifications/reports against real data.
- **Production checklist** — ⚠️ Partially done. Security/reliability/logging/health checks (`/api/health` now reports email mode) landed with this phase; CI/CD, environment setup, Lighthouse, database indexes, and deployment/ops gaps remain (folded into Phase 17).

### Dependencies

- Phases 11–13.

### Completion Criteria

- ✅ Owner users can be assigned business roles and the UI reflects permissions (ADR-014; admin-only `setUserRole`, RLS + action-layer enforcement, `usePermissions` UI gating).
- ✅ Refreshing the page preserves the selected project, filters, and selection (URL state via `DashboardUrlSync`).
- ✅ New records carry `created_by` / `updated_by`; audit log lines carry the acting user for demo/property actions.
- ✅ Real email delivery works via SMTP when configured; a documented log-only decision is recorded otherwise (ADR-015).
- ⚠️ The production checklist is green; the 8AM HUB owner dashboard runs against real data (deployment/ops items remain).

---

# Phase 15 — Customer-Facing Dashboard

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

- Phases 11–14 solid. Requires a distinct auth/session scope, separate route space, and customer-scoped RLS policies.

### Completion Criteria

- A customer can browse properties on a map, open property cards, and open full property details without owner authentication.
- The customer cannot access the owner dashboard, owner management UI, or owner data.
- Owners can publish/unpublish properties for the customer experience.

---

# Phase 16 — Audit Logs & Security Hardening

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
  production checklist (Phase 17)

### Definition of Done

Every important action is traceable through the durable audit table.

---

# Phase 17 — Production Readiness, Deployment & Validation

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

After Phase 17 is complete, the active roadmap ends. Further work belongs to:

- The customer-facing dashboard (Phase 15) if it has not shipped yet, and
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