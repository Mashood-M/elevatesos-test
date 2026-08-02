# Elevates OS

The Operating System for student innovation communities.

**Learn. Build. Grow. Ship. Repeat.**

Multi-tenant platform: Elevates HQ → Chapters (EKC, MES, CUSAT, …) → Students, Events, Projects, Clusters.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth, Postgres, RLS) — migrations in `supabase/migrations`
- Demo store with seeded chapter data (default; works without Supabase)

## Requirements

- **Node.js 20+** on macOS, Linux, or Windows (x64 or arm64)
- npm (ships with Node)

Native Next.js / Tailwind binaries are installed automatically for your OS — do not add platform packages like `@next/swc-darwin-arm64` as direct dependencies.

## Quick start (demo)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Enter workspace** → pick a persona on `/login`.

Demo state persists in `sessionStorage` for the browser tab. Role routes are guarded; switch persona to jump workspaces.

### Demo loops (HQ → Docs → Demo loops)

1. **Event** — create → form/register → approve → check-in → certificate  
2. **Ops** — tasks → announcement → report submit → HQ approve  
3. **Org** — create chapter → HQ dashboard → open chapter  

## Personas (demo)

| Persona | Lands on |
|---------|----------|
| Founder / HQ Admin | HQ Dashboard |
| Faculty | Faculty Portal |
| Chairman / Secretary / CR | Executive Desk |
| Student | Chapter home |

## Fully set up (Supabase)

1. Create a Supabase project.  
2. Copy `.env.example` → `.env.local` and add URL + anon key.  
3. Apply migrations in order (SQL editor or CLI):
   - `supabase/migrations/001_elevates_os_core.sql`
   - `supabase/migrations/002_rls_write_policies.sql`
   - `supabase/migrations/003_demo_seed.sql`
4. Create Auth users in the dashboard; insert matching `profiles` + `user_roles` rows.  
5. Optional flags in `.env.local`:
   - `NEXT_PUBLIC_USE_DEMO_STORE=false` — bootstrap org/chapters/events from Supabase (falls back to seed if empty)
   - `NEXT_PUBLIC_USE_SUPABASE_AUTH=true` — real email/password login + middleware protection on app routes  

`GET /api/health` reports `mode: "supabase"` when URL + anon key are present.

Until auth is enabled, the app runs fully in **demo mode** with interactive mutations.

## Scripts

```bash
npm run dev      # local server
npm run build    # production build
npm run start    # serve build
npm run lint     # eslint
```

## Brand

Accent `#f26430` · charcoal `#2d2d34` · cool canvas · Syne + Plus Jakarta Sans + IBM Plex Mono  
See `DESIGN.md` and `/design-system`.
