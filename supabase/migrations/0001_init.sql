-- =========================================================
-- Atlas Enterprise OS — Initial schema
--
-- Tables:
--   public.documents  (Knowledge Hub documents)
--   public.projects   (Workspace projects)
--   storage bucket    "documents" (PRIVATE)
--
-- Security model:
--   * Row-Level Security enabled on both tables.
--   * Every row is owned by exactly one authenticated user
--     (documents.uploaded_by, projects.created_by).
--   * Policies allow an authenticated user to read/modify
--     ONLY their own rows.
--   * Storage objects live under a user-scoped path:
--       {userId}/{timestamp}-{filename}
--     and are readable/writable only by that user.
--
-- Idempotent: safe to run more than once.
-- =========================================================

begin;


-- =========================================================
-- 1. TABLES
-- =========================================================

create table if not exists public.documents (
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    file_name   text not null,             -- storage path: {userId}/{timestamp}-{filename}
    file_url    text,                      -- legacy column kept for schema compatibility
    file_size   bigint,
    mime_type   text,
    uploaded_by uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists documents_uploaded_by_created_at_idx
    on public.documents (uploaded_by, created_at desc);

create table if not exists public.projects (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    description text,
    status      text not null default 'Active'
                check (status in ('Active', 'In Review', 'Completed')),
    progress    integer not null default 0
                check (progress >= 0 and progress <= 100),
    created_by  uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists projects_created_by_created_at_idx
    on public.projects (created_by, created_at desc);


-- =========================================================
-- 2. updated_at MAINTENANCE
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
    before update on public.documents
    for each row
    execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
    before update on public.projects
    for each row
    execute function public.set_updated_at();


-- =========================================================
-- 3. ROW-LEVEL SECURITY (tables)
-- =========================================================

alter table public.documents enable row level security;
alter table public.projects  enable row level security;

-- Establish a known security baseline: remove any pre-existing
-- policies on these tables, then create ownership-only policies.
do $$
declare
    pol record;
begin
    for pol in
        select policyname, tablename
        from pg_policies
        where schemaname = 'public'
          and tablename in ('documents', 'projects')
    loop
        execute format(
            'drop policy %I on public.%I',
            pol.policyname,
            pol.tablename
        );
    end loop;
end;
$$;

-- documents: owner-only access
create policy atlas_documents_select_own
    on public.documents for select
    to authenticated
    using (uploaded_by = auth.uid());

create policy atlas_documents_insert_own
    on public.documents for insert
    to authenticated
    with check (uploaded_by = auth.uid());

create policy atlas_documents_update_own
    on public.documents for update
    to authenticated
    using (uploaded_by = auth.uid())
    with check (uploaded_by = auth.uid());

create policy atlas_documents_delete_own
    on public.documents for delete
    to authenticated
    using (uploaded_by = auth.uid());

-- projects: owner-only access
create policy atlas_projects_select_own
    on public.projects for select
    to authenticated
    using (created_by = auth.uid());

create policy atlas_projects_insert_own
    on public.projects for insert
   to authenticated
    with check (created_by = auth.uid());

create policy atlas_projects_update_own
    on public.projects for update
    to authenticated
    using (created_by = auth.uid())
    with check (created_by = auth.uid());

create policy atlas_projects_delete_own
    on public.projects for delete
    to authenticated
    using (created_by = auth.uid());


-- =========================================================
-- 4. STORAGE (private bucket + owner-only policies)
-- =========================================================

-- Create the bucket as PRIVATE, or convert an existing public one.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'documents',
    'documents',
    false,
    52428800, -- 50 MB, mirrors MAX_UPLOAD_SIZE_BYTES in apps/web/lib/storage.ts
    array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp'
    ]::text[]
)
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

-- Remove any pre-existing policies on storage.objects that target the
-- documents bucket, so no legacy permissive policy can bypass ownership.
do $$
declare
    pol record;
begin
    for pol in
        select policyname
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and (
              -- existing policies that reference the documents bucket
              position('documents' in coalesce(qual, '')) > 0
              or position('documents' in coalesce(with_check, '')) > 0
              or policyname ilike '%document%'
          )
    loop
        execute format(
            'drop policy %I on storage.objects',
            pol.policyname
        );
    end loop;
end;
$$;

-- Path layout: {userId}/{timestamp}-{filename}
-- storage.foldername(name) returns the folder components,
-- so element [1] must equal the owning user's id.

create policy atlas_documents_storage_select_own
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'documents'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy atlas_documents_storage_insert_own
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'documents'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy atlas_documents_storage_update_own
    on storage.objects for update
    to authenticated
    using (
        bucket_id = 'documents'
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
        bucket_id = 'documents'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy atlas_documents_storage_delete_own
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'documents'
        and (storage.foldername(name))[1] = auth.uid()::text
    );


-- =========================================================
-- 5. LEGACY DATA RELOCATION (pre-migration flat paths)
--
-- Files uploaded before this migration live at the bucket
-- root as "{timestamp}-{filename}". Move each one into its
-- owner's folder and update the matching documents row so
-- existing uploads keep working under the new policies.
-- =========================================================

update storage.objects o
set name = d.uploaded_by::text || '/' || o.name
from public.documents d
where o.bucket_id = 'documents'
  and o.name = d.file_name
  and d.uploaded_by is not null
  and position('/' in o.name) = 0
  and not exists (
      select 1
      from storage.objects o2
      where o2.bucket_id = 'documents'
        and o2.name = d.uploaded_by::text || '/' || o.name
  );

update public.documents d
set file_name = d.uploaded_by::text || '/' || d.file_name
where d.uploaded_by is not null
  and position('/' in d.file_name) = 0
  and exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'documents'
        and o.name = d.uploaded_by::text || '/' || d.file_name
  );

-- Rows without a known owner (legacy null uploaded_by) remain
-- inaccessible: RLS predicates evaluate to NULL => no access.


commit;
