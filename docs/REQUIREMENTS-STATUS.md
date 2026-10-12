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

---

## 1. SRS §7 Functional Requirements

### 7.1 Authentication

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| REQ-AUTH-001 | Email + password login | ✅ | `/login` → `lib/auth.ts` `signIn` → Supabase password auth; middleware guards `/workspace/*` |
| REQ-AUTH-002 | Secure password reset | ⛔ | Full flow shipped: "Forgot password?" → `resetPasswordForEmail` → `/reset-password` (PKCE exchange + `updateUser`). Cannot be end-to-end tested without a live Supabase project with SMTP configured |
| REQ-AUTH-003 | Multi-Factor Authentication | ❌ | Not built. Supabase supports TOTP; requires enabling in the project and adding enrolment UI |
| REQ-AUTH-004 | Secure sessions | ✅ | `@supabase/ssr` HTTP-only cookies, refreshed by `middleware.ts`; sign-out in Topbar |
| REQ-AUTH-005 | Role-Based Access Control | 🟡 | Owner-only RLS on every table is enforced and tested (see §5). Org-level roles (admin/member, permission matrix) are not built — there is no multi-user workspace model yet |

### 7.2 Organization Management

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| REQ-ORG-001 | Administrators create organizations | ❌ | Single-workspace model; no organization entity. Needs the multi-tenant design decision first |
| REQ-ORG-002 | Manage departments & teams | ❌ | Not built; Team page is an employee directory |
| REQ-ORG-003 | Employee profiles | ✅ | `profiles` table (0003) + auto-created by trigger; edit in Settings; directory on Team page |
| REQ-ORG-004 | Assign users to departments/teams | ❌ | Depends on REQ-ORG-002 |
| REQ-ORG-005 | Organizational hierarchy | ❌ | Depends on REQ-ORG-002 |

### 7.3 Knowledge Hub

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| REQ-KB-001 | Create & edit knowledge articles | ❌ | Knowledge Hub is document-centric (PDF upload). An editable article entity (Database-Design §5.7) is not built |
| REQ-KB-002 | Version history | ❌ | Documents have re-index, not versions |
| REQ-KB-003 | Categorize with tags | 🟡 | Category on documents shipped this milestone (migration 0004, upload picker, working filter chips, 13/13 DB tests). Free-form tags and article categories not built |
| REQ-KB-004 | Enterprise-wide knowledge search | ✅ | Semantic search via `POST /api/knowledge/search` (Gemini embeddings, vector(768), RLS-scoped) with silent title-filter fallback; top-bar search deep-links here |
| REQ-KB-005 | Secure storage & retrieval | ✅ | Private `documents` bucket, owner-only storage policies, short-lived signed URLs (0001) |

### 7.4 AI Assistant

| ID | Requirement | Status | Evidence / gap |
|---|---|---|---|
| REQ-AI-001 | Answer from enterprise knowledge | ✅ | `POST /api/ai/ask`: RAG over the user's own chunks, Gemini `gemini-3.6-flash`, grounded when context exists |
| REQ-AI-002 | Summarize documents | 🟡 | Achievable through chat with a document in context; no dedicated one-click summarize action |
| REQ-AI-003 | Generate business insights | 🟡 | Dashboard insights are computed from real data and labelled as such; LLM-written reports not built |
| REQ-AI-004 | Recommend relevant resources | 🟡 | Semantic search surfaces relevant documents on demand; proactive recommendations not built |
| REQ-AI-005 | Cite sources | ✅ | `/api/ai/ask` returns `sources` (document + chunk), rendered in the chat UI |

---

## 2. PRD §10 Functional Requirements

| Requirement | Status | Notes |
|---|---|---|
| Register + login securely | ✅ | Sign-up and sign-in shipped on `/login` (email confirmation depends on Supabase project settings) |
| Multi-Factor Authentication | ❌ | Same as REQ-AUTH-003 |
| Single Sign-On (SSO) | ❌ | Needs an IdP (Google/Okta/Azure AD) configured in Supabase — external blocker, no provider chosen |
| Password reset | ⛔ | Implemented; needs live Supabase to verify |
| Secure session management | ✅ | Cookie sessions + middleware refresh + expiry handled by Supabase |
| Create organizations | ❌ | See REQ-ORG-001 |
| Manage departments/teams | ❌ | See REQ-ORG-002 |
| Employee profiles | ✅ | See REQ-ORG-003 |
| RBAC + permissions by role | 🟡 | Owner-only RBAC is enforced at database level; role hierarchy not built |

---

## 3. PRD §9 Core Features

### 9.1 Authentication & Identity
Secure login ✅ · MFA ❌ · SSO ❌ · RBAC 🟡 · User profile ✅ · Session management ✅

### 9.2 Organization Management
Organization profile ❌ · Department management ❌ · Team management ❌ · Employee directory ✅ · Org hierarchy ❌

### 9.3 Knowledge Hub
Knowledge base (documents) ✅ · Wiki pages ❌ · Policy management ❌ (upload + category only) · SOP repository ❌ · Version control ❌ · Categories & tags 🟡 (categories shipped) · Document linking 🔵 (Knowledge Graph, v2.0)

### 9.4 AI Assistant
Enterprise AI chat ✅ · Document summarization 🟡 · AI report generation ❌ · Smart recommendations 🟡 · AI search ✅ · Meeting summaries ❌ · Workflow assistance 🟡 (workflows execute for real; no AI-generated workflow help)

### 9.5 Document Management
Upload & storage ✅ · Smart document search ✅ (semantic) · Access permissions ✅ (owner-only) · Folder management ❌ · Version history ❌ · File sharing ❌ (would require the multi-user model) · Approval workflow ❌ (document approval is a v1-listed workflow that was not built; see 9.7)

### 9.6 Project & Task Management
Project creation ✅ · Project analytics ✅ (real counts in Analytics) · Task assignment 🟡 (self only; no assignee picker for others) · Kanban board ❌ (list + filters view) · Timeline view ❌ · Milestone tracking ❌ · Team collaboration 🟡

### 9.7 Workflow Automation
Runnable workflows ✅ — two real kinds: `task_reminder` and `document_digest`, executed server-side by `POST /api/workflows/run` with timeout, honest success/failure records in `workflow_runs`, and real notifications. Workflow history ✅ · Automated notifications ✅ · Custom workflow builder 🟡 (schema allows more kinds; only two implemented) · Leave/expense/document **approval workflows** ❌ (needs approval semantics + multi-user)

### 9.8 Team Collaboration
Team chat ❌ · Discussion channels ❌ · Meeting notes ❌ · Mentions & comments ❌ · Real-time collaboration ❌ — none of these are built, and the data model (owner-only rows) does not support shared documents yet. The Team page is a read-only directory. **This is the largest gap versus the PRD and requires the shared-workspace design decision.**

### 9.9 Analytics & Dashboards
Executive dashboard ✅ (real stats, real activity feed from `audit_logs`) · KPI monitoring ✅ · AI insights 🟡 (computed, honestly labelled) · Department dashboards ❌ (depends on org model) · Business reports ❌ · Custom dashboards ❌ · Fake revenue chart removed (was fabricated data)

### 9.10 Notifications
In-app notifications ✅ (table + Topbar bell, unread badge, mark-read, 60s refresh, badge preference) · Task reminders ✅ (workflow-driven) · Real-time 🟡 (polling, not websockets) · Email notifications ❌ (no email provider integrated) · Approval alerts ❌ · Announcements ❌ · Notification preferences 🟡 (badge toggle only)

### 9.11 Enterprise Search
Global search ✅ (top-bar box deep-links to Knowledge Hub semantic search) · Semantic search ✅ · AI-powered search ✅ · Smart filters 🟡 (category + status filters) · Search suggestions ❌ · Knowledge discovery 🔵 (Knowledge Graph)

### 9.12 Administration & Security
Audit logs ✅ (implemented with real producers: task/project/document/workflow/profile mutations, ingestion, workflow runs) · Access control ✅ (RLS + storage policies, tested) · User & role management 🟡 (own account only) · Security policies ❌ · Backup & recovery 🟡 (Supabase platform feature; documented, not scriptable here) · Compliance monitoring ❌

---

## 4. PRD §11 Non-Functional Requirements

| Area | Requirement | Status |
|---|---|---|
| Performance | Respond within 2s | 🟡 Not load-tested; RLS-scoped indexed queries, HNSW vector index |
| Performance | 10,000 concurrent users | ⛔ Requires a real deployment + load test |
| Security | HTTPS/TLS | ✅ Enforced by any HTTPS host (Supabase/preview URLs are TLS) |
| Security | Encryption at rest | 🟡 Supabase platform property; not verifiable from code |
| Security | Passwords hashed | ✅ Delegated to Supabase Auth (bcrypt/argon2 variants) |
| Security | RBAC | 🟡 See REQ-AUTH-005 |
| Security | Audit logs | ✅ See 9.12 |
| Scalability | Horizontal scaling, cloud-native | 🟡 Next standalone build + Docker image scale horizontally; single Next process assumed |
| Reliability | High availability, backups | ⛔ Platform-level (Supabase + host); see DEPLOYMENT.md |
| Maintainability | Modular architecture, documented APIs, automated tests, CI/CD | ✅ lib modules + docs + `node --test` suite (53 tests) + GitHub Actions CI |
| Usability | Responsive, consistent navigation | 🟡 Desktop/tablet/mobile breakpoints used throughout; no automated accessibility audit |

---

## 5. Explicitly deferred / external blockers

| Item | Why | How to unblock |
|---|---|---|
| Knowledge Graph, document linking | PRD §12 lists it under **Version 2.0**; SRS §3 defers it to a future release | Design + ship as v2.0; do not fake it in v1 |
| MFA, SSO | No identity provider configured | Enable in Supabase dashboard (MFA/TOTP) or configure an OAuth provider; add enrolment UI |
| Email notifications | No transactional email service chosen | Integrate a provider (e.g. Resend/SendGrid) server-side; Supabase SMTP is used only for auth emails |
| Orgs, departments, teams, roles, shared workspaces, chat | Requires a product-level multi-tenant/shared-data design; current RLS is deliberately owner-only | New milestone: workspace membership tables + membership-scoped policies |
| Live migration verification on Supabase | No hosted project credentials in this environment | Apply `0001→0004` in the Supabase SQL editor or `supabase db push` (order in DEPLOYMENT.md); migrations are idempotent |
| Live Gemini embedding/answer verification | No API key in this environment | Set `GEMINI_API_KEY`; AI routes return an explicit 503 until then |
| 10k-concurrency, 2s latency claims | No deployed environment | Load test after deployment (k6 or similar) |

Migrations `0001`, `0003`, `0004` were applied and RLS-tested against a real
PostgreSQL 18 instance (two-user isolation, spoofing rejected, idempotency).
`0002_embeddings.sql` (pgvector) could not run here — no pgvector/Docker —
and must be verified on the target project.
