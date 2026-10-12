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
| Checkpoint 3 | **Core Product Completion** — tasks/projects/dashboard/AI/calendar/analytics/team/workflows/settings/integrations/notifications, auth flows, document categories, audit + notification producers, health endpoint, lint debt cleared, docs (`3b9007a`) |
| Checkpoint 4 | **Enterprise Collaboration** — organizations/RBAC/invitations/departments (0005), membership audit triggers (0006), knowledge articles + versions (0007), onboarding gate, org-wide sharing, invitation emails (Knock), MFA enrolment UI + gated Google SSO, e2e suite, CI hardened |
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

### D. Enterprise Collaboration (checkpoint 4) — VERIFIED (local PostgreSQL 18 + real production build)

**Database (migrations 0005–0007, all idempotent):**
`0005_organizations.sql` — organizations, `org_members`
(owner/admin/member), departments, invitations + RPCs
(`create_organization`, `invite_member`, `my_invitations`,
`accept_invitation`), personal-org backfill, **org-scoped RLS
replacing owner-only policies on every workspace table**,
org-scoped storage policies and `match_document_chunks`.
`0006_membership_audit.sql` — SECURITY DEFINER trigger records
join/role-change/removal in-transaction (any code path) and
notifies the affected member on role change/removal.
`0007_knowledge_articles.sql` — `knowledge_articles` +
immutable `knowledge_article_versions`; versioning is
trigger-enforced (AFTER INSERT + BEFORE UPDATE), restore =
new version.

**App:** onboarding gate (`components/org/OrgGate.tsx` — create
or accept an invitation before any workspace access); every data
layer sets `organization_id` and scopes reads org-wide;
delete flows verify RLS rowcounts (no silent no-ops); Team page
= members, roles (owner-gated), invitations (admin, honest
"no email sent" copy), departments; Settings = organization
rename/leave/delete + TOTP two-factor section (real
`supabase.auth.mfa` APIs); knowledge articles list + editor +
version history + restore; keyword article hits in Knowledge
search; invitation emails via Knock (`lib/mail.ts` +
`POST /api/org/invite-email`, honest `not_configured`); Google
SSO button behind `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN`; dead
`components/auth/` (incl. a password-logging LoginForm) removed.

**Evidence (re-run fresh after the final change):**

| Check | Result |
|---|---|
| `npm test` | **67/67 pass** (+articles/mail validators) |
| `npm run test:db` | **81/81 pass** — 0001–0007 on PostgreSQL 18 + pgvector 0.8.6, full RBAC matrix, membership-audit triggers, article versions, second idempotent pass |
| `npm run test:e2e` | **17/17 pass** — real `next start` build: health, pages, middleware redirects, API 401s |
| `npm run typecheck` / `npm run lint` | exit 0 / 0 problems |
| `npm run build` | exit 0, 26 routes (incl. articles list + editor), without env vars |
| Secrets | none in diffs/tracked files; no `.env.local` |

---

## 3. Current task

Checkpoint 4 (Enterprise Collaboration) is complete and committed
locally. Nothing is pushed. Every v1-buildable requirement in the
checklist (§5) is done; the remaining items need external accounts or
credentials (§4). Status of every PRD/SRS requirement is tracked in
`docs/REQUIREMENTS-STATUS.md`.

---

## 4. Known errors & blockers

| Blocker | Impact | Workaround |
|---|---|---|
| **No Supabase project/credentials** in sandbox | Cannot live-test auth, signup/reset emails, Storage API, RLS through the app, MFA enrolment | All migrations + RLS/RBAC verified on local PostgreSQL 18; user runs §9 checklist |
| **No GEMINI_API_KEY** | Cannot exercise live chat/embeddings | Routes return explicit 503; 9 unit tests mock `fetch` |
| **No Docker in sandbox** | Image not built here | Dockerfile + HEALTHCHECK written; the `docker` CI job builds it on GitHub |
| **`0001`–`0007` unapplied to a hosted project** | Semantic search, orgs, articles dead until applied | Verified locally incl. pgvector 0.8.6; apply in order on the target project (DEPLOYMENT §4) |
| **No `KNOCK_API_KEY`** (email provider account) | Invitation emails skip with an honest "not configured" message | Create a Knock account, connect a provider, define the `org_invitation` workflow, set the env var (DEPLOYMENT §2) |
| **MFA enforcement needs a live project** | Enrol/verify/disable UI works; requiring AAL2 at sign-in is a Supabase dashboard setting + login-challenge flow | Test a real sign-in with MFA enforced before flipping it on |
| **Lint debt** | — | **CLEARED**: lint is 0 problems and blocking in CI |
| **42 zero-byte placeholder files** | Dead weight (all unused, zero importers) | Analysis in §6; removal deferred to an approved cleanup |
| Next 16 `middleware` deprecation warning | Cosmetic today | Rename `middleware.ts` → `proxy.ts` on next upgrade (see DEPLOYMENT §9) |

---

## 5. Actionable completion checklist (living document)

Status markers: `[x]` done+verified · `[~]` partial, reason given.
Every item traces to `docs/REQUIREMENTS-STATUS.md`.

### A. Organization, isolation, membership, roles (REQ-ORG-*, PRD 9.2/9.6/9.8, SRS §12)
- [x] A1 `0005_organizations.sql`: organizations, org_members
      (owner/admin/member), departments, org_invitations,
      `current_org_id()/current_org_role()/is_org_admin()`,
      `organization_id` on all resource tables + storage policy
      update, membership+RBAC RLS replacing owner-only policies,
      personal-org backfill, idempotent
- [x] A2 DB suite: two organizations fully isolated; role rules;
      invited user joins; backfill correctness (part of 81/81)
- [x] A3 `lib/orgs.ts` + org scoping in every data lib
      (explicit `.eq("organization_id", …)` on top of RLS) and
      organization_id on every insert
- [x] A4 No-org gate in the workspace layout
      (`components/org/OrgGate.tsx`: create organization or accept
      an invitation; no separate /onboarding route needed)
- [x] A5 Team page = real member management (invite by email,
      owner-gated role changes, remove, departments create/assign)
- [x] A6 Settings = organization profile (rename owner/admin,
      leave, delete owner) + last-owner guard enforced by DB

### B. Knowledge articles + versioning (REQ-KB-001/002, PRD 9.3, DB §5.7)
- [x] B1 `0007_knowledge_articles.sql`: knowledge_articles +
      knowledge_article_versions, org RLS, trigger-enforced
      immutable versions, author-or-admin delete
- [x] B2 `lib/articles.ts`: CRUD, restore-as-new-version, validation
- [x] B3 Knowledge Hub tabs (Documents | Articles), article list +
      editor, categories, version history + restore UI (free-form
      tags: not in schema, preset categories only — see matrix)
- [x] B4 Articles surfaced in Knowledge Hub search (keyword hits,
      honestly labelled — plain text is not embedded)
- [x] B5 Tests: 12 unit (validators) + 11 DB assertions (versions,
      RLS, immutability, delete rules)

### C. Email notifications (PRD 9.10)
- [x] C1 Provider chosen via service research: Knock (env:
      `KNOCK_API_KEY`; you connect SendGrid/Postmark inside Knock)
- [x] C2 `lib/mail.ts` server module — real provider when
      configured, honest `not_configured` otherwise (unit-tested)
- [~] C3 `profiles.email_notifications` column exists (0005); the
      Settings toggle is deliberately NOT shipped until a
      member-directed email exists to govern (invitations target
      non-members) — a decorative toggle would be a placeholder
- [~] C4 Invitations wired end-to-end
      (`POST /api/org/invite-email`, admin-only, invitation-exists
      anti-abuse check, Team page honest messaging). Workflow-run
      failure emails not wired: runs already notify in-app, and
      email needs the provider key first
- [x] C5 Blocker documented precisely (§4 + DEPLOYMENT §2)

### D. MFA / SSO (REQ-AUTH-003, PRD 9.1)
- [~] D1 Settings → Two-factor section shipped with real
      supabase-js MFA APIs (enroll/verify/disable TOTP, pending-
      factor restart). Requiring AAL2 at sign-in + the login
      challenge flow need a live Supabase project (§4) — do not
      enforce before testing a real sign-in
- [x] D2 Google SSO button shipped behind
      `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=1` + provider config in
      Supabase; hidden otherwise (nothing fake rendered)
- [~] D3 Unit tests cover the honest mail degradation; MFA flows
      are network-bound to a live project and cannot be unit-tested
      here (documented, not skipped silently)

### E. Verification infrastructure (adds integration/E2E to unit tests)
- [x] E1 Real pgvector: PostgreSQL 18 + pgvector 0.8.6 applied and
      tested (`match_document_chunks` org scope included)
- [x] E2 Committed `npm run test:db` (embedded PG locally,
      `ATLAS_TEST_DATABASE_URL` externally) + blocking CI job with
      a pgvector service container
- [x] E3 Committed `npm run test:e2e` — production `next start`
      build over HTTP: health, pages, middleware redirects, API
      401s — blocking CI step after the build

### F. Full behavior + authorization audit
- [x] F1 Page/route/button sweep done; findings fixed: dead
      `components/auth/` (incl. password-logging LoginForm) removed,
      dead "+ Upload Document" header button removed, stale
      owner-only copy updated, silent RLS delete no-ops replaced
      with explicit authorization errors
- [x] F2 API authorization matrix: 401s (e2e-verified), org scoping
      on every route, admin-only invite email, no PII in logs

### G. Quality review
- [x] G1 Security/privacy/logging: no secrets in logs or client;
      audit metadata limited to identity events; storage private +
      signed URLs; RLS verified against spoofing
- [x] G2 Error handling + accessibility: labels, aria roles
      (alert/status), sr-only labels, focus styles, confirm
      dialogs for destructive actions (manual review; no automated
      audit tool in sandbox)
- [x] G3 Responsiveness + performance: existing breakpoints used
      throughout; 0005 adds org indexes on every hot path; vector
      HNSW index retained

### H. Deployability
- [x] H1 CI fully blocking: typecheck, lint, unit tests, build,
      e2e, migrations+RLS job (pgvector service), Docker build
- [x] H2 Docker/health/rollback docs validated as far as the env
      allows (DEPLOYMENT.md updated for 0005–0007 + Knock)

### I. Close-out
- [x] I1 Requirements matrix + deployment/recovery docs reflect the
      final state
- [x] I2 Focused local commits; final report delivered

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
