-- =========================================================
-- Atlas Enterprise OS — Milestone 2: Semantic Knowledge
--
-- Adds pgvector-powered organizational memory:
--   * public.document_chunks — per-document text chunks with
--     768-dimension embeddings (Gemini gemini-embedding-2)
--   * owner-only RLS (same security model as 0001)
--   * match_document_chunks() — top-k cosine similarity search,
--     automatically scoped to the calling user via auth.uid()
--
-- Requires: the pgvector extension. On hosted Supabase enable
--   Database -> Extensions -> vector, or simply run this
--   migration as postgres (create extension below handles it).
--
-- Embedding dimension: 768. Must match EMBEDDING_DIMENSIONS in
--   apps/web/lib/embeddings.ts. Changing it requires a re-ingest.
--
-- Idempotent: safe to run more than once.
-- =========================================================

begin;


-- =========================================================
-- 1. EXTENSION
-- =========================================================

create extension if not exists vector;


-- =========================================================
-- 2. TABLE
-- =========================================================

create table if not exists public.document_chunks (
    id            uuid primary key default gen_random_uuid(),
    document_id   uuid not null
                  references public.documents (id) on delete cascade,
    uploaded_by   uuid not null
                  references auth.users (id) on delete cascade,
    chunk_index   integer not null,
    content       text not null,
    embedding     vector(768),
    created_at    timestamptz not null default now(),
    unique (document_id, chunk_index)
);

create index if not exists document_chunks_uploaded_by_idx
    on public.document_chunks (uploaded_by);

create index if not exists document_chunks_document_id_idx
    on public.document_chunks (document_id);

-- Cosine-similarity ANN index (HNSW: no table locks during build).
create index if not exists document_chunks_embedding_idx
    on public.document_chunks
    using hnsw (embedding vector_cosine_ops);


-- =========================================================
-- 3. ROW-LEVEL SECURITY
-- =========================================================

alter table public.document_chunks enable row level security;

-- Known security baseline: drop any pre-existing policies on
-- this table, then create ownership-only policies.
do $$
declare
    pol record;
begin
    for pol in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = 'document_chunks'
    loop
        execute format(
            'drop policy %I on public.document_chunks',
            pol.policyname
        );
    end loop;
end;
$$;

create policy atlas_chunks_select_own
    on public.document_chunks for select
    to authenticated
    using (uploaded_by = auth.uid());

create policy atlas_chunks_insert_own
    on public.document_chunks for insert
    to authenticated
    with check (uploaded_by = auth.uid());

create policy atlas_chunks_update_own
    on public.document_chunks for update
    to authenticated
    using (uploaded_by = auth.uid())
    with check (uploaded_by = auth.uid());

create policy atlas_chunks_delete_own
    on public.document_chunks for delete
    to authenticated
    using (uploaded_by = auth.uid());


-- =========================================================
-- 4. SIMILARITY SEARCH FUNCTION
-- =========================================================
--
-- language sql (not plpgsql) so the body is INLINED into the
-- caller's query: Row-Level Security on document_chunks and
-- documents applies to the caller. auth.uid() therefore scopes
-- every search to the signed-in user's own documents.

create or replace function public.match_document_chunks(
    query_embedding vector(768),
    match_count integer default 8,
    min_similarity double precision default 0.2
)
returns table (
    id           uuid,
    document_id  uuid,
    title        text,
    content      text,
    chunk_index  integer,
    similarity   double precision
)
language sql
stable
as $$
    select
        c.id,
        c.document_id,
        d.title,
        c.content,
        c.chunk_index,
        1 - (c.embedding <=> query_embedding) as similarity
    from public.document_chunks c
    join public.documents d
        on d.id = c.document_id
    where c.uploaded_by = auth.uid()
      and c.embedding is not null
      and (1 - (c.embedding <=> query_embedding)) >= min_similarity
    order by c.embedding <=> query_embedding
    limit greatest(coalesce(match_count, 8), 1);
$$;

-- Execute only for signed-in users (function performs no writes,
-- but keeping it off anon/public is defense in depth).
revoke execute on function public.match_document_chunks(
    vector, integer, double precision
) from public, anon;

grant execute on function public.match_document_chunks(
    vector, integer, double precision
) to authenticated;


commit;
