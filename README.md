# atlas-enterprise-os

Production-grade AI Enterprise Operating System

## Prerequisites

- Node.js 20+ (developed against Node 24)
- npm 10+
- A [Supabase](https://supabase.com) project (Postgres + Auth + Storage)
- A Google Gemini API key (for the AI assistant)

## Project layout

- `apps/web/` — Next.js application (App Router, TypeScript, Tailwind CSS)
- `supabase/migrations/` — database schema + row-level security policies
- `docs/` — PRD, SRS, architecture, database and API design documents
- `design/` — design system and user flows

## Environment setup

```bash
cd apps/web
cp .env.example .env.local
```

Fill in `apps/web/.env.local` (never commit it):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `GEMINI_API_KEY` | Google Gemini API key, server-side only |

## Supabase setup

1. Create a project at https://supabase.com.
2. From **Project Settings → API**, copy the project URL and publishable key
   into `.env.local`.
3. Apply the database migration (see below). It creates:
   - `public.documents` and `public.projects` with **row-level security**
     (each user can only read/modify their own rows),
   - a **private** `documents` storage bucket with owner-only policies
     (object paths are `/{userId}/{timestamp}-{filename}`).

### Running migrations

Option A — Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Option B — SQL editor: paste `supabase/migrations/0001_init.sql` into the
Supabase dashboard SQL editor and run it. The migration is idempotent.

## Development

```bash
cd apps/web
npm ci
npm run dev        # http://localhost:3000
```

## Verification commands

```bash
cd apps/web
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
```
