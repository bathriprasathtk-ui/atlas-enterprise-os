-- =========================================================
-- Atlas Enterprise OS — Milestone 5: Organizations, membership
-- and RBAC (SRS §12: "Every user belongs to one organization",
-- "Permissions shall be enforced using RBAC"; Database-Design
-- §5.1-5.5).
--
-- Adds:
--   * organizations            — the tenant boundary
--   * org_members              — membership with roles
--                                (owner | admin | member)
--   * departments              — admin-managed org units
--   * org_invitations          — email invitations
--   * organization_id columns on every resource table
--   * helper functions (SECURITY DEFINER to avoid policy
--     recursion): current_org_id(), current_org_role(),
--     is_org_admin(), is_org_member(), current_user_email()
--   * membership+RBAC RLS REPLACING the owner-only policies
--     of 0001/0002/0003
--   * storage policies that share documents inside the org
--   * match_document_chunks() re-scoped to the organization
--   * RPCs: create_organization, invite_member,
--     my_invitations, accept_invitation
--   * personal-organization backfill for existing users
--
-- RBAC matrix:
--   member : read/create/edit org content; delete own rows
--   admin  : + delete any org content, manage departments,
--            invite/remove members
--   owner  : + rename the org, change roles, invite admins,
--            delete the org (the sole owner must delete the
--            organization instead of leaving it)
--
-- Idempotent: safe to run more than once.
-- =========================================================

begin;


-- =========================================================
-- 1. TABLES
-- =========================================================

create table if not exists public.organizations (
    id          uuid primary key default gen_random_uuid(),
    name        text not null
                check (char_length(trim(name)) between 1 and 120),
    created_by  uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
    before update on public.organizations
    for each row
    execute function public.set_updated_at();


create table if not exists public.org_members (
    organization_id  uuid not null
                     references public.organizations (id) on delete cascade,
    user_id          uuid not null
                     references auth.users (id) on delete cascade,
    role             text not null default 'member'
                     check (role in ('owner', 'admin', 'member')),
    created_at       timestamptz not null default now(),
    primary key (organization_id, user_id)
);

create index if not exists org_members_user_idx
    on public.org_members (user_id);


create table if not exists public.departments (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null
                    references public.organizations (id) on delete cascade,
    name            text not null
                    check (char_length(trim(name)) between 1 and 80),
    created_at      timestamptz not null default now(),
    unique (organization_id, name)
);


create table if not exists public.org_invitations (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null
                    references public.organizations (id) on delete cascade,
    email           text not null
                    check (email = lower(email)),
    role            text not null default 'member'
                    check (role in ('admin', 'member')),
    invited_by      uuid not null
                    references auth.users (id) on delete cascade,
    created_at      timestamptz not null default now(),
    unique (organization_id, email)
);

create index if not exists org_invitations_email_idx
    on public.org_invitations (email);


-- =========================================================
-- 2. ORGANIZATION COLUMNS ON EXISTING TABLES
-- =========================================================

alter table public.profiles
    add column if not exists organization_id uuid
    references public.organizations (id) on delete set null;
alter table public.profiles
    add column if not exists department_id uuid
    references public.departments (id) on delete set null;
alter table public.profiles
    add column if not exists email_notifications boolean
    not null default true;

alter table public.documents
    add column if not exists organization_id uuid
    references public.organizations (id) on delete cascade;
alter table if exists public.document_chunks
    add column if not exists organization_id uuid
    references public.organizations (id) on delete cascade;
alter table public.projects
    add column if not exists organization_id uuid
    references public.organizations (id) on delete cascade;
alter table public.tasks
    add column if not exists organization_id uuid
    references public.organizations (id) on delete cascade;
alter table public.workflows
    add column if not exists organization_id uuid
    references public.organizations (id) on delete cascade;
alter table public.workflow_runs
    add column if not exists organization_id uuid
    references public.organizations (id) on delete cascade;
alter table public.ai_conversations
    add column if not exists organization_id uuid
    references public.organizations (id) on delete cascade;
alter table public.audit_logs
    add column if not exists organization_id uuid
    references public.organizations (id) on delete cascade;

create index if not exists documents_organization_idx
    on public.documents (organization_id);
create index if not exists projects_organization_idx
    on public.projects (organization_id);
create index if not exists tasks_organization_idx
    on public.tasks (organization_id);
create index if not exists workflows_organization_idx
    on public.workflows (organization_id);
create index if not exists audit_logs_organization_idx
    on public.audit_logs (organization_id);


-- =========================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- =========================================================
-- Policies on org_members would recurse if the helpers read
-- org_members as the invoker, so every helper runs as the
-- migration owner and bypasses RLS for the membership lookup.

create or replace function public.current_org_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
    select organization_id
    from public.org_members
    where user_id = auth.uid()
    limit 1;
$$;

create or replace function public.current_org_role()
returns text
language sql stable security definer
set search_path = public
as $$
    select role
    from public.org_members
    where user_id = auth.uid()
    limit 1;
$$;

create or replace function public.is_org_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select public.current_org_role() in ('owner', 'admin');
$$;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.org_members
        where organization_id = target_org
          and user_id = auth.uid()
    );
$$;

create or replace function public.current_user_email()
returns text
language sql stable security definer
set search_path = public
as $$
    select lower(email)
    from auth.users
    where id = auth.uid();
$$;

revoke execute on function public.current_org_id() from public, anon;
revoke execute on function public.current_org_role() from public, anon;
revoke execute on function public.is_org_admin() from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.current_user_email() from public, anon;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_org_role() to authenticated;
grant execute on function public.is_org_admin() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.current_user_email() to authenticated;


-- =========================================================
-- 4. BACKFILL (idempotent)
-- =========================================================
-- Existing users get a personal organization so no data is
-- stranded by the switch from owner-only to org-scoped access.

do $$
declare
    usr record;
    v_org uuid;
    v_name text;
begin
    for usr in
        select x.id, x.email, x.raw_user_meta_data
        from auth.users x
        where not exists (
            select 1 from public.org_members m where m.user_id = x.id
        )
    loop
        v_name := coalesce(
            nullif(trim(coalesce(usr.raw_user_meta_data ->> 'full_name', '')), ''),
            split_part(coalesce(usr.email, 'User'), '@', 1)
        ) || ' organization';

        insert into public.organizations (name, created_by)
        values (v_name, usr.id)
        returning id into v_org;

        insert into public.org_members (organization_id, user_id, role)
        values (v_org, usr.id, 'owner')
        on conflict do nothing;
    end loop;
end $$;

update public.documents d
set organization_id = m.organization_id
from public.org_members m
where d.organization_id is null
  and m.user_id = d.uploaded_by;

update public.document_chunks c
set organization_id = m.organization_id
from public.org_members m
where c.organization_id is null
  and m.user_id = c.uploaded_by;

update public.projects p
set organization_id = m.organization_id
from public.org_members m
where p.organization_id is null
  and m.user_id = p.created_by;

update public.tasks t
set organization_id = m.organization_id
from public.org_members m
where t.organization_id is null
  and m.user_id = t.created_by;

update public.workflows w
set organization_id = m.organization_id
from public.org_members m
where w.organization_id is null
  and m.user_id = w.created_by;

update public.workflow_runs r
set organization_id = m.organization_id
from public.org_members m
where r.organization_id is null
  and m.user_id = r.created_by;

update public.ai_conversations a
set organization_id = m.organization_id
from public.org_members m
where a.organization_id is null
  and m.user_id = a.user_id;

update public.audit_logs l
set organization_id = m.organization_id
from public.org_members m
where l.organization_id is null
  and m.user_id = l.user_id;

update public.profiles p
set organization_id = m.organization_id
from public.org_members m
where p.organization_id is null
  and m.user_id = p.id;


-- =========================================================
-- 5. ROW-LEVEL SECURITY
-- =========================================================

alter table public.organizations   enable row level security;
alter table public.org_members     enable row level security;
alter table public.departments     enable row level security;
alter table public.org_invitations enable row level security;

-- ---------- drop every policy on the affected tables ----------
do $$
declare
    pol record;
begin
    for pol in
        select policyname, tablename
        from pg_policies
        where schemaname = 'public'
          and tablename in (
            'organizations', 'org_members', 'departments',
            'org_invitations',
            'documents', 'document_chunks', 'profiles',
            'projects', 'tasks', 'workflows', 'workflow_runs',
            'ai_conversations', 'audit_logs'
          )
    loop
        execute format(
            'drop policy %I on public.%I',
            pol.policyname, pol.tablename
        );
    end loop;
end;
$$;


-- ---------- organizations ----------

create policy organizations_select
    on public.organizations for select
    to authenticated
    using (id = public.current_org_id());

create policy organizations_insert
    on public.organizations for insert
    to authenticated
    with check (
        created_by = auth.uid()
        and public.current_org_id() is null
    );

create policy organizations_update
    on public.organizations for update
    to authenticated
    using (
        id = public.current_org_id()
        and public.is_org_admin()
    )
    with check (
        id = public.current_org_id()
        and public.is_org_admin()
    );

create policy organizations_delete
    on public.organizations for delete
    to authenticated
    using (
        id = public.current_org_id()
        and public.current_org_role() = 'owner'
    );


-- ---------- org_members ----------

create policy org_members_select
    on public.org_members for select
    to authenticated
    using (organization_id = public.current_org_id());

create policy org_members_insert
    on public.org_members for insert
    to authenticated
    with check (
        (
            user_id = auth.uid()
            and exists (
                select 1 from public.organizations o
                where o.id = organization_id
                  and o.created_by = auth.uid()
            )
        )
        or (
            public.is_org_admin()
            and organization_id = public.current_org_id()
        )
    );

-- Role changes are owner-gated (admins may not touch roles;
-- member management otherwise happens through invitations).
create policy org_members_update
    on public.org_members for update
    to authenticated
    using (
        organization_id = public.current_org_id()
        and public.current_org_role() = 'owner'
    )
    with check (
        organization_id = public.current_org_id()
        and public.current_org_role() = 'owner'
    );

create policy org_members_delete
    on public.org_members for delete
    to authenticated
    using (
        organization_id = public.current_org_id()
        and (
            user_id = auth.uid()
            or public.is_org_admin()
        )
    );

-- The last owner can neither leave nor be removed (blocking
-- orphaned organizations). Exempt when the delete cascades
-- from an owner-initiated organization DELETE.
create or replace function public.assert_not_last_owner()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    if pg_trigger_depth() > 1 then
        return old;
    end if;

    if old.role = 'owner'
        and (select count(*) from public.org_members
             where organization_id = old.organization_id
               and role = 'owner') <= 1 then
        raise exception
            'an organization must keep at least one owner'
            using errcode = '42501';
    end if;

    return old;
end;
$$;

drop trigger if exists not_last_owner on public.org_members;
create trigger not_last_owner
    before delete on public.org_members
    for each row
    execute function public.assert_not_last_owner();


-- ---------- departments ----------

create policy departments_select
    on public.departments for select
    to authenticated
    using (organization_id = public.current_org_id());

create policy departments_insert
    on public.departments for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and public.is_org_admin()
    );

create policy departments_update
    on public.departments for update
    to authenticated
    using (
        organization_id = public.current_org_id()
        and public.is_org_admin()
    )
    with check (
        organization_id = public.current_org_id()
        and public.is_org_admin()
    );

create policy departments_delete
    on public.departments for delete
    to authenticated
    using (
        organization_id = public.current_org_id()
        and public.is_org_admin()
    );


-- ---------- org_invitations ----------

create policy org_invitations_select
    on public.org_invitations for select
    to authenticated
    using (
        lower(email) = public.current_user_email()
        or (
            organization_id = public.current_org_id()
            and public.is_org_admin()
        )
    );

create policy org_invitations_insert
    on public.org_invitations for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and public.is_org_admin()
        and (role = 'member' or public.current_org_role() = 'owner')
    );

-- Invitees decline by deleting; admins revoke by deleting.
create policy org_invitations_delete
    on public.org_invitations for delete
    to authenticated
    using (
        lower(email) = public.current_user_email()
        or (
            organization_id = public.current_org_id()
            and public.is_org_admin()
        )
    );


-- ---------- profiles ----------

create policy profiles_select
    on public.profiles for select
    to authenticated
    using (
        id = auth.uid()
        or organization_id = public.current_org_id()
    );

create policy profiles_update
    on public.profiles for update
    to authenticated
    using (
        id = auth.uid()
        or (
            public.is_org_admin()
            and organization_id = public.current_org_id()
        )
    )
    with check (
        (
            id = auth.uid()
            and organization_id is not distinct from public.current_org_id()
        )
        or (
            public.is_org_admin()
            and organization_id = public.current_org_id()
        )
    );

-- Department assignment must stay inside the profile's org.
create or replace function public.assert_profile_department()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    if new.department_id is not null
        and not exists (
            select 1 from public.departments d
            where d.id = new.department_id
              and d.organization_id = new.organization_id
        ) then
        raise exception 'department does not belong to the organization'
            using errcode = '42501';
    end if;

    return new;
end;
$$;

drop trigger if exists profile_department_check on public.profiles;
create trigger profile_department_check
    before insert or update of department_id on public.profiles
    for each row
    execute function public.assert_profile_department();


-- ---------- documents ----------

create policy documents_select
    on public.documents for select
    to authenticated
    using (organization_id = public.current_org_id());

create policy documents_insert
    on public.documents for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and uploaded_by = auth.uid()
    );

create policy documents_update
    on public.documents for update
    to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id());

create policy documents_delete
    on public.documents for delete
    to authenticated
    using (
        organization_id = public.current_org_id()
        and (
            uploaded_by = auth.uid()
            or public.is_org_admin()
        )
    );


-- ---------- document_chunks (table exists only with 0002) ----------

do $$
begin
    if exists (
        select 1 from information_schema.tables
        where table_schema = 'public'
          and table_name = 'document_chunks'
    ) then
        execute $p$
            create policy chunks_select
                on public.document_chunks for select
                to authenticated
                using (organization_id = public.current_org_id())$p$;

        execute $p$
            create policy chunks_insert
                on public.document_chunks for insert
                to authenticated
                with check (organization_id = public.current_org_id())$p$;

        execute $p$
            create policy chunks_update
                on public.document_chunks for update
                to authenticated
                using (organization_id = public.current_org_id())
                with check (organization_id = public.current_org_id())$p$;

        execute $p$
            create policy chunks_delete
                on public.document_chunks for delete
                to authenticated
                using (organization_id = public.current_org_id())$p$;
    end if;
end;
$$;


-- ---------- projects ----------

create policy projects_select
    on public.projects for select
    to authenticated
    using (organization_id = public.current_org_id());

create policy projects_insert
    on public.projects for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and created_by = auth.uid()
    );

create policy projects_update
    on public.projects for update
    to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id());

create policy projects_delete
    on public.projects for delete
    to authenticated
    using (
        organization_id = public.current_org_id()
        and (
            created_by = auth.uid()
            or public.is_org_admin()
        )
    );


-- ---------- tasks ----------

create policy tasks_select
    on public.tasks for select
    to authenticated
    using (organization_id = public.current_org_id());

create policy tasks_insert
    on public.tasks for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and created_by = auth.uid()
    );

create policy tasks_update
    on public.tasks for update
    to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id());

create policy tasks_delete
    on public.tasks for delete
    to authenticated
    using (
        organization_id = public.current_org_id()
        and (
            created_by = auth.uid()
            or public.is_org_admin()
        )
    );


-- ---------- workflows ----------

create policy workflows_select
    on public.workflows for select
    to authenticated
    using (organization_id = public.current_org_id());

create policy workflows_insert
    on public.workflows for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and created_by = auth.uid()
    );

create policy workflows_update
    on public.workflows for update
    to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id());

create policy workflows_delete
    on public.workflows for delete
    to authenticated
    using (
        organization_id = public.current_org_id()
        and (
            created_by = auth.uid()
            or public.is_org_admin()
        )
    );


-- ---------- workflow_runs ----------

create policy workflow_runs_select
    on public.workflow_runs for select
    to authenticated
    using (organization_id = public.current_org_id());

create policy workflow_runs_insert
    on public.workflow_runs for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and created_by = auth.uid()
    );


-- ---------- ai_conversations (personal, org-scoped) ----------

create policy ai_conversations_select
    on public.ai_conversations for select
    to authenticated
    using (
        user_id = auth.uid()
        and organization_id = public.current_org_id()
    );

create policy ai_conversations_insert
    on public.ai_conversations for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and organization_id = public.current_org_id()
    );

create policy ai_conversations_delete
    on public.ai_conversations for delete
    to authenticated
    using (
        user_id = auth.uid()
        and organization_id = public.current_org_id()
    );


-- ---------- audit_logs ----------

create policy audit_logs_select
    on public.audit_logs for select
    to authenticated
    using (
        user_id = auth.uid()
        or (
            organization_id = public.current_org_id()
            and public.is_org_admin()
        )
    );

create policy audit_logs_insert
    on public.audit_logs for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and organization_id = public.current_org_id()
    );


-- =========================================================
-- 6. STORAGE POLICIES (share files inside the organization)
-- =========================================================

do $$
declare
    pol record;
begin
    for pol in
        select policyname
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
    loop
        execute format(
            'drop policy %I on storage.objects',
            pol.policyname
        );
    end loop;
end;
$$;

-- Upload: own folder only, and only for org members.
create policy atlas_documents_storage_insert
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'documents'
        and (storage.foldername(name))[1] = auth.uid()::text
        and public.current_org_id() is not null
    );

-- Read: own folder, or any document row the caller can see
-- (i.e. shared inside the organization).
create policy atlas_documents_storage_select
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'documents'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or exists (
                select 1 from public.documents d
                where d.file_name = objects.name
                  and d.organization_id = public.current_org_id()
            )
        )
    );

create policy atlas_documents_storage_update
    on storage.objects for update
    to authenticated
    using (
        bucket_id = 'documents'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or exists (
                select 1 from public.documents d
                where d.file_name = objects.name
                  and d.organization_id = public.current_org_id()
            )
        )
    )
    with check (
        bucket_id = 'documents'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- Delete: own folder (upload rollback), or a document the
-- caller can see (admin cleanup).
create policy atlas_documents_storage_delete
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'documents'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or exists (
                select 1 from public.documents d
                where d.file_name = objects.name
                  and d.organization_id = public.current_org_id()
            )
        )
    );


-- =========================================================
-- 7. SEMANTIC SEARCH — ORGANIZATION SCOPED
-- =========================================================
-- Replaces the owner-only filter of 0002: retrieval now runs
-- across the caller's organization (still `language sql`, so
-- caller RLS remains inlined).

do $$
begin
    if exists (
        select 1 from information_schema.tables
        where table_schema = 'public'
          and table_name = 'document_chunks'
    ) then
        execute $p$
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
        as $inner$
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
            where c.organization_id = public.current_org_id()
              and c.embedding is not null
              and (1 - (c.embedding <=> query_embedding)) >= min_similarity
            order by c.embedding <=> query_embedding
            limit greatest(coalesce(match_count, 8), 1);
        $inner$;
        $p$;
    end if;
end;
$$;

revoke execute on function public.match_document_chunks(
    vector, integer, double precision
) from public, anon;
grant execute on function public.match_document_chunks(
    vector, integer, double precision
) to authenticated;


-- =========================================================
-- 8. RPCs (SECURITY DEFINER — cross-row orchestration)
-- =========================================================

create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_org uuid;
begin
    if v_user is null then
        raise exception 'authentication required' using errcode = '42501';
    end if;

    if p_name is null
        or char_length(trim(p_name)) not between 1 and 120 then
        raise exception 'the organization name must be 1-120 characters';
    end if;

    if exists (
        select 1 from public.org_members where user_id = v_user
    ) then
        raise exception 'you already belong to an organization'
            using errcode = '42501';
    end if;

    insert into public.organizations (name, created_by)
    values (trim(p_name), v_user)
    returning id into v_org;

    insert into public.org_members (organization_id, user_id, role)
    values (v_org, v_user, 'owner');

    update public.profiles
    set organization_id = v_org
    where id = v_user;

    return v_org;
end;
$$;


create or replace function public.invite_member(
    p_email text,
    p_role text default 'member'
)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_org uuid;
    v_email text;
begin
    if v_user is null then
        raise exception 'authentication required' using errcode = '42501';
    end if;

    if p_role not in ('admin', 'member') then
        raise exception 'invalid role';
    end if;

    v_org := public.current_org_id();

    if v_org is null then
        raise exception 'join an organization first' using errcode = '42501';
    end if;

    if not public.is_org_admin() then
        raise exception 'only administrators can invite members'
            using errcode = '42501';
    end if;

    if p_role = 'admin' and public.current_org_role() <> 'owner' then
        raise exception 'only the owner can invite administrators'
            using errcode = '42501';
    end if;

    v_email := lower(trim(coalesce(p_email, '')));

    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'enter a valid email address';
    end if;

    if exists (
        select 1 from public.org_members m
        join auth.users u on u.id = m.user_id
        where lower(u.email) = v_email
    ) then
        raise exception 'that user already belongs to an organization';
    end if;

    insert into public.org_invitations
        (organization_id, email, role, invited_by)
    values
        (v_org, v_email, p_role, v_user)
    on conflict (organization_id, email)
    do update set role = excluded.role;

    return 'invited';
end;
$$;


create or replace function public.my_invitations()
returns table (
    id               uuid,
    organization_id  uuid,
    organization_name text,
    role             text,
    invited_by_name  text,
    created_at       timestamptz
)
language sql stable security definer
set search_path = public
as $$
    select
        i.id,
        i.organization_id,
        o.name,
        i.role,
        coalesce(p.display_name, 'An administrator'),
        i.created_at
    from public.org_invitations i
    join public.organizations o on o.id = i.organization_id
    left join public.profiles p on p.id = i.invited_by
    where lower(i.email) = coalesce(public.current_user_email(), '')
      and not exists (
          select 1 from public.org_members m
          where m.user_id = auth.uid()
      );
$$;


create or replace function public.accept_invitation(p_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_inv public.org_invitations%rowtype;
begin
    if v_user is null then
        raise exception 'authentication required' using errcode = '42501';
    end if;

    if exists (
        select 1 from public.org_members where user_id = v_user
    ) then
        raise exception 'you already belong to an organization'
            using errcode = '42501';
    end if;

    select * into v_inv
    from public.org_invitations
    where id = p_id
      and lower(email) = coalesce(public.current_user_email(), '');

    if not found then
        raise exception 'invitation not found' using errcode = '42501';
    end if;

    insert into public.org_members (organization_id, user_id, role)
    values (v_inv.organization_id, v_user, v_inv.role);

    update public.profiles
    set organization_id = v_inv.organization_id
    where id = v_user;

    delete from public.org_invitations where id = p_id;

    return v_inv.organization_id;
end;
$$;

revoke execute on function public.create_organization(text) from public, anon;
revoke execute on function public.invite_member(text, text) from public, anon;
revoke execute on function public.my_invitations() from public, anon;
revoke execute on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.invite_member(text, text) to authenticated;
grant execute on function public.my_invitations() to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;


commit;
