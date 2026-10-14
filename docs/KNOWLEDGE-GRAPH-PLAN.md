# Knowledge Graph — Implementation Plan (not yet implemented)

**Status: planned, later-version feature. Not implemented.**
_Last assessed: 2026-10-14, against commit `4291cb5`._

## 1. Assessment of the current codebase

A repository-wide search for `knowledge_graph`, `knowledgeGraph`,
`entity`, `relationship` and `graph` in `apps/web` and
`supabase/migrations/` returns **no implementation** — no tables, no
extraction code, no UI. The feature is genuinely missing, not partial.

Per the product brief it must be implemented **only after core
functionality and security are stable**. This document is the required
plan; nothing here is built or claimed to work.

## 2. Goal (minimal, useful version)

Visualize the entities (people, products, systems, concepts) mentioned
in an organization's documents and knowledge articles, and how they
relate — so a user can jump from "what do we know about X?" to the
documents that mention it.

Explicitly **not** in scope for v1: arbitrary graph queries, ontology
editoring, cross-organization links, automatic summarization.

## 3. Entities and relationships

| Object | Meaning | Source |
| --- | --- | --- |
| `graph_entity` | A named thing (proper noun, product, system, org unit) | Extracted from document chunks and article bodies |
| `graph_edge` | A typed link between two entities in the same org | Co-occurrence and extracted relations |

- **Entity types (v1 enum):** `person`, `organization`, `product`,
  `system`, `concept`, `other`.
- **Edge types (v1 enum):** `related_to`, `part_of`, `produces`,
  `uses`, `mentions`. v1 defaults to `mentions` (co-occurrence within
  one chunk) plus `related_to` when the model asserts an explicit
  relation; the enum leaves room for richer types later.
- Entities are **org-local**: the same name in two organizations is
  two rows. No global merge in v1.

## 4. Extraction

- Runs **server-side only**, reusing the existing Gemini credentials
  (`GEMINI_API_KEY`) and the existing chunk/article read paths.
- Input unit: one document chunk (or one article) at a time, so
  extraction is incremental and re-runnable.
- Prompt returns strict JSON
  (`{ entities: [{ name, type }], relations: [{ from, to, type }] }`);
  unparseable output is logged and skipped — never guessed.
- Triggered by the existing ingestion flow (after
  `/api/documents/ingest` succeeds) as a **best-effort, non-blocking**
  step: a failed extraction must not fail ingestion.
- Re-extraction is idempotent per chunk: `ON CONFLICT` on
  `(organization_id, normalized_name)` upserts, and edges are keyed by
  `(organization_id, from_entity, to_entity, type, source_chunk_id)`.
- Rate limits and missing keys degrade to "graph not updated" with an
  honest UI note — no fabricated entities, no mock data.

## 5. Persistence (future migration, one new file)

A single new migration (e.g. `0008_knowledge_graph.sql`) would add:

- `public.graph_entities(id, organization_id, name, normalized_name,
  type, mention_count, created_at, updated_at)` with a unique index on
  `(organization_id, normalized_name)`.
- `public.graph_edges(id, organization_id, from_entity_id,
  to_entity_id, edge_type, source_chunk_id, weight, created_at)` with
  FKs to `graph_entities` and `document_chunks`, unique on
  `(organization_id, from_entity_id, to_entity_id, edge_type,
  source_chunk_id)`.
- `updated_at` trigger and `mention_count` maintenance consistent with
  the patterns already used in `0005`/`0007`.

**Migration discipline:** idempotent (`if not exists` / `drop trigger
if exists` guards), numbered after the existing sequence, never
reordering or editing shipped migrations, and validated by the existing
`npm run test:db` suite before anything else depends on it.

## 6. Organization isolation

Same two-layer model the rest of the app uses, tested the same way:

1. **RLS** on both tables: `organization_id = current_org_id()` for
   select/insert/update/delete, mirroring the policies in `0005`.
2. **Explicit `.eq("organization_id", orgId)`** on every query, plus a
   `match`-style SQL function that resolves the caller's organization
   internally (as `match_document_chunks` does).

Verification: extend the DB suite with a two-organization matrix —
org A inserts entities/edges, org B cannot select, update or delete
them, and a graph query from B never returns A's nodes. Extraction
jobs must read chunks through the same org scope.

## 7. Visualization

- v1 UI: `/workspace/knowledge/graph` — a **client component that
  renders server-fetched nodes/edges**, with a deterministic fallback
  layout (simple force-directed or circular) and an accessible
  alternative (sortable entity table with mention counts) so the
  feature is usable without a pointer and with a screen reader.
- No new dependency for v1: either a small self-contained layout or an
  existing chart primitive. If a dedicated graph library is later
  justified, it needs a separate dependency review (bundle size,
  license, maintenance) before being added.
- Keyboard navigation, focus states and color contrast follow the
  accessibility standards already used in `apps/web`.
- Honest empty states: "No entities extracted yet" rather than a
  decorative placeholder graph.

## 8. Delivery order

1. Core stability + security sign-off (this mission's Definition of
   Done).
2. Migration `0008` + DB suite matrix (RLS, idempotency, two-org
   isolation).
3. Extraction step wired to ingestion + articles, with unit tests over
   the JSON parsing/failure paths (mocked `fetch`, no live key needed).
4. Read API (`/api/knowledge/graph`) with org scoping + validation.
5. UI with empty/loading/error states and the accessible fallback.
6. Only then: any dependency addition, polish, or richer relation
   types.

Each step ships with its own tests and commit; nothing above is
started until steps are reachable in order.
