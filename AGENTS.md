# AGENTS.md — Elevates OS Codebase Overview & Guide

Elevates OS is the operating system and multi-tenant management platform for student innovation communities across university chapters (e.g. EKC, MES, CUSAT). It provides end-to-end operational infrastructure for chapter administration, events, project incubation, attendance verification, forms, rich reports, and public web sync.

---

## 1. Architectural Philosophy & Dual Modes

Elevates OS operates in two distinct operational paradigms:

1. **Production / Supabase Mode (Primary Runtime)**:
   - Backed by Supabase Postgres with strict Row-Level Security (RLS) across migrations `001` through `040`.
   - SSR authentication with server-side session verification via [`src/lib/api/require-user.ts`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/api/require-user.ts) and edge protection in [`src/middleware.ts`](file:///home/mashoodm/elevates/os/Elevates-os/src/middleware.ts).
   - All mutation endpoints under `/api/mutations` and `/api/provisioning/*` require authenticated user sessions with server-resolved roles; client-supplied `actingUserId` is never trusted.
   - Server client helpers located in [`src/lib/supabase/`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/supabase/).
2. **Demo Mode (In-Memory Test Fallback Only)**:
   - Demo mode is fully disabled in production (`isDemoMode()` strictly evaluates to `false`).
   - Serves as an isolated, in-memory client test harness powered by [`src/context/store-context.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/context/store-context.tsx).
3. **Public API Contract**:
   - Serves public endpoints under `/api/public/v1/*` to synchronize public chapters, events, peer labs, team members, and stats to external frontends like the marketing website (`elevates.live`).

---

## 2. Directory Tree & High-Level Breakdown

```
Elevates-os/
├── public/                 # Static assets, brand logos, icons
├── scripts/                # Standalone automation and integration test scripts
│   └── test-rbac-integration.ts # RBAC & RLS validation test suite
├── src/                    # Primary application source code
│   ├── app/                # Next.js App Router (pages, layouts, API route handlers)
│   │   ├── (app)/          # Authenticated application portal routes
│   │   ├── (auth)/         # Authentication flows (/login, /forgot-password)
│   │   ├── api/            # Next.js backend API routes
│   │   ├── auth/           # OAuth and Supabase auth callback handlers
│   │   ├── f/              # Public shareable form submission runtime
│   │   ├── invite/         # Invitation token resolution and onboarding
│   │   ├── join/           # Public membership request page
│   │   ├── verify/         # Public certificate verification
│   │   ├── globals.css     # Global styles and Tailwind CSS v4 definitions
│   │   ├── layout.tsx      # Root HTML layout and font loading
│   │   └── page.tsx        # Public landing / workspace entry page
│   ├── components/         # Modular React UI components
│   │   ├── auth/           # Inactivity timers and session guards
│   │   ├── chapter/        # Chapter-specific widgets and management tools
│   │   ├── domain/         # Complex domain components (rich editor, forms, QR)
│   │   ├── layout/         # App shell, command palette, navigation bars
│   │   └── ui/             # Reusable design system primitives
│   ├── context/            # React context providers & client stores
│   │   └── store-context.tsx # Central unified reactive client store
│   ├── lib/                # Business logic, helpers, data mutations, database clients
│   │   ├── actions/        # Server actions
│   │   ├── api/            # Public API helpers, schemas, and ISR revalidation
│   │   ├── attendance/     # Offline-first attendance sync queue
│   │   ├── brand/          # Brand kit tokens and assets
│   │   ├── comms/          # Outbound notifications and webhooks
│   │   ├── data/           # Seed datasets, mutations, and Supabase bootstrap
│   │   ├── demo/           # Demo state persistence
│   │   ├── eos/            # Progression algorithms and community doctrine
│   │   ├── events/         # Event schedules, logic, and reminders
│   │   ├── forms/          # Form validation, templates, script calculation runtime
│   │   ├── permissions/    # Role-based access control (RBAC) matrix
│   │   ├── public/         # Public catalog and HTTP handlers
│   │   ├── reports/        # Report templates and DOCX generation
│   │   ├── resources/      # Resource categorization
│   │   ├── search/         # Omnisearch indexing and query engine
│   │   ├── supabase/       # Supabase client, server, service role singletons
│   │   ├── access.ts       # Tenant and role route boundary enforcement
│   │   ├── analytics.ts    # Analytics aggregation calculations
│   │   └── utils.ts        # General utility functions
│   ├── middleware.ts       # Next.js edge route protection & auth session handling
│   └── types/              # TypeScript types, interfaces, enums
│       └── index.ts        # Core system data contracts & domain models
├── supabase/               # Supabase database configuration
│   └── migrations/         # 30+ SQL migrations defining tables, RLS, functions
├── DESIGN.md               # Finexy-light design system specifications
├── package.json            # Dependencies and npm build/dev scripts
├── spec.md                 # Product functional specification document
├── system.md               # Technical system requirements and invariant contracts
└── tsconfig.json           # TypeScript configuration and path aliases
```

---

## 3. Major Directories and Their Responsibilities

### `src/app/` — Application Routing & Pages
Uses Next.js App Router with Route Groups:

- **`src/app/(app)/`**: All authenticated workspace consoles. Wrapped with [`src/components/layout/app-shell.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/layout/app-shell.tsx) and scoped via role gates:
  - **`hq/`**: Headquarters command center for Founders and HQ Admins.
    - `/hq`: Executive dashboard and high-level health metrics.
    - `/hq/chapters`: Create, audit, suspend, and configure regional chapters.
    - `/hq/analytics`, `/hq/audit`: Cross-tenant analytics and security mutation audit logs.
    - `/hq/reports`: Review and approve chapter event/operational reports.
    - `/hq/leadership`, `/hq/permissions`, `/hq/users`: System-wide RBAC, permissions matrix, and leader appointments.
    - `/hq/website/*`: Built-in CMS for [`elevates.live`](https://elevates.live) content (events, peer labs, projects, team).
  - **`chapter/[slug]/`**: Chapter-level portal for campus leads, executives, faculty, and students:
    - `/[slug]`: Chapter overview, events, active clusters, announcements.
    - `/[slug]/attendance`: High-speed QR-based attendance tracking for ongoing events.
    - `/[slug]/events`: Event lifecycle management (drafting, ticketing, approvals).
    - `/[slug]/forms`: Google Forms-style dynamic form creation and submission analysis.
    - `/[slug]/reports`: Formal event/quarterly reporting with rich text authoring.
    - `/[slug]/students`, `/[slug]/classes`: Member directories and Class Representative scoping.
    - `/[slug]/tasks`: Operational kanban / task management.
    - `/[slug]/clusters`: Chapter interest clusters (AI, Web3, Design, Open Source).
  - **`executive/`**: Dedicated Executive Desk dashboard for Chapter Chairmen, Secretaries, and Leads.
  - **`faculty/`**: Faculty Coordinator view for compliance, attendance audits, and report approvals.
  - **`events/`, `announcements/`, `leaderboards/`**: Cross-chapter student discovery and XP rankings.
  - **`my-qr/`**: Displays user personal QR code with unique Elevates ID for instantaneous check-in.
  - **`profile/[id]/`**: User portfolio highlighting event history, projects, and verified credentials.
  - **`design-system/`**: Interactive UI catalog showing all badges, dialogs, buttons, and brand styles.
  - **`eos/`**: Core doctrine, handbook, and operating philosophies.
- **`src/app/(auth)/`**: Login and password recovery screens. Includes an interactive demo persona selector.
- **`src/app/f/[formId]/`**: Publicly accessible, responsive standalone form runner for registrations and surveys.
- **`src/app/invite/[token]/`**: Acceptance handler for member and leadership invitations.
- **`src/app/verify/certificate/[id]/`**: Public verification URL for cryptographic or ID-based event certificates.
- **`src/app/api/`**: Backend endpoints:
  - `api/public/v1/*`: Public read/write APIs consumed by the marketing site.
  - `api/mutations/`: Unified mutation handler executing optimistic updates and store synchronization.
  - `api/provisioning/*`: Bulk onboarding endpoints for students, chapters, and roles.
  - `api/health/`: System health check reflecting operational mode (`supabase` vs `demo`).

---

### `src/components/` — UI Component Architecture
Organized strictly by design layer and domain responsibility:

- **`components/ui/`**: Core design primitives implementing the Finexy-light ERP aesthetic:
  - [`button.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/ui/button.tsx), [`input.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/ui/input.tsx), [`dialog.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/ui/dialog.tsx), [`badge.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/ui/badge.tsx), [`stat.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/ui/stat.tsx), [`ticket-card.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/ui/ticket-card.tsx), [`offline-indicator.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/ui/offline-indicator.tsx).
- **`components/layout/`**: Frame, navigation, and security wrappers:
  - [`app-shell.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/layout/app-shell.tsx): Structural sidebar rail (`--rail-width: 248px`), sticky top navigation, user profile pill.
  - [`role-gate.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/layout/role-gate.tsx): Component-level guard restricting actions to specific permissions.
  - [`role-switcher.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/layout/role-switcher.tsx): Floating switcher to swap personas on the fly in demo mode.
  - [`command-palette.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/components/layout/command-palette.tsx): Quick-jump modal (`Cmd+K` / `Ctrl+K`).
- **`components/domain/`**: Specialized complex applications within the app:
  - **`document-editor/`**: A full-featured Word/Google Docs-like rich document editor built on TipTap:
    - Provides ribbons, font selectors, rulers, slash commands, page break views, comments panel, and DOCX exporting.
  - **`form-builder.tsx` & `form-fill.tsx`**: Dynamic form generator supporting multiple field types, branching conditional logic, and submission analytics.
  - **`qr-scanner.tsx`**: Scanner supporting camera feeds and uploaded images for event check-in.
  - **`event-manager-dialog.tsx`**: Comprehensive event configuration modal.
- **`components/chapter/`**: Chapter-scoped pickers, join modals, department managers, and location coordinates selectors.

---

### `src/context/` — State Management
- **[`src/context/store-context.tsx`](file:///home/mashoodm/elevates/os/Elevates-os/src/context/store-context.tsx)**:
  - The central brain of the frontend application.
  - Manages reactive state across organizations, chapters, events, registrations, attendance records, reports, tasks, notifications, announcements, and forms.
  - Provides hooks (`useStore()`) exposing dozens of deterministic mutation actions (e.g. `createEvent`, `recordAttendance`, `submitReport`, `assignRole`).
  - Automatically handles optimistic updates, offline queues, and synchronization with Supabase Realtime when connected.

---

### `src/lib/` — Business Logic & Platform Infrastructure
- **[`lib/access.ts`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/access.ts)**: Chapter resolution logic, tenant boundary security, and role-based redirect resolution (`homeForRole`).
- **[`lib/permissions/index.ts`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/permissions/index.ts)**: Role definitions (`isHqRole`, `isExecutiveRole`, `isFacultyRole`) and granular permission checks (`hasPermission`).
- **[`lib/supabase/`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/supabase/)**: Supabase initialization:
  - `client.ts`: Browser client.
  - `server.ts`: Server-side SSR client handling cookie auth.
  - `service.ts`: Admin/Service Role client for privileged background operations.
- **[`lib/forms/`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/forms/)**: Form calculation engine, validation schemas, and pre-built templates.
- **[`lib/reports/`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/reports/)**: Report templates and native `.docx` document generation via `docx` library.
- **[`lib/attendance/offline-queue.ts`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/attendance/offline-queue.ts)**: LocalStorage queue ensuring event check-in continues during campus Wi-Fi drops.
- **[`lib/api/schemas.ts`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/api/schemas.ts)**: Zod schemas ensuring strong type-safety on all public and mutation endpoints.

---

### `supabase/` — Database Migrations & Security Models
Contains migrations `001` through `040` representing the Postgres relational database schema:
- **`001_initial_schema.sql`**: Foundational tables (`profiles`, `chapters`, `events`, `registrations`, `attendance`, `reports`, `tasks`, etc.).
- **`002_seed_users.sql`**: Baseline organization and extensions (`pgcrypto`); test seed accounts with hardcoded passwords have been completely purged.
- **`004_role_based_system_and_rls.sql` & `005_rls_tenant_scope.sql`**: Strict Row-Level Security ensuring chapter leads and students cannot read or write data belonging to other chapters.
- **`014_sequential_elevates_id.sql` & `015_sequential_chapter_elevates_id.sql`**: Generates human-readable serial identifiers (e.g., `ELV-EKC-0042`).
- **`024_forms_and_event_forms_complete.sql`**: Schema for dynamic forms, custom question types, and responses.
- **`027_leadership_terms_and_assignments_rls.sql`**: Term-based tenures and historical records for chapter executives.
- **`037_email_verification_support.sql`**: OTP email verification state, timestamps, and rate limiting columns.
- **`038_discord_bot_restructure_sync_and_otp_fix.sql`**: Discord bot sync queue and verification structures.
- **`039_fix_missing_tables_and_peer_labs.sql`**: Dedicated Peer Labs tables (`peer_labs`, `peer_lab_phases`, `peer_lab_facilitators`, `peer_lab_enrollments`), student referrals, chapter standards, and discord integrations.
- **`040_lock_down_rls.sql`**: Hardens Row-Level Security across all Discord tables, leadership/volunteer write paths (`service_role` only), integrations, and anonymous access to profiles.
- **`041_peer_lab_lessons_and_resources.sql`**: Extends Peer Labs and Events with multi-day lessons (`lessons`), gated resources (`resources`), `poster_url`, and `thumbnail_url`.
- **`042_fix_sequential_elevates_id.sql`**: Permanently fixes Elevates ID generation across all sign-up pathways (`ELV-0155` vs `ELV-3VHC4E`), ensures `profiles_elevates_id_seq` sequence, updates sanitization triggers, and renumbers legacy random IDs.
- **`043_fix_discord_links_guild_fk.sql`**: Removes `discord_links_guild_id_fkey` constraint on `discord_links.guild_id` to allow discord linking/verification when a guild is not pre-registered in `guild_config`, auto-upserts `guild_config`, and hardens `verify_discord_otp`.
- **`FULL_DATABASE_SETUP.sql`**: Consolidated script for bootstrapping a fresh Supabase database in a single run.

#### Migration Execution Order for Existing Databases
When applying new migrations to an existing database, execute them in this exact sequence:
1. `supabase/migrations/037_email_verification_support.sql`
2. `supabase/migrations/039_fix_missing_tables_and_peer_labs.sql`
3. `supabase/migrations/040_lock_down_rls.sql`
4. `supabase/migrations/041_peer_lab_lessons_and_resources.sql`
5. `supabase/migrations/042_fix_sequential_elevates_id.sql`
6. `supabase/migrations/043_fix_discord_links_guild_fk.sql`
7. `supabase/migrations/044_default_student_and_faculty_mutual_exclusion.sql`

*(Note: `038_discord_bot_restructure_sync_and_otp_fix.sql` was already merged/applied in the sequence. `039_fix_missing_tables_and_peer_labs.sql` **must** run before `040_lock_down_rls.sql` because migration 040 locks down tables that migration 039 creates or references, such as `peer_labs`, `peer_lab_phases`, `peer_lab_facilitators`, `peer_lab_enrollments`, and `discord_integrations`.)*

---

## 4. Key Workflows & Data Flows

### A. Event Creation & Check-in Flow
```
Chapter Executive creates event
   └─► Stored in state (status: "pending_approval" / "approved")
         └─► Public registration opens (/f/[formId] or /events)
               └─► Students register ──► QR Ticket generated (Elevates ID)
                     └─► At venue: Executive scans QR via /attendance
                           └─► Offline queue records check-in ──► Syncs to DB
                                 └─► Verified certificate auto-generated
```

### B. Chapter Reporting Flow
```
Chapter completes event/quarter
   └─► Secretary/Lead opens /[slug]/reports
         └─► Composes report in Word-like TipTap Editor
               └─► Submits for review
                     ├─► Faculty Coordinator reviews & comments (/faculty)
                     └─► Elevates HQ reviews & approves (/hq/reports)
                           └─► Can export as formatted .docx
```

---

## 5. Development Conventions & Guidelines for AI Agents

1. **Supabase-First Architecture & Test Fallback**:
   - Production strictly requires Supabase (`isDemoMode()` evaluates to `false`). All mutations in `/api/mutations` and `/api/provisioning/*` require verified user sessions via `requireUser()` and reject unauthenticated or client-spoofed `actingUserId` requests. Demo mode is an in-memory test fallback only.
2. **Strict Tenant & Role Scoping**:
   - Always verify role and chapter boundaries using helpers from [`src/lib/access.ts`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/access.ts) and [`src/lib/permissions/index.ts`](file:///home/mashoodm/elevates/os/Elevates-os/src/lib/permissions/index.ts). Never allow non-HQ roles to query cross-chapter records.
3. **Design System & Visual Constraints** (see [`DESIGN.md`](file:///home/mashoodm/elevates/os/Elevates-os/DESIGN.md)):
   - Background canvas: Cool soft gray `#f3f4f6`.
   - Brand Accent: Flame `#f26430` (used purposefully, ≤10% surface area).
   - Text / Dark Elements: Graphite / Ink `#2d2d34`.
   - Typography: **Syne** (Headings), **Plus Jakarta Sans** (UI body), **IBM Plex Mono** (Code, tickets, IDs).
   - Avoid dark-mode-first styling, neon glows, or heavy borders; use soft elevation (`--shadow`) and 18–22px rounded corners.
4. **Testing**:
   - Run linter: `npm run lint`
   - Build test: `npm run build`
   - Integration & RBAC test: `npx tsx scripts/test-rbac-integration.ts`
