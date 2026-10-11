# Atlas Enterprise OS — Project Recovery & Progress

> This file is the durable hand-off between development sessions.
> Update it after every meaningful change so any developer/session can
> resume without re-reading the whole history.

---

## 1. Repository state

| Item | Value |
|---|---|
| GitHub | https://github.com/bathriprasathtk-ui/atlas-enterprise-os (`main` = `5b1d249`) |
| Working branch | `freebuff/bc445a7e57f24e03cee2b69d` |
| Base | `main` @ `5b1d249` "feat: sync Atlas Enterprise OS application" |
| Checkpoint 1 | Commit directly after `5b1d249` on this branch — contains the full, verified **Trusted Data Foundation** milestone (previously uncommitted) |
| Checkpoint 2 | Commit after checkpoint 1 — contains the full, verified **Semantic Knowledge Retrieval (RAG)** milestone + Docker/CI |
| Node / npm | v24.21.0 / 11.19.0 |
| App root | `apps/web/` (Next.js 16.2.11, App Router, React 19, TS strict, Tailwind v4) |

As of this checkpoint, **GitHub contains none of the milestone work** — it existed
only in this worktree. Push only with explicit user approval.

---

## 2. Verified completed work

### A. Trusted Data Foundation (checkpoint 1) — VERIFIED

Makes the real auth → documents → storage → AI flow secure:

1. **`supabase/migrations/0001_init.sql`** (new): `documents` + `projects`
   tables (UUID PKs, audit fields, ownership FKs → `auth.users`, triggers,
   indexes), RLS enabled with 4 owner-only policies per table, private
   `documents` storage bucket (50 MB limit, MIME allowlist) with 4 owner-only
   path policies (`{userId}/…`), baseline drop of legacy permissive policies,
   legacy flat-path file relocation. Idempotent.
2. **Storage security**: user-scoped upload paths
   `{userId}/{timestamp}-{filename}`; public URLs eliminated everywhere in
   favor of signed URLs (client 1 h, server 5 min).
3. **Data layer** (`lib/storage.ts`, `lib/documents.ts`, `lib/projects.ts`):
   every query explicitly scoped to the authenticated user
   (`.eq("uploaded_by"/"created_by", uid)` as defense-in-depth on top of RLS);
   `assertOwnedPath()`; safe unauthenticated handling (no crashes).
4. **UploadZone.tsx**: auth validation, MIME + 50 MB validation, DB-insert
   error handling with storage rollback, refresh via `onUploaded` callback
   (no `window.location.reload()`, no `alert()`).
5. **DocumentCard.tsx**: preview/download via signed URLs; `alert()` replaced
   with inline `role="alert"` messages.
6. **AI route** (`app/api/ai/ask/route.ts`): 401 without session, documents
   query scoped to caller, PDFs fetched through signed URLs, no user-ID/PII
   logging, Gemini behavior preserved.
7. **User identity**: `lib/auth.ts` gains `getCurrentUser()`; Topbar and
   DashboardHeader show the real authenticated user (no hardcoded names).
8. **Config**: `apps/web/.env.example` (variable names only), `.gitignore`
   exception for it, README setup instructions, `typecheck` npm script.
9. **Dead code**: `apps/web/lib/supabase.ts` (unused third Supabase client)
   deleted — verified zero importers.

**Verification evidence (this machine):**
- `npm run typecheck` → exit 0
- `npm run build` (placeholder env) → exit 0, 19/19 pages, zero errors
- `npm run lint` → exit 1, 11 problems — **all pre-existing** (baseline was
  12; milestone fixed one and introduced none). Flagged files are untouched
  except `knowledge/page.tsx` whose error is at an unchanged line.
- **Two-user RLS test: 33/33 PASS** on real PostgreSQL 18 (embedded, with
  mocked Supabase `auth`/`storage` schemas): user B cannot read/update/delete
  or spoof-own user A's documents/projects/storage; anon gets 0 rows; ownerless
  legacy files inaccessible; migration idempotent. (Harness in `/tmp/rlstest/`
  — session-only, not committed.)
- No secrets anywhere in diffs; no `.env.local`; no tracked `.env` files.

### B. Semantic Knowledge Retrieval — Milestone 2 — VERIFIED (static + mocked)

Real pgvector RAG over the private document store:

1. **`supabase/migrations/0002_embeddings.sql`** (new): `document_chunks`
   (UUID PK, `document_id` FK cascade, `uploaded_by` → `auth.users`,
   `chunk_index`, `content`, `embedding vector(768)`, unique
   (document, chunk_index), HNSW cosine index), RLS enabled with 4
   owner-only policies (baseline drop of any pre-existing policies),
   `match_document_chunks(query_embedding, match_count, min_similarity)`
   written in `language sql` so the body is **inlined** into the caller's
   query — RLS applies, plus an explicit `uploaded_by = auth.uid()` filter;
   `execute` granted to `authenticated` only, revoked from `anon`/`public`.
   Requires the `pgvector` extension (enable in Supabase → Extensions).
   Idempotent. **UNAPPLIED to any hosted database.**
2. **`lib/chunking.ts`** (new): paragraph-packed, sentence-aware,
   word-boundary chunking — 1,600-char target, 200-char overlap trimmed to
   the room available so no chunk ever exceeds the bound. 6 unit tests.
3. **`lib/embeddings.ts`** (new): `gemini-embedding-2` via plain
   `batchEmbedContents` fetch, `outputDimensionality: 768` (matches
   `vector(768)`), 20-per-batch, API key server-side only,
   `EmbeddingError` with HTTP status, strict shape checks. 9 unit tests
   (mocked fetch — no network).
4. **`lib/rag.ts`** (new): `findRelevantChunks()` (embed query → RPC
   `match_document_chunks`) + `countUserChunks()`.
5. **`lib/routeAuth.ts`** (new): shared route auth helper
   (Bearer token → Supabase session user).
6. **`app/api/documents/ingest/route.ts`** (new): auth → ownership check →
   download PDF via **signed URL** → `lib/pdf.ts` text extraction → chunk →
   embed → replace `document_chunks` rows atomically. Auto-triggered after
   every upload (UploadZone) and manually via the **Re-index** button.
7. **`app/api/ai/ask/route.ts`** (reworked): top-k chunk retrieval with
   similarity floor; whole-PDF concatenation only as legacy fallback when
   nothing is indexed. Same Gemini model/params, no PII logging.
8. **`app/api/knowledge/search/route.ts`** (new) + Knowledge Hub search UI:
   debounced semantic search (own documents only) with silent fallback to
   the classic title filter when the embedding service is down.
9. **DocumentCard**: "AI Indexed" badge now reflects **real** index state
   (`document_chunks` count, RLS-scoped) instead of being hardcoded; new
   Re-index action with inline errors/status (no `alert()`/`reload()`).
10. **Docker + CI**: `apps/web/Dockerfile` (multi-stage, node:20-alpine,
    standalone output — `next.config.ts` now sets `output: "standalone"`),
    `apps/web/.dockerignore`, `.github/workflows/ci.yml` (blocking
    typecheck + 15 unit tests + production build; lint non-blocking until
    pre-existing debt is cleared; docker-build job validates the image on
    GitHub's runner since the sandbox has no usable Docker daemon).
11. **Unit-test infra**: `npm test` → `node --test` on
    `lib/__tests__/*.test.ts` (15/15 pass; no new test framework added).

---

## 3. Current task

Milestone 2 (Semantic Knowledge Retrieval) is COMPLETE and committed as
checkpoint 2, pending user review. Next milestone is user-selected (§5).

---

## 4. Known errors & blockers

| Blocker | Impact | Workaround |
|---|---|---|
| **No Supabase project/credentials** in sandbox | Cannot live-test auth, RLS, Storage API, signed URLs | Verified statically + on local Postgres with mocked Supabase schemas. User must run `supabase db push` + two-account browser test (see §9) |
| **No GEMINI_API_KEY** | Cannot exercise live Gemini chat/embeddings | Route code verified statically; 9 unit tests mock `fetch` |
| **No Docker in sandbox** | Docker image cannot be built/tested here | Dockerfile written to spec; `docker` CI job will build it on GitHub — locally unverified |
| **Pre-existing lint debt** | `npm run lint` exits 1 (11 problems) | Pre-existing in untouched files; NOT suppressed. Fix in cleanup milestone |
| **42 zero-byte placeholder files** | Dead weight; some represent unbuilt features | Analysis in §6; removal deferred to an approved cleanup milestone |
| **Stray root `package.json` + `services/*.ts` (empty)** | Confusing; root lockfile broken | Deferred (architecture cleanup) |

---

## 5. Outstanding tasks (priority order)

1. **Live verification on real Supabase (§9)** — apply `0001`+`0002`,
   enable `pgvector`, run the two-account test, then an end-to-end
   upload → Re-index → semantic search → AI question pass.
2. Real dashboard data (documents/projects counts from DB instead of mock)
3. AI chat page wired to the ask route (check current state first)
4. Knowledge graph / related-document edges (needs user-approved design)
5. Cleanup milestone (user-approved): remove unused zero-byte files, stray
   root package.json/services dir, unify workspace shells, clear the 11
   pre-existing lint findings so CI lint can become blocking
6. Extend `node --test` coverage (path security, validation) as new lib
   logic lands — vitest only if the suite outgrows the runner

---

## 6. Zero-byte file analysis (42 files)

All are **unused** (zero importers; build passes) → none are *blocking*.
Grouped by intent (from docs/design):
- `hooks/*` (useAuth, useDocuments, useProjects, useTasks, useTheme) — planned
  data-access layer; superseded by `lib/*.ts`; implement only if UI needs them
- `types/*` (auth, document, project, task, team, user, workflow) — planned
  shared types; partially superseded by inline types in `lib/*.ts`
- `components/ai/*` (chat set) — planned AI assistant UI (product requirement;
  to be implemented for real, not just deleted)
- `components/auth/*` (LoginCard, LoginHero, SocialLogin) — login page works
  without them; social login deferred (needs Supabase OAuth config)
- `components/dashboard/Dashboard.tsx` + landing components — dashboard page
  currently renders its own real-header + mock cards; to be made real
- 8 UI primitives (Modal, Toast, Dropdown, Search, Loader, Avatar, Badge) —
  reusable; implement on first real use
- root `services/*.ts` (6 files) — planned FastAPI layer; empty and unused

---

## 7. Verification commands (run from `apps/web/`)

```bash
npm ci                    # (note: lockfile was repaired by npm install — see checkpoint)
npm run typecheck         # tsc --noEmit — MUST be exit 0
npm run lint              # eslint — currently exits 1 on PRE-EXISTING issues
npm run build             # needs Supabase env vars; placeholders OK for compile
```

RLS harness (session-only): `/tmp/rlstest/rls-test.js` with
`node rls-test.js` — 33 assertions against embedded PostgreSQL 18.

---

## 8. Exact next steps (for the next session)

1. `git log` to confirm checkpoint 2 is HEAD; read this file.
2. Ask the user to pick the next milestone (candidates in §5). Push +
   open a PR only with explicit approval — CI (§2.B.10) will then
   validate typecheck/tests/build and the Dockerfile on GitHub.
3. When the user has a real Supabase project: follow §9 (migrations,
   pgvector extension, two-account test, live Gemini pass).
4. Update §2/§3/§5 of this file as you go.
5. Do not touch: PRD/SRS/architecture docs (unless fixing factual drift),
   placeholder files (until approved), unrelated mock modules (tasks, team,
   analytics, workflows, calendar, integrations).

---

## 9. What requires a real Supabase environment (user actions)

1. Create a Supabase project; copy URL + publishable key into
   `apps/web/.env.local` (see `apps/web/.env.example`), plus a Gemini key.
2. Apply migrations: `supabase db push` (or paste `supabase/migrations/*.sql`
   into the SQL editor, in filename order).
3. Two-account security test: sign in as A → upload PDF; sign in as B (fresh
   browser/incognito) → confirm Knowledge Hub shows nothing of A's and that
   A's signed URL is inaccessible. Sign back in as A → preview/download work.
4. Set `GEMINI_API_KEY` server-side only; test `/workspace/ai` question.

---

*Last updated: milestone 2 complete — checkpoint 2.*
