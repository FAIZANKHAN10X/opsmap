# ROADMAP.md

# OpsMap Development Roadmap

> This roadmap defines the order in which the system should be built. Each phase builds upon the previous one. Do not skip phases or introduce future technologies before they solve a real problem.

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

# Phase 0 — Project Foundation

## Goal

Set up a clean, scalable project structure.

### Deliverables

- Repository structure
- Next.js setup
- FastAPI setup
- Supabase connection
- SQLAlchemy
- Environment configuration
- TailwindCSS
- TypeScript
- Basic layout
- Dark/Light theme support
- Linting
- Formatting
- Git workflow

### Definition of Done

- Frontend and backend communicate.
- Database connection works.
- Project runs locally.

---

# Phase 1 — Authentication

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

### Definition of Done

Users can authenticate and access only authorized areas.

---

# Phase 2 — Dashboard Shell

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

## Goal

Support multiple operational projects.

### Features

- Create project
- Edit project
- Archive project
- Delete project
- Project switcher

### Definition of Done

Projects become the top-level entity.

---

# Phase 4 — Interactive Workspace

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

### Definition of Done

Assets exist independently of the UI.

---

# Phase 6 — Status Engine

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

# Phase 9 — Background Jobs

## Goal

Move expensive work out of the API.

### Introduce

- Redis
- RQ

### Jobs

- Image resizing
- Thumbnail generation
- Email
- Report generation

### Definition of Done

Long-running work never blocks users.

---

# Phase 10 — Notifications

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

# Phase 11 — Recommendations

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

# Phase 12 — Analytics

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

# Phase 13 — Audit Logs

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

# Phase 14 — AI Foundation

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

# Phase 15 — Vector Search

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

# Phase 16 — RAG

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

# Phase 17 — MCP

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

# Phase 18 — Enterprise Features

## Features

- Organizations
- Multi-tenancy
- Teams
- Departments
- Custom roles
- Project templates
- Import/Export

---

# Phase 19 — Performance

## Optimize

- Query performance
- Pagination
- Caching
- Lazy loading
- Virtualized lists
- Image optimization

Optimization should only occur after measurement.

---

# Phase 20 — Production Readiness

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

- The platform is intuitive for first-time users.
- The interactive workspace is the primary method of navigation.
- All business state originates from the database.
- Services remain modular and easy to extend.
- AI enhances, but does not define, the product.
- The same architecture can support multiple industries simply by changing the underlying asset map.

---

# Guiding Principle

Every completed phase should leave the application in a usable, deployable state.

Never sacrifice architecture for speed, and never sacrifice simplicity for unnecessary sophistication.
