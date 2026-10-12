# Atlas Enterprise OS — Project Recovery & Progress

> This file is the durable hand-off between development sessions.
> Update it after every meaningful change so any developer/session can
> resume without re-reading the whole history.
>
> Companion documents: `docs/REQUIREMENTS-STATUS.md` (PRD/SRS traceability)
> and `docs/DEPLOYMENT.md` (env, migrations, rollback).

---

## 1. Repository state

| Item | Value |
|---|---|
| GitHub | https://github.com/bathriprasathk-ui/atlas-enterprise-os (`main` = `5b1d249`) |
| Working branch | `freebuff/bc445a7e57f24e03cee2b69d` |
| Base | `main` @ `5b1d249` "feat: sync Atlas Enterprise OS application" |
| Checkpoint 1 | **Trusted Data Foundation** (RLS migration, private storage, signed URLs, real identity) |
| Checkpoint 2 | **Semantic Knowledge Retrieval (RAG)** + Docker/CI (`3f152da`) |
| Checkpoint 3 | **Core Product Completion** (this session) — tasks/projects/dashboard/AI/calendar/analytics/team/workflows/settings/integrations/notifications, auth flows, document categories, audit + notification producers, health endpoint, lint debt cleared, docs |
| Node / npm | v24.21.0 / 11.19.0 |
| App root | `apps/web/` (Next.js 16.2.11, App Router, React 19, TS strict, Tailwind v4) |

**GitHub contains none of the milestone work** — it exists only in this
worktree. Push only with explicit user approval (CI runs on first push).

---

## 2. Verified completed work

### A. Trusted Data Foundation (checkpoint 1) — VERIFIED

Owner-only RLS on `documents`/`projects`, private storage bucket with
user-scoped paths (`{userId}/…`), signed URLs everywhere (client 1 h,
server 5 min), explicit `.eq("uploaded_by", uid)` defense-in-depth,
route-level 401s, real identity in Topbar/dashboard, `.env.example`.
**Evidence:** typecheck/build exit 0; two-user RLS test **33/33** on real
PostgreSQL 18 (mocked Supabase `auth`/`storage` schemas).

### B. Semantic Knowledge Retrieval (checkpoint 2) — VERIFIED (static + mocked)

`0002_embeddings.sql` (`document_chunks`, `vector(768)`, HNSW,
`match_document_chunks()` RLS-inlined), `lib/chunking.ts` (6 tests),
`lib/embeddings.ts` (9 mocked tests), `lib/rag.ts`, ingest/search/ask
routes (auth → signed-URL PDF → chunk → embed → store; top-k retrieval;
semantic search with silent fallback), real "AI Indexed" badge +
Re-index, multi-stage Dockerfile + `.dockerignore`, GitHub Actions CI,
`node --test` harness. **Evidence:** 15/15 tests, typecheck/build exit 0.
`0002` still **unapplied** (needs pgvector on the target project).

### C. Core Product Completion (checkpoint 3) — VERIFIED

Turns the mock UI into a working product; every visible control now
does something real (or was honestly relabelled/removed):

**Schema** — `0003_core.sql`: tasks, notifications, ai_conversations,
audit_logs, workflows + workflow_runs, profiles (auto-created by
trigger, backfilled) — RLS owner-only, project-ownership trigger.
`0004_document_categories.sql`: `documents.category`.

**Data layers** — `lib/tasks.ts`, `lib/notifications.ts`, `lib/profiles.ts`,
`lib/aiConversations.ts`, `lib/workflows.ts`, `lib/audit.ts` (+ server-only
`lib/auditServer.ts`), `lib/format.ts`, `lib/workflowValidation.ts`;
all queries explicitly user-scoped on top of RLS.

**Pages wired to real data** — Tasks (CRUD, filters, stats, due dates),
Projects (status update, progress, delete; fake "members" removed),
Dashboard (real stats, real activity feed, honest AI insights, fake
revenue chart deleted), AI chat (real `/api/ai/ask` + persisted history +
typing/error states), Calendar (real task/project dates), Analytics
(computed from real rows; `Date.now()` moved out of render), Team
(profiles directory), Workflows (create/pause/delete + **real runner**
`POST /api/workflows/run` with timeout and honest success/failure runs),
Settings (real profile edit, password change, honest security copy),
Integrations (live `/api/integrations` status — configured vs
**not_implemented**, never fake "Connected").

**Notifications** — Topbar bell reads real rows (unread badge, mark
read/mark all, empty + error states, 60 s refresh); producers wired:
workflow runs insert notifications when they surface actionable items;
every task/project/document/workflow/profile mutation writes
`audit_logs` (client) and ingest/workflow-run write them server-side.

**Auth & entry points** — `/login` now has real sign-up, sign-in and
password-reset modes (the two fake "available soon" buttons and the
non-functional "Remember me" checkbox were replaced); new
`/reset-password` page does the PKCE code exchange and sets a new
password; middleware still guards `/workspace/*`.

**Search** — top-bar search box now deep-links to
`/workspace/knowledge?q=…`, and the Knowledge Hub reads `?q=` on mount.

**Document categories** — preset picker at upload, working filter chips
derived from real data (the old chips were decorative), `category`
validated 1–60 chars.

**Platform/ops** — lazy Supabase browser client (transparent Proxy, no
module-level side effect → `next build` works without env);
`lib/auditServer.ts` + `lib/workflowValidation.ts` split so API routes
never execute browser-only code; `GET /api/health` (booleans only, no
secrets) + Docker `HEALTHCHECK`; docs: `REQUIREMENTS-STATUS.md`,
`DEPLOYMENT.md` (this file updated).

**Evidence (all re-run fresh after the final change):**

| Check | Result |
|---|---|
| `npm test` | **53/53 pass** (was 15; +format/tasks/workflows/profiles suites) |
| `npm run typecheck` | exit 0 |
| `npx eslint .` | **0 problems** (baseline of 16 cleared — no suppressions) |
| `npm run build` | exit 0, 24/24 pages, **without any env vars present** |
| PostgreSQL 18 harness | `0003` **31/31**; `0004` **13/13** (constraints, two-user isolation, spoofed `created_by` rejected, idempotency) |
| Secrets | none in diffs/tracked files; no `.env.local` |

---

## 3. Current task

Checkpoint 3 (Core Product Completion) is complete and committed locally.
Nothing is pushed. Remaining work is either external (§4) or
user-selected (§5); status of every PRD/SRS requirement is tracked in
`docs/REQUIREMENTS-STATUS.md`.

---

## 4. Known errors & blockers

| Blocker | Impact | Workaround |
|---|---|---|
| **No Supabase project/credentials** in sandbox | Cannot live-test auth, signup/reset emails, Storage API, RLS through the app | Verified on local PostgreSQL 18 with mocked Supabase schemas; user runs §9 checklist |
| **No GEMINI_API_KEY** | Cannot exercise live chat/embeddings | Routes return explicit 503; 9 unit tests mock `fetch` |
| **No Docker in sandbox** | Image not built here | Dockerfile + HEALTHCHECK written; the `docker` CI job builds it on GitHub |
| **`0002` (pgvector) unapplied/unverified** | Semantic search dead until applied | Apply on target project (§9); pgvector is standard on Supabase |
| **Lint debt** | — | **CLEARED**: `npx eslint .` → 0 problems (CI lint can be made blocking) |
| **42 zero-byte placeholder files** | Dead weight (all unused, zero importers) | Analysis in §6; removal deferred to an approved cleanup |
| Next 16 `middleware` deprecation warning | Cosmetic today | Rename `middleware.ts` → `proxy.ts` on next upgrade (see DEPLOYMENT §9) |

---

## 5. Outstanding tasks (priority order)

1. **Live verification on real Supabase (§9)** — apply `0001→0004`, enable
   `pgvector`, configure SMTP, two-account browser test, live Gemini pass.
2. **Push + PR (user approval required)** — CI will then run
   typecheck/tests/build + Docker build on GitHub.
3. **Collaboration milestone (largest PRD gap, see REQUIREMENTS-STATUS §3.9.8)**
   — shared workspaces, orgs/departments, roles, comments/chat. Requires a
   product-approved multi-tenant design; current RLS is deliberately
   owner-only.
4. **Knowledge articles + versions** (REQ-KB-001/002, Database-Design §5.7).
5. **MFA/SSO + email notifications** — need identity provider / email
   service choices (external).
6. **Cleanup milestone (user-approved)** — remove zero-byte files, stray
   root `package.json`/`services/`, make CI lint blocking (now feasible).
7. **Knowledge Graph** — v2.0 per PRD §12; do not fake in v1.

---

## 6. Zero-byte file analysis (42 files)

All are **unused** (zero importers; build passes) → none are *blocking*.
Grouped by intent (from docs/design):
- `hooks/*` (useAuth, useDocuments, useProjects, useTasks, useTheme) — planned
  data-access layer; superseded by `lib/*.ts`; implement only if UI needs them
- `types/*` (auth, document, project, task, team, user, workflow) — planned
  shared types; partially superseded by inline types in `lib/*.ts`
- `components/ai/*` (chat set) — planned AI assistant UI (the assistant now
  lives in `app/workspace/ai/page.tsx`; these are candidates for deletion)
- `components/auth/*` (LoginCard, LoginHero, SocialLogin) — login page works
  without them; social login deferred (needs Supabase OAuth config)
- `components/dashboard/Dashboard.tsx` + landing components — dashboard page
  renders its own real header; candidates for deletion
- 8 UI primitives (Modal, Toast, Dropdown, Search, Loader, Avatar, Badge) —
  reusable; implement on first real use
- root `services/*.ts` (6 files) — planned FastAPI layer; empty and unused

---

## 7. Verification commands (run from `apps/web/`)

```bash
npm ci                    # install from lockfile
npm run typecheck         # tsc --noEmit — MUST be exit 0
npx eslint .              # MUST be 0 problems
npm test                  # node --test — 53/53 expected
npm run build             # exit 0 WITHOUT env vars (lazy Supabase client)
npm run start             # serve production build on :3000
curl localhost:3000/api/health   # {"status":"ok",...}
```

PostgreSQL migration harness (session-only, in `/tmp/pgharness/`):
`node test0004.mjs` → 13/13 (applies `0001`, `0003`, `0004` to embedded
PostgreSQL 18 with mocked `auth`/`storage` schemas).

---

## 8. Exact next steps (for the next session)

1. `git log` to confirm checkpoint 3 is HEAD; read this file.
2. Push only with explicit approval — CI validates everything on GitHub.
3. When the user has a real Supabase project: follow §9, then the
   post-deploy checklist in `docs/DEPLOYMENT.md` §7.
4. Pick the next milestone from §5; update §2/§3/§5 of this file as you go.
5. Keep `docs/REQUIREMENTS-STATUS.md` in sync with any new requirement work.

---

## 9. What requires a real Supabase environment (user actions)

1. Create a Supabase project; put URL + publishable key in
   `apps/web/.env.local` (template: `apps/web/.env.example`), plus a
   Gemini key in `GEMINI_API_KEY`.
2. Apply migrations **in filename order** (`0001`, `0002`, `0003`, `0004`);
   confirm `vector` extension is enabled before `0002`
   (`supabase db push` or SQL editor).
3. Configure Auth SMTP + Site URL so signup confirmation and password
   reset emails deliver (reset link targets `/reset-password`).
4. Two-account security test (incognito for B): A uploads a PDF and
   creates a task/project; B sees an empty Knowledge Hub, Tasks,
   Projects, Analytics and notifications — and cannot open A's signed
   URL. Sign back in as A → everything still there.
5. Set `GEMINI_API_KEY` server-side only; verify `/workspace/ai`
   answers with sources; remove it temporarily → verify the honest 503.
6. Run `docs/DEPLOYMENT.md` §7 post-deploy checklist on the real origin
   (includes the signup/reset email flows).

---

*Last updated: checkpoint 3 (Core Product Completion) complete.*
