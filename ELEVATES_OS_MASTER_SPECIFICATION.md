# Elevates OS — Master System Architecture & Feature Specification

> **Document Identifier:** `ELEVATES_OS_MASTER_SPECIFICATION.md`  
> **System Name:** Elevates OS (EOS)  
> **Platform Version:** 1.5.0 Production Architecture  
> **Target Environment:** Multi-Campus Innovation Network (`elevates.live`)  
> **Core Technology Stack:** Next.js 15 (App Router), TypeScript, Supabase PostgreSQL with Strict RLS, Tailwind CSS, TipTap Rich Text Engine, Discord Realtime Engine

---

## Table of Contents
1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Dual Operational Modes & Runtime Architecture](#2-dual-operational-modes--runtime-architecture)
3. [Complete Directory Tree & Codebase Layout](#3-complete-directory-tree--codebase-layout)
4. [User Roles, Hierarchy & Granular RBAC Matrix](#4-user-roles-hierarchy--granular-rbac-matrix)
5. [Design System & Layout Architecture](#5-design-system--layout-architecture)
6. [Domain 1: Organization & Chapter Governance](#6-domain-1-organization--chapter-governance)
7. [Domain 2: Community, Identity & Member Lifecycle](#7-domain-2-community-identity--member-lifecycle)
8. [Domain 3: Events, Dynamic Forms & Offline Attendance](#8-domain-3-events-dynamic-forms--offline-attendance)
9. [Domain 4: Innovation, Interest Clusters & Peer Labs](#9-domain-4-innovation-interest-clusters--peer-labs)
10. [Domain 5: Operations, Document Authoring & Reporting](#10-domain-5-operations-document-authoring--reporting)
11. [Domain 6: Discord Realtime Engine & Bot Architecture](#11-domain-6-discord-realtime-engine--bot-architecture)
12. [Domain 7: Website CMS & Public API Ecosystem](#12-domain-7-website-cms--public-api-ecosystem)
13. [Database Architecture & Complete Migrations History (001–054)](#13-database-architecture--complete-migrations-history-001054)
14. [End-to-End Operational Workflows](#14-end-to-end-operational-workflows)
15. [Developer & Deployment Guidelines](#15-developer--deployment-guidelines)

---

## 1. System Overview & Architecture

Elevates OS is the multi-tenant management platform for student innovation chapters across university campuses (including EKC, MES, CUSAT, and Calicut). It provides infrastructure for chapter administration, events, project incubation, attendance tracking, institutional reporting, and Discord role synchronization:

- **Campus Leadership Governance**: Handover windows, terms, and delegated executive member assignments.
- **Student Discovery & Talent Pipelines**: Sequential identification (`ELV-0001`), interest clusters, and project incubation.
- **Physical-to-Digital Event Ops**: Hierarchical events, dynamic drag-and-drop registration forms, instant QR tickets, and offline-first check-in.
- **Institutional Compliance**: Rich in-browser document authoring (Word-like TipTap engine), multi-party approval pipelines (Faculty Coordinator → HQ Review), and native `.docx` document generation.
- **Community Automation**: Bi-directional Discord server linking and automatic synchronization of student roles with chapter guilds.

```
                              ┌─────────────────────────┐
                              │       Elevates HQ       │
                              │   (Global Governance)   │
                              └────────────┬────────────┘
                                           │
                   ┌───────────────────────┼───────────────────────┐
                   │                       │                       │
         ┌─────────┴─────────┐   ┌─────────┴─────────┐   ┌─────────┴─────────┐
         │    EKC Chapter    │   │    MES Chapter    │   │   CUSAT Chapter   │
         │ (Campus Workspace)│   │ (Campus Workspace)│   │ (Campus Workspace)│
         └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                   │                       │                       │
    ┌──────────────┼──────────────┐        │                       │
    │              │              │        │                       │
┌───┴───┐      ┌───┴───┐      ┌───┴───┐    │                       │
│Classes│      │Events │      │Projects    │                       │
│& Reps │      │& Passes      │& Labs │    │                       │
└───────┘      └───────┘      └───────┘    └───────────────────────┘
```

---

## 2. Dual Operational Modes & Runtime Architecture

Elevates OS is engineered with a strict boundary between production execution and isolated testing:

### 2.1 Production / Supabase Mode (Primary Runtime)
- **Database**: Supabase PostgreSQL with strict Row-Level Security (RLS) across all tables (`001` through `054`).
- **Session Verification**: All mutations require authenticated user sessions verified via server-side cookies using `requireUser()` (`src/lib/api/require-user.ts`). Client-spoofed user IDs are strictly rejected.
- **Edge Security**: `src/middleware.ts` enforces authentication across protected route boundaries `(app)` while granting anonymous read access to public marketing APIs and verified forms.
- **Singletons**:
  - `src/lib/supabase/client.ts`: Client-side browser client.
  - `src/lib/supabase/server.ts`: Server SSR client handling cookie authentication.
  - `src/lib/supabase/service.ts`: Administrative service role client for privileged background executions.

### 2.2 Demo Mode (In-Memory Client Test Fallback)
- **Status**: Completely disabled in production (`isDemoMode()` strictly evaluates to `false`).
- **Functionality**: Serves as a standalone, in-memory client test sandbox powered by `src/context/store-context.tsx`.
- **Purpose**: Allows automated UI testing and local prototyping without modifying remote production databases.

---

## 3. Complete Directory Tree & Codebase Layout

```
Elevates-os/
├── public/                     # Static assets, logos, and college icons
├── scripts/                    # Automation and validation test suites
│   └── test-rbac-integration.ts # Comprehensive RBAC & RLS validation runner
├── src/                        # Main application codebase
│   ├── app/                    # Next.js App Router (pages, layouts, APIs)
│   │   ├── (app)/              # Authenticated workspace consoles
│   │   │   ├── chapter/        # Chapter-scoped routes
│   │   │   │   ├── page.tsx    # Independent student / chapter selector
│   │   │   │   └── [slug]/     # Chapter workspace portal
│   │   │   │       ├── attendance/ # QR camera & list attendance scanner
│   │   │   │       ├── classes/    # Academic cohorts & class representatives
│   │   │   │       ├── clusters/   # Campus interest clusters (AI, Web3, Design)
│   │   │   │       ├── events/     # Event management & creation
│   │   │   │       ├── forms/      # Google Forms-style dynamic form builder
│   │   │   │       ├── members/    # Chapter member directory
│   │   │   │       ├── projects/   # Kanban project incubation board
│   │   │   │       ├── reports/    # TipTap rich document reports
│   │   │   │       ├── settings/   # Chapter settings & terms handover
│   │   │   │       ├── students/   # Student directory & class scoping
│   │   │   │       └── tasks/      # Operational task management
│   │   │   ├── executive/      # Executive desk for chapter officers
│   │   │   ├── faculty/        # Faculty advisor portal (compliance & sign-offs)
│   │   │   ├── hq/             # Global HQ command console
│   │   │   │   ├── analytics/  # Cross-tenant health metrics
│   │   │   │   ├── audit/      # Security audit log
│   │   │   │   ├── chapters/   # Create, configure, and audit chapters
│   │   │   │   ├── guidelines/ # Standard operating procedures & doctrine
│   │   │   │   ├── leadership/ # Cross-campus executive appointment
│   │   │   │   ├── permissions/# Dynamic permissions matrix editor
│   │   │   │   ├── reports/    # Central review of chapter event reports
│   │   │   │   ├── users/      # Central user directory & role management
│   │   │   │   └── website/    # elevates.live marketing CMS hub
│   │   │   ├── announcements/  # Cross-chapter announcement feed
│   │   │   ├── events/         # Cross-chapter event discovery
│   │   │   ├── leaderboards/   # Multi-campus student XP rankings
│   │   │   ├── my-qr/          # Personal digital pass with Elevates ID
│   │   │   └── profile/[id]/   # User portfolios and credentials
│   │   ├── (auth)/             # Authentication views
│   │   │   ├── login/          # Student & staff login
│   │   │   └── forgot-password/# Credential recovery
│   │   ├── api/                # Backend API route handlers
│   │   │   ├── health/         # System health & operational mode check
│   │   │   ├── mutations/      # Unified authenticated mutation handler
│   │   │   ├── provisioning/   # Bulk onboarding & student provisioning
│   │   │   └── public/v1/      # Public read/write endpoints for elevates.live
│   │   ├── f/[formId]/         # Standalone public shareable form runner
│   │   ├── invite/[token]/     # Token resolution and leadership onboarding
│   │   ├── verify/             # Public verification URLs
│   │   │   └── certificate/[id]/# Public event certificate verifier
│   │   ├── globals.css         # Global CSS variables & Tailwind v4 definitions
│   │   └── layout.tsx          # Root HTML layout with custom font loaders
│   ├── components/             # Reusable React components
│   │   ├── auth/               # Inactivity monitors & session guards
│   │   ├── chapter/            # Chapter widgets & student-chapter-view
│   │   ├── domain/             # Specialized complex subsystems
│   │   │   ├── document-editor/# TipTap Word-like rich text editor
│   │   │   ├── form-builder.tsx# Drag-and-drop form creator
│   │   │   ├── form-fill.tsx   # Dynamic form submission runtime
│   │   │   └── qr-scanner.tsx  # Camera & image file QR reader
│   │   ├── layout/             # Shell, navigation rail, command palette
│   │   └── ui/                 # Design primitives (Button, Input, Dialog, etc.)
│   ├── context/                # Central state providers
│   │   └── store-context.tsx   # Central unified reactive client store
│   ├── lib/                    # Core business logic & database utilities
│   │   ├── access.ts           # Route boundary enforcement & homeForRole
│   │   ├── permissions/        # Granular RBAC definitions
│   │   ├── attendance/         # Offline attendance sync queue
│   │   ├── reports/            # DOCX generation via docx library
│   │   └── supabase/           # Client, Server, and Service singletons
│   └── types/                  # System data contracts and domain interfaces
├── supabase/                   # Supabase database configuration
│   └── migrations/             # 54 sequential SQL migration scripts
├── DESIGN.md                   # Visual design guidelines & specifications
└── system.md                   # Foundational architectural contracts
```

---

## 4. User Roles, Hierarchy & Granular RBAC Matrix

Elevates OS implements a hierarchical, 5-tier role system governing 26 distinct roles with dynamic permission enforcement:

```
[HQ TIER]
├── founder               # Ultimate system authority; controls handover windows
├── hq_admin              # Chapter management, provisioning, user controls
└── hq_mentor             # Advisory oversight

[CHAPTER EXECUTIVE TIER]
├── campus_lead           # Primary student lead; executes annual term handovers
├── faculty_coordinator   # Institutional advisor; official event & report sign-off
├── chairman              # Executive governance and leadership
├── vice_chairman         # Operational support and coordination
├── secretary             # Administrative operations, records, report drafting
├── joint_secretary       # Logistics and attendance assistance
├── elevates_coordinator  # Chapter facilitation and community building
└── executive_member      # Appointed member with delegated granular permissions

[FUNCTIONAL LEADERSHIP TEAMS]
├── technical_lead / technical_team   # Workshops, peer labs, and technical builds
├── media_lead / media_team           # Photography, design, and social media
└── innovation_lead / innovation_team # Projects, incubators, and hackathons

[ACADEMIC COHORT TIER]
└── class_representative  # Scoped directly to Department + Year + Section

[MEMBER & EXTERNAL TIER]
├── student               # Enrolled in tracks, events, projects, holds digital pass
├── alumni                # Career mentorship and guidance
├── guest                 # External non-chapter visitor
└── industry_mentor       # External project reviewer and speaker
```

### Granular Permission Keys
The dynamic permissions matrix evaluates user rights via `hasPermission(role, permissionKey)`:
- **Organization & Chapter**: `org.manage`, `chapter.create`, `chapter.manage`, `leadership.manage`, `class.manage`, `roles.manage`.
- **Events & Attendance**: `event.create`, `event.approve`, `event.manage`, `registration.review`, `registration.approve`, `attendance.verify`, `attendance.view`, `certificate.issue`.
- **Reporting & Governance**: `report.submit`, `report.approve`, `report.download`, `task.manage`.
- **Resources & Announcements**: `resource.upload`, `announcement.publish`, `analytics.view`, `student.register`.

---

## 5. Design System & Layout Architecture

Elevates OS uses a clean, light ERP aesthetic:

### 5.1 Color Palette & Tokens
- **Canvas / Background**: Cool soft gray (`#f3f4f6` / `var(--bg)`), maintaining high legibility and soft contrast.
- **Card Surfaces**: Pure white (`#ffffff` / `var(--surface)`) bordered with subtle hair-lines (`border-black/[0.08]`).
- **Brand Accent**: Flame Orange (`#f26430` / `var(--accent)`), applied purposefully (≤10% surface area) for primary calls to action, badges, and key status highlights.
- **Text & Contrast**: Graphite Ink (`#2d2d34` / `var(--text)`) for headings and body; muted graphite (`#6b7280` / `var(--text-dim)`) for secondary descriptions.

### 5.2 Typography System
- **Display & Headings**: **Syne** (`font-[family-name:var(--font-display)]`) for bold, geometric, confident page headlines.
- **User Interface & Body**: **Plus Jakarta Sans** for crisp, highly readable data tables, forms, and cards.
- **Monospace Elements**: **IBM Plex Mono** for sequential Elevates IDs (`ELV-0042`), ticket codes, and timestamps.

### 5.3 Shell & Layout Architecture
- **Sidebar Rail (`src/components/layout/app-shell.tsx`)**: Fixed structural navigation with a 248px width (`--rail-width: 248px`), displaying active chapter badges, navigation groups, and user profile switcher.
- **Command Palette (`src/components/layout/command-palette.tsx`)**: Instant global search (`Cmd+K` / `Ctrl+K`) for jumping to chapters, events, projects, or settings.
- **Student HUD Dock**: Compact horizontal heads-up dock displaying live pass status, active project stages, confirmed tickets, and verified standing.

---

## 6. Domain 1: Organization & Chapter Governance

### 6.1 Multi-Tenant Chapter Workspaces
Every university campus operates as an autonomous workspace (`/chapter/[slug]`). HQ Admins can provision new chapters, configure campus coordinates, assign institutional cover photos, and audit member activity.

### 6.2 Annual Terms & Handover System (Migrations 045–048)
Campus leadership operates on fixed annual tenures:
- **`terms` Table**: Tracks academic leadership terms, linked to an active `campus_lead_id` (or allowed null via Migration 046 during transitions).
- **Handover Windows**: Controlled exclusively by Founders via `/hq/chapters`. Handover windows define open/close intervals during which Campus Leads can transfer authority.
- **Single-Transaction Handover Procedure (`execute_chapter_handover`)**: Atomically archives the outgoing term, establishes the new active term, promotes the successor to `campus_lead`, and transitions outgoing officers to alumni or advisory roles without data corruption.
- **Executive Member Delegations**: Campus Leads can appoint `executive_member` roles with custom delegated permission arrays (e.g. taking attendance, editing event descriptions).

---

## 7. Domain 2: Community, Identity & Member Lifecycle

### 7.1 Sequential Human-Readable Identifiers
Elevates OS does not expose raw UUIDs to students. Instead, PostgreSQL sequences generate unique, persistent serial IDs:
- **Student Elevates ID**: `ELV-0001`, `ELV-0002`... Formatted consistently across personal passes, check-in desks, and certificates.
- **Chapter Elevates ID**: `CHP-0001`, `CHP-0002`... Used in multi-campus routing and formal documentation.

### 7.2 Student Digital Pass & Personal QR Code
- Accessible via `/my-qr` or the dashboard Student Command Dock.
- Renders a cryptographic SVG QR code embedding the student's unique ID and verification token.
- Includes a live green status beacon indicating active enrolled standing.

### 7.3 Academic Cohort Scoping (Class Representatives)
- Campus directories support structuring students by **Department**, **Academic Year** (1st through 4th Year), and **Section** (A, B, C).
- Appointed **Class Representatives** have scoped permissions to manage announcements and verify event attendance strictly for their assigned cohort.

---

## 8. Domain 3: Events, Dynamic Forms & Offline Attendance

### 8.1 Hierarchical Event Engine
Events support three structural hierarchies:
1. **Standalone Events**: Independent workshops, hackathons, or tech talks.
2. **Main Events**: Large flagship symposiums or tech fests containing sub-sessions.
3. **Sub-Events**: Breakout tracks, workshops, or challenge rounds under a main event.

### 8.2 Dynamic Drag-and-Drop Form Builder (`src/components/domain/form-builder.tsx`)
Chapter executives can build custom registration forms without writing code:
- **Field Types**: Short text, paragraph, single choice (radio), multiple choice (checkbox), dropdown select, phone numbers, email, numbers, and resume/portfolio uploads.
- **Conditional Branching**: Questions can conditionally appear based on previous answers.
- **Runtime Submission**: Renders standalone at `/f/[formId]` with instant client-side validation using Zod.

### 8.3 High-Speed QR Scanner & Offline Attendance Queue
- **Scanner (`src/components/domain/qr-scanner.tsx`)**: Supports live video camera feed scanning and image file uploads.
- **Offline Sync Queue (`src/lib/attendance/offline-queue.ts`)**: When campus Wi-Fi drops, scans are buffered in LocalStorage and automatically synced to Supabase when connectivity returns.
- **Digital Certificates**: Check-in triggers automatic issuance of verified event certificates accessible at `/verify/certificate/[id]`.

---

## 9. Domain 4: Innovation, Interest Clusters & Peer Labs

### 9.1 Interest Clusters
Campuses host dedicated interest tracks (e.g. AI & Machine Learning, Web3 & Distributed Systems, UI/UX Design, Open Source). Students apply to clusters, complete onboarding challenges, and join campus build groups.

### 9.2 Peer Labs & Multi-Day Lessons (Migration 041)
- **Peer Labs**: Intensive multi-week cohort learning programs facilitated by student leads.
- **Multi-Day Lessons**: Structured daily curriculums with progress checkboxes and live venue markers.
- **Gated Resources**: Access-controlled slides, starter repositories, and documentation available only to enrolled cohort members.

### 9.3 Project Incubation Kanban
Students and executive teams manage campus innovations via an interactive Kanban board:
- **Lifecycle Stages**: `idea` (Backlog) → `planning` (To Do) → `building` (In Progress) → `testing` (Review) → `showcase` (Done).
- **Metadata**: Team member tagging, repository URLs, live demo links, and showcase badges.

---

## 10. Domain 5: Operations, Document Authoring & Reporting

### 10.1 Word-Like TipTap Document Editor (`src/components/domain/document-editor/`)
For formal event and quarterly reports submitted to institutional authorities:
- **Rich Text Ribbons**: Font family selection, heading hierarchies (H1–H4), lists, callout boxes, and custom tables.
- **Collaborative Comments**: Inline comment bubbles for reviewer feedback.
- **Native DOCX Export**: Converts TipTap JSON state directly into formatted Microsoft Word `.docx` documents using the `docx` library.

### 10.2 Multi-Party Report Sign-off Pipeline
```
Chapter Secretary drafts report
       │
       ▼
Submitted for Review
       │
       ├─► Faculty Coordinator reviews & adds comments (/faculty)
       │
       └─► Elevates HQ reviews & approves (/hq/reports)
             │
             ▼
       Official Institutional DOCX Generated
```

---

## 11. Domain 6: Discord Realtime Engine & Bot Architecture

Elevates OS integrates directly with Discord to automate campus communications:
- **Reversed Code Linking (Migration 049)**: Students generate a temporary 6-character linking code in Elevates OS and submit it to the Elevates Discord bot via `/link <code>`.
- **Automatic Role Provisioning**: Syncs chapter executive designations, campus lead tags, and cluster memberships to Discord guild roles.
- **Realtime Sync Queue**: Webhook queues handle role promotions and student verification automatically.

---

## 12. Domain 7: Website CMS & Public API Ecosystem

### 12.1 Marketing Website CMS (`elevates.live`)
The HQ Command Console (`/hq/website`) provides a headless CMS for the public marketing site:
- **Public Events**: Publishes chapter workshops to global calendars.
- **Peer Labs Catalog**: Showcases active learning cohorts.
- **Project Showcase**: Highlights student startups and open-source contributions.
- **Team & Leadership**: Syncs public executive profiles to the marketing team directory.

### 12.2 Public API Contract (`/api/public/v1/*`)
Read-only and secured endpoints supporting external integrations:
- `/api/public/v1/chapters`: Active chapters and campus directory.
- `/api/public/v1/events`: Global event listings with capacity metrics.
- `/api/public/v1/peer-labs`: Active cohort curricula and facilitator info.
- `/api/public/v1/stats`: Realtime platform statistics (total students, projects, verified certificates).

---

## 13. Database Architecture & Complete Migrations History (001–054)

The database schema is constructed across 54 sequential migrations:

| Range | Core Focus & Functionality |
| :--- | :--- |
| **001 – 005** | Foundational schema: `profiles`, `chapters`, `events`, `registrations`, `attendance`, `reports`, `tasks`, and tenant RLS isolation. |
| **006 – 013** | Activity feeds, guidelines, announcements, and fine-grained permissions matrix. |
| **014 – 015** | Sequential ID generation (`ELV-0001` and `CHP-0001`). |
| **016 – 023** | Project kanban, cluster memberships, and student portfolios. |
| **024 – 026** | Complete dynamic form engine (`forms`, `form_fields`, `form_responses`). |
| **027 – 030** | Leadership tenures, volunteer groups, and delegated scanning powers. |
| **031 – 036** | Academic cohorts, class representative scoping, and attendance auditing. |
| **037 – 038** | Email OTP verification and initial Discord bot sync structures. |
| **039 – 040** | Peer Labs tables (`peer_labs`, `peer_lab_phases`, `peer_lab_enrollments`) and RLS lockdown. |
| **041 – 043** | Multi-day lessons, gated resources, and Discord foreign key hardening. |
| **044 – 048** | Faculty mutual exclusion, annual terms, February handover windows, and executive delegations. |
| **049 – 054** | Discord link codes, sequential renumbering, cluster cleanup, and direct student onboarding. |

---

## 14. End-to-End Operational Workflows

### 14.1 Event Lifecycle Workflow
1. **Creation**: Chapter Executive creates an event with venue coordinates, capacity caps, and custom registration forms.
2. **Registration**: Students register via `/events` or direct shareable link `/f/[formId]`.
3. **Ticketing**: System generates a unique digital pass with an embedded QR code.
4. **Venue Check-in**: Executives scan student passes via `/chapter/[slug]/attendance`. Works seamlessly offline.
5. **Certificate & Reporting**: System issues verified digital credentials and prompts the Secretary to draft the post-event TipTap report.

### 14.2 Annual Chapter Handover Workflow
1. **Window Opening**: Founder opens the chapter handover window from `/hq/chapters`.
2. **Candidate Selection**: Outgoing Campus Lead reviews applicants and selects the incoming executive board.
3. **Transaction Execution**: Campus Lead triggers `execute_chapter_handover()`.
4. **Transition**: The outgoing term is archived, the successor is promoted to `campus_lead`, and new executive delegations are assigned.

---

## 15. Developer & Deployment Guidelines

### 15.1 Local Development Commands
```bash
# Start local development server (Webpack mode on port 5000)
npm run dev

# Run TypeScript typecheck
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Run integration & RBAC test suite
npx tsx scripts/test-rbac-integration.ts

# Production build validation
npm run build
```

### 15.2 Mandatory Invariants for Modifying Code
1. **Never Spoof Acting User**: Mutations in `/api/mutations` must verify authenticated server sessions via `requireUser()`.
2. **Strict Tenant Boundaries**: Non-HQ roles must never query data belonging to other college chapters.
3. **Design System Adherence**: Always respect the soft cool gray canvas (`#f3f4f6`), graphite typography (`#2d2d34`), and Flame orange accents (`#f26430`).
