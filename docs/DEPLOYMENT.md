# Atlas Enterprise OS — Deployment Guide

Reproducible deployment, configuration, migration and rollback
instructions for the web application (`apps/web`, Next.js 16
standalone build).

---

## 1. Architecture

| Piece | Technology |
|---|---|
| Web app | Next.js 16 (App Router, Turbopack), standalone Node server |
| Database + auth + file storage | Supabase (PostgreSQL ≥ 15 with pgvector, Storage, Auth) |
| AI | Google Gemini (`gemini-3.6-flash` for chat, `gemini-embedding-2` for embeddings, 768 dims) |
| Container | Multi-stage `apps/web/Dockerfile` (node:20-alpine, non-root) |
| CI | `.github/workflows/ci.yml` — typecheck, tests, build (blocking), lint (reported), Docker image build |

---

## 2. Environment variables

| Name | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Build + runtime, public** | Supabase project URL. Inlined into the client bundle at build time — must be present when `next build` / `docker build` runs |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Build + runtime, public** | Supabase anon/publishable key (safe for browsers; RLS is the security boundary) |
| `GEMINI_API_KEY` | **Runtime, secret** | Server-side only (AI routes). Never exposed to the browser. At build time it is only read if you pass it as a Docker build arg; runtime injection is sufficient for the app to work |
| `KNOCK_API_KEY` | **Runtime, secret** | Optional. Invitation emails via [Knock](https://knock.app) (`lib/mail.ts`). Without it, `POST /api/org/invite-email` honestly returns `{"status":"not_configured"}` and the Team page says so — no email is ever faked |

Notes:

* Without Supabase vars the app still builds and prerenders
  (the browser client is created lazily); API routes return
  explicit errors and `/api/health` reports `configured.supabase: false`.
* Without `GEMINI_API_KEY`, AI routes return
  `503 {"error":"GEMINI_API_KEY is not configured."}` — they never fake a response.
* Without `KNOCK_API_KEY`, invitation creation still works
  end-to-end; only the email is skipped, with an explicit
  "not configured" message in the UI. To enable email: create
  a Knock account, connect your email provider in its
  dashboard, define the `org_invitation` workflow (its email
  channel resolves the recipient from the invited address),
  then set `KNOCK_API_KEY`.
* Never commit `.env.local`. Template: `apps/web/.env.example`.
* On Vercel/other hosts, set all three in the project settings;
  for Docker pass `NEXT_PUBLIC_*` as `--build-arg`s (see header
  of `apps/web/Dockerfile`) and `GEMINI_API_KEY` as a runtime env var.

---

## 3. External service setup (once)

1. **Supabase project** → Settings → API: copy URL + publishable key.
2. **Storage bucket**: create a **private** bucket named `documents`
   (migration `0001` also inserts it when run as owner).
3. **Auth**: enable Email provider; for password reset configure
   SMTP (Supabase's built-in email works for development; use a real
   SMTP provider in production) and set the Site URL to your origin.
4. **Gemini**: create an API key in Google AI Studio.

---

## 4. Database migrations

Apply **in this order** — each file is idempotent (safe to re-run):

| # | File | Contents | Verified |
|---|---|---|---|
| 1 | `0001_init.sql` | documents, projects, storage bucket + owner-only policies | Applied + RLS-tested on PostgreSQL 18 |
| 2 | `0002_embeddings.sql` | `document_chunks` vector(768), HNSW index, `match_document_chunks()` | Applied + tested on PostgreSQL 18 with pgvector 0.8.6 (org-scoped in 0005) |
| 3 | `0003_core.sql` | tasks, notifications, ai_conversations, audit_logs, workflows/runs, profiles + triggers | Applied + 31 RLS assertions on PostgreSQL 18 |
| 4 | `0004_document_categories.sql` | documents.category | Applied + 13 assertions on PostgreSQL 18 |
| 5 | `0005_organizations.sql` | organizations, org_members (owner/admin/member), departments, invitations + RPCs; org-scoped RLS on every workspace table; personal-org backfill | Applied + 58 RLS/RBAC assertions on PostgreSQL 18 |
| 6 | `0006_membership_audit.sql` | membership audit trigger + notifications for role changes/removals | Applied + 10 assertions on PostgreSQL 18 |
| 7 | `0007_knowledge_articles.sql` | knowledge_articles + immutable version history, trigger-enforced | Applied + 11 assertions on PostgreSQL 18 |

Full suite: `npm run test:db` (from `apps/web/`) — **81/81 checks** against a
real PostgreSQL 18 instance, including pgvector and a second idempotent pass
of every migration.

**Two modes.** With `ATLAS_TEST_DATABASE_URL` set, the suite runs against
that server (CI uses the `pgvector/pgvector:pg16` service container with
`ATLAS_TEST_REQUIRE_VECTOR=1`, so vector checks are mandatory there).
Without it, the suite boots an embedded PostgreSQL 18 from the
`embedded-postgres` devDependency; that build ships **without** pgvector,
so the suite reports `81/81` when pgvector is present or `78 passed,
1 skipped` when it is not — never a false failure.

To give the embedded server pgvector (optional, local only — nothing is
committed), drop the extension files into the embedded package, e.g. on
Ubuntu with the PGDG apt repo:

```bash
# postgresql-18-pgvector_0.8.6 for PG18; extract, do not install
ar x postgresql-18-pgvector_*.deb && tar -xf data.tar.xz
N=node_modules/@embedded-postgres/linux-x64/native
cp usr/lib/postgresql/18/lib/vector.so "$N/lib/"
cp usr/share/postgresql/18/extension/vector* "$N/share/postgresql/extension/"
npm run test:db   # now 81/81 with vector checks enabled
```

The suite already points `dynamic_library_path` at that lib directory;
without the files it degrades to the documented skip.

How to apply:

* **Supabase dashboard** → SQL Editor: run the files in order, or
* **Supabase CLI**: `supabase link` then `supabase db push`.

`0002` requires the `vector` extension (`create extension if not exists vector;`
is in the file) — the target project must have pgvector available
(enabled by default on current Supabase projects).

---

## 5. Build & run

### 5.1 Local production build

```bash
cd apps/web
npm ci
npm run typecheck && npm test && npm run build
npm run start          # serves .next on :3000
```

### 5.2 Docker

```bash
docker build ./apps/web -t atlas-web \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...

docker run -p 3000:3000 \
  -e GEMINI_API_KEY=... \
  atlas-web
```

The image runs as a non-root user and declares a
`HEALTHCHECK` against `GET /api/health`.

### 5.3 CI

`.github/workflows/ci.yml` runs on push/PR:
`typecheck`, `test`, `build` (blocking) · `lint` (reported) ·
`docker build` (validates the image on GitHub's runner).

---

## 6. Health checks & logging

* **Liveness**: `GET /api/health` → `200 {"status":"ok", ...}`
  with only boolean configuration flags — no secrets.
* **Logging policy**: server logs never include document
  content, API keys, cookies/tokens, or full prompt/response
  bodies. Ingestion failures log error objects only; the AI
  route logs timing/model metadata without prompts.
* Client-visible errors are explicit: signed-out 401s, Gemini
  503 when unconfigured, RLS-scoped empty states.

---

## 7. Post-deploy verification checklist

Run against the **actual deployed origin**:

1. `/api/health` → 200, `configured.supabase: true`.
2. Sign up / sign in → lands on `/workspace/dashboard`.
3. Signed-out request to `/workspace/*` → redirected to `/login`.
4. Upload a PDF → appears, gets indexed; search finds it semantically.
5. AI ask → answer + sources; with `GEMINI_API_KEY` removed → 503 (no fake answer).
6. Two accounts: neither can see the other's documents/tasks/projects (RLS).
7. Password reset email link opens `/reset-password` and updates the password.
8. Docker `HEALTHCHECK` reports healthy.

Steps 2, 6 and 7 involve real accounts — they must be
completed manually on the deployment.

---

## 8. Rollback procedure

Code and schema are both recoverable:

1. **App code**: redeploy the previous known-good git tag/commit
   (`git log --oneline` → checkpoint `3f152da` was verified green;
   the current HEAD is verified green). On Docker: pull/build the
   previous image tag and roll the service back to it.
2. **Database**: migrations are **additive and idempotent** — do not
   roll them back unless a migration itself is at fault:
   * `0004` only adds a nullable column: `ALTER TABLE documents DROP COLUMN IF EXISTS category;`
   * `0003` tables are unused by older app code: safe to leave in place (preferred).
   * `0005`/`0006`/`0007` add the organization model, membership
     auditing and knowledge articles. Rolling the **app** back to a
     pre-0005 commit while 0005–0007 remain applied is safe: the old
     app code is unaware of the new tables, and every 0005 policy is a
     superset of the old owner-only rules for single-user data (the
     backfill assigns existing rows to each user's personal
     organization). Dropping the new tables is **not** recommended:
     `0005` replaced the original policies, so removing it without
     restoring the 0003 policies would leave the old app unable to
     read its own rows. To fully revert a database, restore a
     pre-0005 point-in-time backup instead.
3. **Secrets**: rotate `GEMINI_API_KEY` / Supabase keys in the host's
   secret store; no key lives in the repository or the image.
4. Verify after rollback: `/api/health`, sign-in, one document fetch.

---

## 9. Known environment-specific limits

* `next build` warns that the `middleware` file convention is
  deprecated in Next 16 (still functions; rename to `proxy.ts`
  in a future upgrade).
* Server-rendered `/workspace/*` pages are statically prerendered;
  data is fetched client-side behind the middleware auth guard.
* The Supabase free tier limits concurrent edge/DB connections;
  tune `maxDuration` on `app/api/documents/ingest/route.ts` if the
  host caps function duration.
