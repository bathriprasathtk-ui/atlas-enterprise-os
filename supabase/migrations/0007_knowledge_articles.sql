-- =========================================================
-- 0007 — KNOWLEDGE ARTICLES + VERSION HISTORY
--
-- PRD §9.3 (wiki pages, version control) and SRS §7.3
-- (REQ-KB-001/002) require editable knowledge articles with
-- version history in v1. Articles are organization-scoped
-- like every other workspace table (0005).
--
-- Versioning is enforced by a row trigger: saving an edit
-- can never skip history. Versions are immutable (no update
-- or delete policies); restoring an old version is a normal
-- edit that appends yet another version.
-- =========================================================

create table if not exists public.knowledge_articles (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null
                    references public.organizations (id) on delete cascade,
    title           text not null
                    check (char_length(trim(title)) between 1 and 200),
    content         text not null default '',
    category        text
                    check (category is null or char_length(trim(category)) <= 60),
    current_version integer not null default 1 check (current_version >= 1),
    created_by      uuid not null references auth.users (id),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists knowledge_articles_org_idx
    on public.knowledge_articles (organization_id);
create index if not exists knowledge_articles_updated_idx
    on public.knowledge_articles (organization_id, updated_at desc);

drop trigger if exists set_knowledge_articles_updated_at
    on public.knowledge_articles;
create trigger set_knowledge_articles_updated_at
    before update on public.knowledge_articles
    for each row
    execute function public.set_updated_at();


create table if not exists public.knowledge_article_versions (
    id              uuid primary key default gen_random_uuid(),
    article_id      uuid not null
                    references public.knowledge_articles (id) on delete cascade,
    organization_id uuid not null
                    references public.organizations (id) on delete cascade,
    version_number  integer not null check (version_number >= 1),
    title           text not null,
    content         text not null default '',
    created_by      uuid not null references auth.users (id),
    created_at      timestamptz not null default now(),
    unique (article_id, version_number)
);

create index if not exists article_versions_article_idx
    on public.knowledge_article_versions (article_id, version_number desc);


/* ---------- version triggers (invoker — RLS still applies) ----------
   INSERT is captured AFTER (the row must exist for the version
   FK); UPDATE runs BEFORE so the version bump can be written
   into the same statement. */

create or replace function public.track_article_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        insert into public.knowledge_article_versions
            (article_id, organization_id, version_number,
             title, content, created_by)
        values
            (new.id, new.organization_id, 1,
             new.title, new.content,
             coalesce(auth.uid(), new.created_by));

        return new;
    end if;

    if new.title is distinct from old.title
       or new.content is distinct from old.content then
        insert into public.knowledge_article_versions
            (article_id, organization_id, version_number,
             title, content, created_by)
        values
            (new.id, new.organization_id,
             old.current_version + 1,
             new.title, new.content, auth.uid());

        new.current_version := old.current_version + 1;
    end if;

    return new;
end;
$$;

revoke execute on function public.track_article_version() from public;
revoke execute on function public.track_article_version() from anon;
revoke execute on function public.track_article_version() from authenticated;

drop trigger if exists track_article_version_insert
    on public.knowledge_articles;
create trigger track_article_version_insert
    after insert
    on public.knowledge_articles
    for each row
    execute function public.track_article_version();

drop trigger if exists track_article_version_update
    on public.knowledge_articles;
create trigger track_article_version_update
    before update of title, content
    on public.knowledge_articles
    for each row
    execute function public.track_article_version();


/* ---------- row-level security (0005 pattern) ---------- */

alter table public.knowledge_articles        enable row level security;
alter table public.knowledge_article_versions enable row level security;

drop policy if exists knowledge_articles_select
    on public.knowledge_articles;
drop policy if exists knowledge_articles_insert
    on public.knowledge_articles;
drop policy if exists knowledge_articles_update
    on public.knowledge_articles;
drop policy if exists knowledge_articles_delete
    on public.knowledge_articles;
drop policy if exists article_versions_select
    on public.knowledge_article_versions;
drop policy if exists article_versions_insert
    on public.knowledge_article_versions;

create policy knowledge_articles_select
    on public.knowledge_articles for select
    to authenticated
    using (organization_id = public.current_org_id());

create policy knowledge_articles_insert
    on public.knowledge_articles for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and created_by = auth.uid()
    );

create policy knowledge_articles_update
    on public.knowledge_articles for update
    to authenticated
    using (organization_id = public.current_org_id())
    with check (organization_id = public.current_org_id());

create policy knowledge_articles_delete
    on public.knowledge_articles for delete
    to authenticated
    using (
        organization_id = public.current_org_id()
        and (
            created_by = auth.uid()
            or public.is_org_admin()
        )
    );

create policy article_versions_select
    on public.knowledge_article_versions for select
    to authenticated
    using (organization_id = public.current_org_id());

/* Written by the version trigger under the actor's JWT.
   No update/delete policies: history is immutable. */
create policy article_versions_insert
    on public.knowledge_article_versions for insert
    to authenticated
    with check (
        organization_id = public.current_org_id()
        and created_by = auth.uid()
    );
