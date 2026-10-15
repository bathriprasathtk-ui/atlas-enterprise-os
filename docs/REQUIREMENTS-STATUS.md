# Atlas Enterprise OS — Requirements Status

Traceability of every PRD/SRS requirement against the shipped
code base. Status was verified by inspection, automated tests,
and (where noted) live PostgreSQL checks.

**Last updated:** 2026-10-12 · Branch `freebuff/bc445a7e57f24e03cee2b69d`

## Legend

| Status | Meaning |
|---|---|
| ✅ Done | Implemented and verified (tests/build/manual) |
| 🟡 Partial | Works for the core case; stated gaps below |
| ⛔ Blocked | Correctly implemented but unverifiable here (needs credentials/infra) |
| 🔵 Deferred | Explicitly out of v1 scope per PRD §12 / SRS §3 |
| ❌ Not built | Missing; reason or build note given |

**Verification basis:** 72 unit tests (`npm test`), 87 integration
checks on real PostgreSQL 18 + pgvector 0.8.6 (`npm run test:db`,
migrations `0001`–`0008`, second idempotent pass included), 27 HTTP
end-to-end checks against the production build (`npm run test:e2e`),
lint 0 problems, typecheck clean, production build green without env
vars. All three suites run as blocking CI jobs.

---

## 1. SRS §7 Functional Requirements

### 7.1 Authentication

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| REQ-AUTH-001 | Email + password login | ✅ | `/login` → `lib/auth.ts` `signIn` → Supabase password auth; middleware guards `/workspace/*` |
| REQ-AUTH-002 | Secure password reset | ⛔ | Full flow shipped: "Forgot password?" → `resetPasswordForEmail` → `/reset-password` (PKCE exchange + `updateUser`). Cannot be end-to-end tested without a live Supabase project with SMTP configured |
| REQ-AUTH-003 | Multi-Factor Authentication | 🟡 | Settings → Two-factor section with real `supabase.auth.mfa` APIs: enroll (secret + code verify), disable, pending-setup restart. **Enforcement** (requiring AAL2 at sign-in) is a Supabase dashboard setting plus a login-challenge flow that must be verified on a live project first (§5) |
| REQ-AUTH-004 | Secure sessions | ✅ | `@supabase/ssr` HTTP-only cookies, refreshed by `middleware.ts`; sign-out in Topbar |
| REQ-AUTH-005 | Role-Based Access Control | ✅ | Three roles (owner/admin/member) enforced **by the database** (migration 0005): owners change roles and delete the org, admins manage members/invitations/departments, members work org-wide. UI gates in Team/Settings; 58 RLS/RBAC assertions in `npm run test:db` |

### 7.2 Organization Management

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| REQ-ORG-001 | Administrators create organizations | ✅ | `create_organization` RPC (owner-only outcome, blocks double membership); onboarding gate (`components/org/OrgGate.tsx`) requires create-or-accept before any workspace access; rename (owner/admin) and delete (owner) in Settings; existing users auto-receive a personal organization via the 0005 backfill |
| REQ-ORG-002 | Manage departments & teams | ✅ | Departments: admin CRUD + per-member assignment on the Team page (0005 policies + department-membership trigger). "Teams" are modeled by org roles + departments; there is no separate team entity (not specified in the database design) |
| REQ-ORG-003 | Employee profiles | ✅ | `profiles` (0003) auto-created by trigger; edit in Settings; org-scoped directory on the Team page |
| REQ-ORG-004 | Assign users to departments/teams | ✅ | `setMemberDepartment` (admin-only RLS) with a department picker per member on the Team page |
| REQ-ORG-005 | Organizational hierarchy | 🟡 | Organization → department → member plus a three-level role hierarchy, all DB-enforced. Reporting chains (manager → reports) are not in the Database-Design schema and were not invented |

### 7.3 Knowledge Hub

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| REQ-KB-001 | Create & edit knowledge articles | ✅ | `knowledge_articles` (0007) + `/workspace/knowledge/articles` list/create + full editor page; org-wide wiki-model edit rights |
| REQ-KB-002 | Version history | ✅ | Immutable `knowledge_article_versions`; versioning is trigger-enforced (a save can never skip history); editor shows history with author + timestamp and offers restore (restore appends a new version); 11 DB assertions |
| REQ-KB-003 | Categorize with tags | 🟡 | Preset categories on documents (0004) and articles (0007) with working filters. Free-form tags not built (not in the schema) |
| REQ-KB-004 | Enterprise-wide knowledge search | ✅ | Semantic search (`POST /api/knowledge/search`, Gemini embeddings, vector(768)) scoped to the caller's organization; top-bar search deep-links here |
| REQ-KB-005 | Secure storage & retrieval | ✅ | Private `documents` bucket; owner-only uploads; reads shared inside the organization via signed URLs (0005 storage policies, verified in the DB suite) |

### 7.4 AI Assistant

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| REQ-AI-001 | Answer from enterprise knowledge | ✅ | `POST /api/ai/ask`: RAG over the organization's chunks (org-scoped `match_document_chunks`), Gemini `gemini-3.6-flash`, grounded when context exists. ⛔ live key verification blocked (§5) |
| REQ-AI-002 | Summarize documents | 🟡 | Achievable through chat with a document in context; no dedicated one-click summarize action |
| REQ-AI-003 | Generate business insights | 🟡 | Dashboard insights computed from real org data and labelled as such; LLM-written reports not built |
| REQ-AI-004 | Recommend relevant resources | 🟡 | Semantic search surfaces relevant documents on demand; proactive recommendations not built |
| REQ-AI-005 | Cite sources | ✅ | `/api/ai/ask` returns `sources` (document + chunk), rendered in the chat UI |

---

## 2. PRD §10 Functional Requirements

| Requirement | Status | Notes |
|---|---|---|
| Register + login securely | ✅ | Sign-up and sign-in shipped on `/login` (email confirmation depends on Supabase project settings) |
| Multi-Factor Authentication | 🟡 | Same as REQ-AUTH-003 (enrolment UI shipped; enforcement needs live verification) |
| Single Sign-On (SSO) | 🟡 | Google SSO button shipped behind `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=1`; appears only when the Google provider is configured in Supabase — no IdP account exists here to verify against (§5) |
| Password reset | ⛔ | Implemented; needs live Supabase to verify |
| Secure session management | ✅ | Cookie sessions + middleware refresh + expiry handled by Supabase |
| Create organizations | ✅ | See REQ-ORG-001 |
| Manage departments/teams | ✅ | See REQ-ORG-002 |
| Employee profiles | ✅ | See REQ-ORG-003 |
| RBAC + permissions by role | ✅ | owner/admin/member enforced in the database + UI gates; see REQ-AUTH-005 |

---

## 3. PRD §9 Core Features

### 9.1 Authentication & Identity
Secure login ✅ · MFA 🟡 (enrolment + sign-in challenge + app-level AAL2 enforcement shipped; live end-to-end pending a project) · SSO 🟡 (gated Google button) · RBAC ✅ (org roles) · User profile ✅ · Session management ✅

### 9.2 Organization Management
Organization profile ✅ (rename/delete in Settings) · Department management ✅ (Team page) · Team management ✅ (invitations with 7-day expiry — 0008, removal, roles) · Employee directory ✅ (org-scoped) · Org hierarchy 🟡 (roles + departments; no reporting chains)

### 9.3 Knowledge Hub
Knowledge base (documents) ✅ · Wiki pages ✅ (articles, 0007) · Policy management 🟡 (policy documents + "Policies" article category; no approval workflow) · SOP repository 🟡 (articles with "Processes" category; no dedicated SOP entity) · Version control ✅ (articles; documents have re-index only) · Categories & tags 🟡 (presets only) · Document linking 🔵 (Knowledge Graph, v2.0)

### 9.4 AI Assistant
Enterprise AI chat ✅ · Document summarization 🟡 · AI report generation ❌ · Smart recommendations 🟡 · AI search ✅ · Meeting summaries ❌ · Workflow assistance 🟡 (workflows execute for real; no AI-generated workflow help)

### 9.5 Document Management
Upload & storage ✅ · Smart document search ✅ (semantic, org-wide) · Access permissions ✅ (org-shared reads, owner-or-admin delete, all DB-enforced and tested) · Folder management ❌ (not in schema) · Version history ❌ for documents (articles have it; documents re-index) · File sharing ✅ within the organization (signed URLs) · Approval workflow ❌ (needs approval semantics)

### 9.6 Project & Task Management
Project creation ✅ · Project analytics ✅ (real org-wide counts) · Task assignment 🟡 (self-assigned only; no assignee picker — organization members can see and update every task) · Kanban board ❌ (list + filters view) · Timeline view ❌ · Milestone tracking ❌ · Team collaboration 🟡 (shared org data, roles; chat/comments not built)

### 9.7 Workflow Automation
Runnable workflows ✅ — `task_reminder` and `document_digest`, executed server-side by `POST /api/workflows/run` with timeout, honest success/failure records in `workflow_runs`, and real notifications. Workflow history ✅ · Automated notifications ✅ · Custom workflow builder 🟡 (schema allows more kinds; two implemented) · Leave/expense/document **approval workflows** ❌ (needs approval semantics)

### 9.8 Team Collaboration
Shared workspace ✅ (organizations from 0005: membership, roles, invitations, org-wide data) · Team directory + management ✅ · Team chat ❌ · Discussion channels ❌ · Meeting notes ❌ · Mentions & comments ❌ · Real-time collaboration 🟡 (60s notification polling; websockets not integrated). Remaining gaps need chat/realtime infrastructure decisions (§5).

### 9.9 Analytics & Dashboards
Executive dashboard ✅ (real org stats, audit-backed activity) · KPI monitoring ✅ · AI insights 🟡 (computed, honestly labelled) · Department dashboards ❌ (unblocked by the org model; not built) · Business reports ❌ · Custom dashboards ❌

### 9.10 Notifications
In-app notifications ✅ (Topbar bell, unread badge, mark-read, 60s refresh, badge preference) · Membership notifications ✅ (role changes and removals delivered by the 0006 trigger) · Task reminders ✅ (workflow-driven) · Real-time 🟡 (polling) · Email notifications 🟡 (Knock integration implemented — `lib/mail.ts` + admin-gated `POST /api/org/invite-email` with an invitation-exists check; sends when `KNOCK_API_KEY` is set, honest "not configured" otherwise; needs a provider account, §5) · Approval alerts ❌ · Announcements ❌ · Notification preferences 🟡 (badge toggle only)

### 9.11 Enterprise Search
Global search ✅ (top-bar box → Knowledge Hub semantic search) · Semantic search ✅ (org-wide) · AI-powered search ✅ · Smart filters 🟡 (category + status filters) · Search suggestions ❌ · Knowledge discovery 🔵 (Knowledge Graph)

### 9.12 Administration & Security
Audit logs ✅ (real producers for task/project/document/workflow/profile/article mutations, ingestion, workflow runs, **and membership events via the 0006 trigger** — join/role-change/removal recorded in-transaction regardless of code path) · Access control ✅ (org-scoped RLS + storage policies, 87 DB assertions) · User & role management ✅ (Team page: invitations, roles, removal; DB-enforced) · Security policies ❌ (no dedicated policy-document workflow) · Backup & recovery 🟡 (Supabase platform feature; documented in DEPLOYMENT.md) · Compliance monitoring ❌

---

## 4. PRD §11 Non-Functional Requirements

| Area | Requirement | Status |
|---|---|---|
| Performance | Respond within 2s | 🟡 Not load-tested; org-scoped indexed queries, HNSW vector index |
| Performance | 10,000 concurrent users | ⛔ Requires a real deployment + load test |
| Security | HTTPS/TLS | ✅ Enforced by any HTTPS host (Supabase/preview URLs are TLS) |
| Security | Encryption at rest | 🟡 Supabase platform property; not verifiable from code |
| Security | Passwords hashed | ✅ Delegated to Supabase Auth (bcrypt/argon2 variants) |
| Security | RBAC | ✅ See REQ-AUTH-005 |
| Security | Audit logs | ✅ See 9.12 |
| Scalability | Horizontal scaling, cloud-native | 🟡 Next standalone build + Docker image scale horizontally; single Next process assumed |
| Reliability | High availability, backups | ⛔ Platform-level (Supabase + host); see DEPLOYMENT.md |
| Maintainability | Modular architecture, documented APIs, automated tests, CI/CD | ✅ lib modules + docs + 65 unit tests + 81 DB integration checks + GitHub Actions CI |
| Usability | Responsive, consistent navigation | 🟡 Desktop/tablet/mobile breakpoints used throughout; no automated accessibility audit |

---

## 5. Explicitly deferred / external blockers

| Item | Why | How to unblock |
|---|---|---|
| Knowledge Graph, document linking | PRD §12 lists it under **Version 2.0**; SRS §3 defers it | Plan written in `docs/KNOWLEDGE-GRAPH-PLAN.md` (entities, extraction, persistence, org isolation, visualization); not faked in v1 |
| MFA enforcement verification | Enforcement is now implemented in-app (Supabase does **not** challenge on its own — it is not a dashboard switch): `/login` challenges enrolled TOTP users after the password, `middleware` keeps AAL1 sessions out of `/workspace`, and `getRouteAuth()` + `/api/ai/ask` answer 401 until AAL2. What cannot be exercised here is a live end-to-end sign-in against a real project | Create the Supabase project → allow MFA in Auth settings → sign in with a TOTP factor on a test account → confirm the challenge prompt, a blocked AAL1 API call, then enable for users (DEPLOYMENT §3 item 5, §7 step 9) |
| SSO verification | Google button shipped but no Google OAuth credentials/IdP exist here | Configure the Google provider in Supabase Auth + set `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=1` at build time |
| Email provider account | Knock integration is implemented end-to-end (chosen via service research; env `KNOCK_API_KEY`). Without the key, invitations still work and the UI says email is not configured | Create a Knock account (free tier), connect an email provider inside it, define the `org_invitation` workflow, set `KNOCK_API_KEY` |
| Chat / mentions / real-time collaboration | Needs a product decision on infrastructure (Supabase Realtime, Ably, or websockets on the host) and a messages schema | Pick a realtime provider, design messages/channels tables + RLS, ship behind the org model (already in place) |
| Live Supabase verification (auth, DB, storage, RLS, pgvector, SMTP) | No hosted project credentials in this environment. Every migration (`0001`–`0008`) and its full RLS/RBAC matrix is verified against real PostgreSQL 18 + pgvector 0.8.6 locally | Create a Supabase project → apply migrations in order (DEPLOYMENT.md §4) → set env vars → run the §9 checklist in PROJECT-RECOVERY.md |
| Live Gemini embedding/answer verification | No API key in this environment | Set `GEMINI_API_KEY`; AI routes return an explicit error until then |
| 10k-concurrency, 2s latency claims | No deployed environment | Load test after deployment (k6 or similar) |

Migrations `0001`–`0008` were applied and fully tested against a real
PostgreSQL 18 instance with pgvector 0.8.6: two-user/org isolation,
spoofing rejected, RBAC matrix, invitations, last-owner guard,
membership audit triggers, immutable article versions, storage sharing,
org-scoped vector search, and a second idempotent pass of every file
(`npm run test:db` — 87/87).
