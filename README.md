# Elevates OS

The Operating System for student innovation communities.

**Learn. Build. Grow. Ship. Repeat.**

Multi-tenant platform: Elevates HQ → Chapters (EKC, MES, CUSAT, …) → Students, Events, Projects, Clusters.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth, Postgres, RLS) — migrations `001` through `040` in `supabase/migrations`
- Production requires Supabase; demo mode is an in-memory test fallback only (`isDemoMode()` evaluates to `false` in production)

## Requirements

- **Node.js 20+** on macOS, Linux, or Windows (x64 or arm64)
- npm (ships with Node)

Native Next.js / Tailwind binaries are installed automatically for your OS — do not add platform packages like `@next/swc-darwin-arm64` as direct dependencies.

## Production Setup (Supabase)

Production requires Supabase for authentication, session verification, and database persistence. Demo mode is an in-memory test fallback only.

1. Create a Supabase project.  
2. Copy `.env.example` → `.env.local` and add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.  
3. Apply migrations in order from `supabase/migrations/` (or use `supabase/migrations/FULL_DATABASE_SETUP.sql` for a fresh database bootstrap). Migrations `001` through `040` are included in `supabase/migrations/`.
4. **Execution order for applying new migrations to an existing database:**
   1. `supabase/migrations/037_email_verification_support.sql`
   2. `supabase/migrations/039_fix_missing_tables_and_peer_labs.sql`
   3. `supabase/migrations/040_lock_down_rls.sql`  
   *(Note: `038_discord_bot_restructure_sync_and_otp_fix.sql` was already merged/applied in the sequence. `039_fix_missing_tables_and_peer_labs.sql` **must** run before `040_lock_down_rls.sql` because migration 040 locks down tables that migration 039 creates or references, such as `peer_labs`, `peer_lab_phases`, `peer_lab_facilitators`, `peer_lab_enrollments`, and `discord_integrations`.)*
5. Optional / Server flags in `.env.local`:
   - `SUPABASE_SERVICE_ROLE_KEY` — **OS server only**. Privileged backend mutations and sync. Never expose to client or external repos.
   - `OS_API_TOKEN` — shared secret for public write/sync endpoints.

`GET /api/health` reports `mode: "supabase"` when URL and anon key are present.

Public contract for Elevates-web lives at `/api/public/v1/*` (chapters, events, projects, peer-labs, team, stats, verify, RSVP, join, college leads).

**Boundary:** HQ / chapter / faculty / executive consoles stay in this repo. The marketing site (`elevates.live`) only consumes `/api/public/v1`. Do not duplicate admin routes on the web.

## Verifying your database

To confirm that your Supabase database schema matches the expected state across all migrations:

1. **Integrity Check**:
   - Run [`scripts/sql/check_migrations_1_to_38.sql`](file:///home/mashoodm/elevates/os/Elevates-os/scripts/sql/check_migrations_1_to_38.sql) in the Supabase SQL Editor.
   - **Expected Result**: An empty result set (`0 rows` returned = healthy).
   - If any rows are returned, it indicates missing tables or columns from migrations 001 through 038.

2. **Schema Repair**:
   - If missing columns or tables from 009, 010, or 033 are reported, run [`scripts/sql/repair_missing_009_010_033.sql`](file:///home/mashoodm/elevates/os/Elevates-os/scripts/sql/repair_missing_009_010_033.sql).
   - **Warning**: Never re-apply raw `009_system_state_discord_and_audit_triggers.sql` or `010_complete_spec_persistence_and_invitations.sql` directly to an existing database. Those legacy migrations contained overly-permissive RLS policies that have been superseded and locked down by `040_lock_down_rls.sql`. The repair script creates missing objects safely with secure RLS policies.

3. **Migration 027 Note**:
   - Migration 027 consists of two intentionally distinct files sharing the same number prefix:
     - `supabase/migrations/027_event_directory_speakers_attendance.sql`
     - `supabase/migrations/027_leadership_terms_and_assignments_rls.sql`
   - **Do not rename or merge either file**. Both must be applied in the migration sequence.

## In-Memory Test Fallback (Demo Mode)

Demo mode provides an in-memory, tab-isolated mock store (`sessionStorage`) for local UI evaluation and testing without Supabase credentials. In production, demo mode is disabled and `isDemoMode()` strictly evaluates to `false`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Enter workspace** → pick a persona on `/login`.

### Demo loops (HQ → Docs → Demo loops)

1. **Event** — create → form/register → approve → check-in → certificate  
2. **Ops** — tasks → announcement → report submit → HQ approve  
3. **Org** — create chapter → HQ dashboard → open chapter  

## Personas (Demo / Test)

| Persona | Lands on |
|---------|----------|
| Founder / HQ Admin | HQ Dashboard |
| Faculty | Faculty Portal |
| Chairman / Secretary / CR | Executive Desk |
| Student | Chapter home |

## Scripts

```bash
npm run dev      # local server
npm run build    # production build
npm run start    # serve build
npm run lint     # eslint
```

## Brand

Paper `#f8fff4` · graphite `#2d2d34` · flame `#f26430` · Inter + VT323 + Kalam  
See `DESIGN.md` and `/design-system`. Same visual language as elevates.live.
