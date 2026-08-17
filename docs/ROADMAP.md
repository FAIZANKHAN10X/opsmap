# ROADMAP.md

# OpsMap Development Roadmap

> This roadmap defines the order in which the system should be built. Each phase builds upon the previous one. Do not skip phases or introduce future technologies before they solve a real problem.
>
> Phase numbering note: this roadmap was reconciled on 2026-08-17 to the real-estate owner-dashboard direction. Phases 0–10 are the original product phases, now complete on the Next.js + TypeScript + Supabase architecture. Phases 11–15 are new forward work. Phases 16–25 preserve the original advanced phases (each annotated with its original number); they remain in the roadmap until we later decide what to keep, simplify, or remove.
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

FUTURE/OPTIONAL
  Existing advanced OpsMap capabilities, which remain in the roadmap
  until we later decide what to keep
```

Positioning rules:

- OpsMap is **not** being redesigned into a generic consumer real-estate marketplace.
- The owner/business dashboard is the product: **8AM HUB**.
- The existing generalized asset/project/operations architecture stays — it provides flexibility and supports future expansion. The internal architecture continues to use concepts such as Project, Asset, AssetStatus, and Asset metadata while the user-facing application presents the 8AM HUB terminology (ULLUWATU "26, Villa, Property, Property Map, Villa List). This distinction is documented in "Generalized → Real-Estate Specialization".
- **The current OpsMap navigation is not the target product navigation.** The target user-facing information architecture follows the 8AM HUB Figma structure (DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS; SIGN OUT; PROPERTY ADDRESS). Existing backend/generalized functionality remains underneath where useful.
- The Figma design is the visual source of truth for the final UI. The 8AM HUB design is extremely minimal — white background, black borders, black typography, Figtree typography, blue accent/status color, minimal decoration, compact rectangular controls, large map/workspace area, simple sidebar, very restrained treatment. The current dark enterprise UI is **not** the target. The roadmap explicitly includes the work to bring the implemented owner dashboard/UI in line with Figma (Phase 12).
- The Demo/Mock Data toggle is an **additional product requirement**, not something derived from the Figma. It is placed immediately left of the notification bell and its visual treatment follows the Figma design language.
- Existing advanced capabilities (background jobs, Redis/RQ history, search, documents, notifications, reports, AI/RAG/MCP-related architecture, generalized asset/project systems, enterprise features) are **preserved** in this roadmap. Removing/simplifying them is a later product-scope decision, not part of this reconciliation.

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
| Roles / permissions (Admin, Manager, Operator, Viewer) | ⚠️ Deferred by ADR-012; `profiles` has no role field | Business-user roles scoped to the single-company RLS model | Phase 14 |
| Information architecture / sidebar navigation | ⚠️ Current OpsMap sidebar: Dashboard, Projects, Assets, Search, Tasks, Documents, Reports, Settings — **not** the target | 8AM HUB navigation: DASHBOARD, ULLUWATU "26, CONTACTS, DATABASE, SETTINGS (bottom: SIGN OUT, PROPERTY ADDRESS) | Phase 11 |
| Dashboard shell (sidebar, topbar, KPIs, theme) | ✅ Done (dark enterprise theme) | 8AM HUB minimal design (white bg, black borders, black Figtree type, blue accent) | Phase 2, Phase 12 |
| Dashboard KPI area | ⚠️ `StatusSummaryCards` (generic status counts) | Four functional KPI blocks: PLACED (OPS) e.g. 25/133 pax, VILLA CAPACITY 63, SPOTS OPEN 38, VILLAS SOLD OUT 5/22 — each data-driven | Phase 11 |
| Property Map / Villa List views | ⚠️ Single "Site plan" canvas (`InteractiveCanvas`, world coords `map_x`/`map_y`) | Two connected views of the same property/villa data; PROPERTY MAP is the default, VILLA LIST the alternate | Phase 4, Phase 11 |
| Interactive 2D map (pan/zoom/hover/select) | ✅ Done as a "Site plan" canvas | Realistic, geographically-spread property/villa pins on the map | Phase 4, Phase 11 |
| Map controls | ⚠️ Pan/zoom present | 8AM PLAN, FLAT VIEW, Zoom +, Zoom - (8AM PLAN / FLAT VIEW exact semantics = implementation/design clarification, not invented) | Phase 11 |
| Status legend | ✅ Done (configurable statuses, colors, legend, summary) | OPEN, FILLING, SOLD OUT, NO OPS DATA at the bottom of the map — mapped to the existing status engine where possible | Phase 6, Phase 11 |
| Property management (assets) | ✅ Done (CRUD, status, owner, notes, assignees, documents) | Real-estate property/villa terminology/metadata on top of the generalized model | Phase 5, Phase 11 |
| Property cards / info panel | ✅ Done (`InfoPanel` slide-over + `AssetDetailPanel` side panel) | Property card + "View full details" action | Phase 11 |
| Full property details page | ❌ Missing (no `/dashboard/properties/[id]` route; "View full details" does not exist) | Full property details page | Phase 11 |
| PROPERTY ADDRESS | ⚠️ Asset information concepts exist | Specialized property address connecting visual map location with property info | Phase 11 |
| CONTACTS | ❌ No dedicated user-facing area | New functionality/route | Phase 11 |
| DATABASE | ⚠️ Existing Assets/Search/data infrastructure | New/reworked dedicated database experience | Phase 11 |
| SETTINGS | ✅ Done | Align with the target Figma structure | Phase 11 |
| Search / filters / sorting / suggestions | ✅ Done | Reused; works against demo data | Phase 7, Phase 13 |
| Documents | ✅ Done (upload/download/preview/delete/categories) | Reused; representative demo documents | Phase 8, Phase 13 |
| Background work | ✅ Done — synchronous derivatives/reports/email (no Redis/RQ; a queue is a deliberate future decision) | Keep current approach unless measurement proves otherwise | Phase 9 |
| Notifications | ✅ Done (bell + dropdown + toasts + assignment alerts) | Reused; header ordering places Demo control immediately left of the bell | Phase 10, Phase 12, Phase 13 |
| Demo / Mock Data toggle | ❌ Missing (all mock infra was removed in the migration; only test `fakeClient` and idempotent status `seed-defaults` exist) | Real ON/OFF toggle in the dashboard header, immediately left of the notification bell (added product requirement, not a Figma element) | Phase 13 |
| Figma-aligned UI | ❌ Not yet reconciled | Implemented owner dashboard/UI matches the 8AM HUB Figma design (minimal white/black/Figtree/blue) | Phase 12 |
| URL state (`selectedProjectId`, filters, selection) | ⚠️ `selectedProjectId` is client-memory only (resets on refresh) | URL/persistent state | Phase 14 |
| `created_by` / `updated_by` population | ⚠️ Columns exist but are unpopulated (legacy pre-auth model) | Populated from `profiles` | Phase 14 |
| Durable audit table | ⚠️ Audit is server log lines only (`lib/server/audit.ts`) | Durable, immutable audit log | Phase 18 (preserved) |
| Email delivery | ⚠️ Log-only until SMTP is configured | Real SMTP delivery (or documented decision) | Phase 14 |
| Real-data readiness | ⚠️ Live Supabase verified (Phase 14 of the migration); deployment/ops gaps remain | Production-ready owner dashboard | Phase 14, Phase 25 |
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
| 1 | Authentication | ✅ Complete (auth); roles → Phase 14 |
| 2 | Dashboard Shell | ✅ Complete (Figma pass → Phase 12) |
| 3 | Projects | ✅ Core complete (admin page pending) |
| 4 | Interactive Workspace | ✅ Complete (geographic map → Phase 11) |
| 5 | Asset Management | ✅ Complete |
| 6 | Status Engine | ✅ Complete |
| 7 | Search | ✅ Complete |
| 8 | Documents | ✅ Complete |
| 9 | Background Work | ✅ Complete (synchronous approach confirmed) |
| 10 | Notifications | ✅ Complete |
| 11 | 8AM HUB Owner Experience | 🔜 Next |
| 12 | 8AM HUB Figma-Aligned UI | 🔜 Next |
| 13 | Demo / Mock Data Mode | 🔜 Next |
| 14 | Owner Dashboard Hardening & Real-Data Readiness | 🔜 Next |
| 15 | Customer-Facing Dashboard | Later |
| 16 | Recommendations (was 11) | Future / Optional |
| 17 | Analytics (was 12) | Future / Optional |
| 18 | Audit Logs (was 13) | Later |
| 19 | AI Foundation (was 14) | Future / Optional |
| 20 | Vector Search (was 15) | Future / Optional |
| 21 | RAG (was 16) | Future / Optional |
| 22 | MCP (was 17) | Future / Optional |
| 23 | Enterprise Features (was 18) | Future / Optional |
| 24 | Performance (was 19) | Future / Optional |
| 25 | Production Readiness (was 20) | Later (partially covered by hardening) |

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

The role system above was part of the original plan and is **not yet implemented** (ADR-012 deferred it; `profiles` stores no role today). It is scheduled for Phase 14 — Owner Dashboard Hardening & Real-Data Readiness, scoped to the single-company RLS model.

### Definition of Done

Users can authenticate and access only authorized areas. (Roles complete when Phase 14 delivers them.)

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

The `/dashboard/projects` admin page is currently a `ComingSoon` placeholder; project creation/edit is exercised through the server actions and the topbar `ProjectSelector`. Completing the project-admin UI page is open work (tracked as part of the owner-dashboard experience in Phase 11).

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

**Status: 🔜 Next.**

## Goal

Build the owner dashboard as the **8AM HUB** (subtitle **INTERNAL OPERATIONS**): the Figma-derived information architecture, the four functional KPI blocks, the Property Map + Villa List views, property cards and full property details, and the Contacts / Database / Settings areas — on top of the existing generalized architecture (which is **not** renamed).

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

**Status: 🔜 Next.**

## Goal

Bring the implemented owner dashboard/UI in line with the **8AM HUB Figma design**, the visual source of truth for the final UI. The 8AM HUB design is extremely minimal: white background, black borders, black typography, **Figtree** typography, blue used as an accent/status color, minimal decoration, compact rectangular controls, large map/workspace area, simple sidebar, and a very restrained visual treatment. The current dark enterprise UI is **not** the target visual design; this phase brings the owner dashboard toward the 8AM HUB design. Existing architecture/functionality is preserved — this phase is visual/UX implementation against Figma, not a product-concept redesign.

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

---

# Phase 13 — Demo / Mock Data Mode

**Status: 🔜 Next.**

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

---

# Phase 14 — Owner Dashboard Hardening & Real-Data Readiness

**Status: 🔜 Next.**

## Goal

Make the 8AM HUB owner dashboard production-ready with real data: business-user permissions, persistent/URL state, durability gaps, and the production checklist.

### Concrete Deliverables

- **Business-user roles** — implement the original Phase 1 roles (Admin, Manager, Operator, Viewer) scoped to the single-company RLS model. Additive: a role column/profile attribute or minimal roles table, RLS/service enforcement, and permission-aware UI.
- **URL/persistent state** — move `selectedProjectId`, filters, and property/asset selection into URL state (addresses the known `selectedProjectId` client-memory open item) so refresh preserves context.
- **Audit/creation metadata** — populate `created_by` / `updated_by` from `profiles` for new records.
- **Durable audit table** — the durable, immutable audit-log table is delivered by the preserved Audit Logs phase (Phase 18). This phase only ensures audit log lines cover new demo/property actions (no duplicated work).
- **Email delivery** — replace log-only email with real SMTP delivery (or record a documented decision to stay log-only).
- **Real-data readiness** — first real deployment creates real project(s)/property data through the UI (not demo data); verify search/filter/status/documents/notifications/reports against real data.
- **Production checklist** — security, reliability, logging, monitoring, health checks, CI/CD, environment setup, Lighthouse, database indexes (the original Phase 20/25 items; much already covered by migration Phase 14).

### Dependencies

- Phases 11–13.

### Completion Criteria

- Owner users can be assigned business roles and the UI reflects permissions.
- Refreshing the page preserves the selected project, filters, and selection.
- New records carry `created_by` / `updated_by`; audit log lines cover demo/property actions.
- Real email delivery works, or a documented log-only decision is recorded.
- The production checklist is green; the 8AM HUB owner dashboard runs against real data.

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

# Phase 16 — Recommendations

**Status: ⏳ Future / Optional.** (Original Phase 11, preserved.)

## Goal

Help users make decisions.

### Version 1

Rule-based

Examples

- Similar assets
- Nearby assets
- Similar status
- Similar type

### Definition of Done

Recommendation engine works without AI.

---

# Phase 17 — Analytics

**Status: ⏳ Future / Optional.** (Original Phase 12, preserved.)

## Goal

Provide operational insights.

### KPIs

- Total assets
- Occupancy
- Availability
- Completion rate
- Revenue
- Pending tasks

### Charts

- Asset distribution
- Status breakdown
- Project progress
- Activity timeline

### Definition of Done

Managers understand project health at a glance.

---

# Phase 18 — Audit Logs

**Status: ⏳ Later.** (Original Phase 13, preserved.) Server log-line audit (`lib/server/audit.ts`) exists; the durable, immutable audit-log table is delivered here. Phase 14 depends on this phase for the durable table.

## Goal

Track important actions.

### Log

- Login
- Asset changes
- Status updates
- User actions
- Document uploads

### Definition of Done

Every important action is traceable.

---

# Phase 19 — AI Foundation

**Status: ⏳ Future / Optional.** (Original Phase 14, preserved.)

## Goal

Introduce AI responsibly.

### Features

- Asset summaries
- Property description generation
- Natural language queries
- Operational insights

### Definition of Done

AI enhances existing workflows without replacing deterministic logic.

---

# Phase 20 — Vector Search

**Status: ⏳ Future / Optional.** (Original Phase 15, preserved.)

## Goal

Support semantic understanding.

### Introduce

- Embeddings
- Vector database

### Features

Semantic search

Examples

> Find luxury homes with open kitchens.

> Show unfinished projects near schools.

### Definition of Done

Search supports meaning, not only keywords.

---

# Phase 21 — RAG

**Status: ⏳ Future / Optional.** (Original Phase 16, preserved.)

## Goal

Allow AI to understand project documents.

### Knowledge Sources

- Contracts
- Builder brochures
- Maintenance manuals
- Inspection reports
- Internal documentation

### Workflow

```
Question

↓

Embedding

↓

Vector Search

↓

Relevant Documents

↓

LLM

↓

Answer
```

### Definition of Done

Users can ask questions about project documentation.

---

# Phase 22 — MCP

**Status: ⏳ Future / Optional.** (Original Phase 17, preserved.)

## Goal

Turn the AI into an operator.

### Expose Internal Tools

Examples

- search_assets()
- update_asset()
- assign_employee()
- create_task()
- upload_document()
- schedule_inspection()
- generate_report()

### Example

User

> Show all available villas under construction.

↓

AI calls search_assets()

↓

Returns results

↓

User

> Assign John to all of them.

↓

AI calls assign_employee()

### Definition of Done

AI performs actions using tools instead of generating guesses.

---

# Phase 23 — Enterprise Features

**Status: ⏳ Future / Optional.** (Original Phase 18, preserved.)

## Features

- Organizations
- Multi-tenancy
- Teams
- Departments
- Custom roles
- Project templates
- Import/Export

---

# Phase 24 — Performance

**Status: ⏳ Future / Optional.** (Original Phase 19, preserved.)

## Optimize

- Query performance
- Pagination
- Caching
- Lazy loading
- Virtualized lists
- Image optimization

Optimization should only occur after measurement.

---

# Phase 25 — Production Readiness

**Status: ⏳ Later** (partially covered by migration Phase 14 hardening and Phase 14 of this roadmap).

## Final Checklist

### Security

- Authentication
- Authorization
- Rate limiting
- Input validation
- File validation

### Reliability

- Logging
- Error handling
- Monitoring
- Health checks

### Developer Experience

- Documentation
- API docs
- Environment setup
- Testing
- CI/CD

### Performance

- Lighthouse
- Database indexes
- Asset optimization

### Definition of Done

The application is ready for real-world deployment.

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