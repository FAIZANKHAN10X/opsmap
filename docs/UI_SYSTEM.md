# UI_SYSTEM.md

# UI System

> This document defines the visual language, interaction patterns, layout rules, design tokens, and component behavior for OpsMap. Every screen in the application should follow these standards to create a consistent, predictable, and scalable user experience.

---

# Design Philosophy

OpsMap is an enterprise operations platform.

The interface should communicate:

- Confidence
- Precision
- Speed
- Clarity

The UI should feel like mission-control software rather than a marketing website.

---

# Design Principles

## Information First

Decorations never compete with information.

Users should immediately understand:

- What is happening
- Where it is happening
- What requires attention

---

## Consistency

Identical actions should always look and behave the same.

Buttons.

Menus.

Tables.

Dialogs.

Cards.

Every repeated interaction should feel familiar.

---

## Density Without Clutter

Enterprise software often displays large amounts of information.

Information density is encouraged.

Visual clutter is not.

---

## Progressive Disclosure

Show only what is needed.

Reveal complexity gradually.

Overview first.

Details second.

Advanced tools only when required.

---

# Design Language

The product should feel:

- Modern
- Minimal
- Professional
- Data-driven
- Enterprise

Avoid:

- Decorative gradients
- Glassmorphism
- Excessive blur
- Large illustrations
- Cartoon visuals
- Marketing aesthetics

---

# Layout

The application follows a three-zone layout.

```
+----------------------------------------------------+
| Top Navigation                                     |
+-----------+----------------------------------------+
| Sidebar   |                                        |
|           |                                        |
|           |            Workspace                   |
|           |                                        |
|           |                                        |
+-----------+----------------------------------------+
```

The workspace is always the primary focus.

---

# Sidebar

Purpose

Application navigation.

Characteristics

- Fixed width
- Collapsible
- Scrollable
- Icon + label
- Active state clearly visible

Contains

- Dashboard
- Projects
- Assets
- Tasks
- Documents
- Reports
- Settings

The sidebar should never contain operational data.

---

# Top Navigation

Contains:

- Current project
- Search
- Notifications
- User menu
- Breadcrumbs
- Theme switch
- Quick actions

It should remain lightweight.

---

# Workspace

The workspace is the most important UI area.

Depending on the page, it may display:

- Interactive map
- Tables
- Reports
- Documents
- Analytics

Users should spend most of their time here.

---

# Spacing System

Adopt an 8-point spacing scale.

Examples

```
4

8

16

24

32

40

48

64
```

Avoid arbitrary spacing values.

Consistent spacing improves readability.

---

# Border Radius

Use one consistent radius scale.

Examples

Small

Medium

Large

Avoid mixing many different corner styles.

---

# Elevation

Use minimal elevation.

Hierarchy

1. Background
2. Cards
3. Popovers
4. Modals

Elevation should indicate interaction, not decoration.

---

# Color Philosophy

Color communicates meaning.

Never decoration.

Neutral colors dominate the interface.

Accent colors indicate actions.

Status colors indicate operational state.

---

# Status Colors

Every status has one consistent color.

Examples

Available

Reserved

Occupied

Maintenance

Offline

Completed

Pending

The same status should never appear in different colors across the application.

---

# Typography

Typography hierarchy should be predictable.

Examples

- Page Title
- Section Title
- Card Title
- Body
- Caption
- Label

Avoid unnecessary font variations.

---

# Icons

Icons support labels.

They do not replace labels.

Use icons consistently across the platform.

Examples

Search

Filter

Upload

Delete

Edit

Settings

Notification

---

# Buttons

Buttons communicate priority.

Hierarchy

Primary

Secondary

Tertiary

Danger

Disabled

Only one primary action should exist within a given context.

---

# Forms

Forms should:

- Validate immediately where appropriate
- Show inline errors
- Preserve entered values
- Clearly indicate required fields

Avoid long forms whenever possible.

Break large workflows into logical sections.

---

# Tables

Tables are optimized for data exploration.

Support

- Sorting
- Filtering
- Pagination
- Row selection
- Bulk actions
- Sticky headers

Rows should remain compact yet readable.

---

# Cards

Cards summarize information.

Typical content

- Title
- Status
- Metadata
- Actions

Cards should never become miniature pages.

---

# Modals

Use modals only for focused tasks.

Examples

- Confirm delete
- Edit details
- Upload document

Avoid placing complex workflows inside modals.

---

# Drawers

Prefer drawers for editing large entities.

Examples

Asset details

Project settings

Task editor

This preserves workspace context.

---

# Notifications

Notification hierarchy

Success

Information

Warning

Error

Notifications should be concise and actionable.

Avoid interrupting users unnecessarily.

---

# Loading States

Every asynchronous action should provide feedback.

Preferred patterns

- Skeleton loaders
- Progress indicators
- Inline loading states

Avoid blank screens.

---

# Empty States

Every empty view should explain:

- Why it is empty
- What the user can do next

Example

"No assets have been created yet."

Provide a clear call-to-action.

---

# Error States

Errors should explain:

- What happened
- Why it happened (when known)
- How to recover

Avoid technical jargon.

---

# Interactive Workspace

The workspace should support:

- Pan
- Zoom
- Hover
- Selection
- Multi-selection
- Context menus

Interactions should remain smooth even with large numbers of assets.

---

# Asset Visualization

Every asset should visually communicate:

- Type
- Status
- Selection state
- Hover state
- Assignment (where relevant)

Appearance should always derive from backend data.

---

# KPI Cards

KPI cards summarize operational metrics.

Examples

- Total Assets
- Available
- Occupied
- Revenue
- Progress
- Open Tasks

Cards should prioritize readability over decoration.

---

# Search Experience

Search should be globally accessible.

Support

- Keyboard shortcut
- Suggestions
- Recent searches
- Filters
- Fast results

Search should feel instantaneous.

---

# Accessibility

The interface should support:

- Keyboard navigation
- Visible focus states
- Sufficient color contrast
- Screen readers where practical

Accessibility is a requirement, not an enhancement.

---

# Motion

Animations should communicate state changes.

Allowed

- Fade
- Scale
- Slide
- Expand

Avoid decorative animations.

All motion should feel subtle and purposeful.

---

# Responsive Design

Optimize for:

- Desktop (primary)
- Tablet (secondary)

Mobile support should remain functional but is not the primary design target during initial development.

---

# Dark Mode

Dark mode should not simply invert colors.

Design both light and dark themes intentionally.

Status colors must remain recognizable in both themes.

---

# Component Philosophy

Every component should be:

- Reusable
- Predictable
- Accessible
- Composable

Avoid creating page-specific components unless necessary.

---

# Future Design Evolution

The UI system should allow future additions without redesigning existing screens.

Examples

- New dashboards
- Additional modules
- AI panels
- Multi-project views
- Real-time collaboration

Consistency should scale with the product.

---

# Final Principle

Every design decision should reduce cognitive load.

Users should spend their attention managing operations—not figuring out how the interface works.
