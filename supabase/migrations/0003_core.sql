-- =========================================================
-- Atlas Enterprise OS — Milestone 3: Core product tables
--
-- Adds the remaining MVP entities from Database-Design.md:
--   * tasks            (5.9)   project tasks
--   * notifications    (5.10)  user notifications
--   * ai_conversations (5.11)  AI assistant history
--   * audit_logs       (5.12)  per-user activity log
--   * workflows +
--     workflow_runs            workflow automation + honest run records
--   * profiles                 employee directory (name/designation only)
--
-- Security model (same as 0001/0002):
--   * every business table: RLS enabled, owner-only policies
--   * profiles: readable by any signed-in user (directory intent),
--     writable only by its owner
--   * trigger validates that a task's project_id belongs to the
--     task creator, so foreign keys cannot reference another
--     user's project
--
-- Idempotent: safe to run more than once.
-- =========================================================

begin;


-- =========================================================
-- 1. TASKS
-- =========================================================

create table if not exists public.tasks (
    id           uuid primary key default gen_random_uuid(),
    title        text not null
                 check (char_length(trim(title)) between 1 and 200),
    description  text,
    project_id   uuid
                 references public.projects (id) on delete set null,
    assigned_to  uuid
                 references auth.users (id) on delete set null,
    priority     text not null default 'medium'
                 check (priority in ('low', 'medium', 'high')),
    status       text not null default 'todo'
                 check (status in ('todo', 'in_progress', 'done')),
    due_date     date,
    created_by   uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists tasks_created_by_idx
    on public.tasks (created_by);
create index if not exists tasks_project_id_idx
    on public.tasks (project_id);
create index if not exists tasks_status_idx
    on public.tasks (status);
create index if not exists tasks_due_date_idx
    on public.tasks (due_date);

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
    before update on public.tasks
    for each row
    execute function public.set_updated_at();


-- =========================================================
-- 2. NOTIFICATIONS
-- =========================================================

create table if not exists public.notifications (
    id                 uuid primary key default gen_random_uuid(),
    user_id            uuid not null
                       references auth.users (id) on delete cascade,
    title              text not null
                       check (char_length(trim(title)) between 1 and 200),
    message            text not null,
    notification_type  text not null default 'system'
                       check (notification_type in
                         ('system', 'task', 'workflow', 'document', 'ai')),
    is_read            boolean not null default false,
    created_at         timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
    on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
    on public.notifications (user_id) where is_read = false;


-- =========================================================
-- 3. AI CONVERSATIONS
-- =========================================================

create table if not exists public.ai_conversations (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null
                      references auth.users (id) on delete cascade,
    prompt            text not null,
    response          text not null,
    model             text not null,
    sources           jsonb,
    response_time_ms  integer,
    tokens_used       integer,
    created_at        timestamptz not null default now()
);

create index if not exists ai_conversations_user_created_idx
    on public.ai_conversations (user_id, created_at desc);


-- =========================================================
-- 4. AUDIT LOGS
-- =========================================================

create table if not exists public.audit_logs (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null
                references auth.users (id) on delete cascade,
    action      text not null,
    entity      text not null,
    entity_id   text,
    metadata    jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists audit_logs_user_created_idx
    on public.audit_logs (user_id, created_at desc);


-- =========================================================
-- 5. WORKFLOWS
-- =========================================================
--
-- A workflow is an automation the platform can actually execute:
--   task_reminder    — notify about tasks due within N days
--   document_digest  — summarize documents indexed in the last N days
-- Execution results are recorded honestly in workflow_runs
-- (success or failed — never a fabricated success).

create table if not exists public.workflows (
    id            uuid primary key default gen_random_uuid(),
    name          text not null
                  check (char_length(trim(name)) between 1 and 120),
    description   text,
    kind          text not null
                  check (kind in ('task_reminder', 'document_digest')),
    config        jsonb not null default '{}'::jsonb,
    status        text not null default 'active'
                  check (status in ('active', 'paused')),
    last_run_at   timestamptz,
    created_by    uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists workflows_created_by_idx
    on public.workflows (created_by);

drop trigger if exists set_workflows_updated_at on public.workflows;
create trigger set_workflows_updated_at
    before update on public.workflows
    for each row
    execute function public.set_updated_at();


create table if not exists public.workflow_runs (
    id           uuid primary key default gen_random_uuid(),
    workflow_id  uuid not null
                 references public.workflows (id) on delete cascade,
    status       text not null
                 check (status in ('success', 'failed')),
    message      text not null,
    started_at   timestamptz not null default now(),
    finished_at  timestamptz,
    created_by   uuid not null default auth.uid()
                 references auth.users (id) on delete cascade
);

create index if not exists workflow_runs_workflow_idx
    on public.workflow_runs (workflow_id, started_at desc);
create index if not exists workflow_runs_created_by_idx
    on public.workflow_runs (created_by, started_at desc);


-- =========================================================
-- 6. PROFILES (employee directory)
-- =========================================================
--
-- Minimal, org-wide-readable identity: display name and
-- designation only. No email, no auth data — those stay in
-- auth.users and are never exposed through this table.

create table if not exists public.profiles (
    id             uuid primary key
                   references auth.users (id) on delete cascade,
    display_name   text not null
                   check (char_length(trim(display_name)) between 1 and 120),
    designation    text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
    before update on public.profiles
    for each row
    execute function public.set_updated_at();


-- Auto-create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(
            nullif(trim(
                coalesce(new.raw_user_meta_data ->> 'full_name', '')
            ), ''),
            split_part(coalesce(new.email, 'user'), '@', 1)
        )
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- Backfill profiles for users that predate this migration.
insert into public.profiles (id, display_name)
select
    u.id,
    coalesce(
        nullif(trim(
            coalesce(u.raw_user_meta_data ->> 'full_name', '')
        ), ''),
        split_part(coalesce(u.email, 'user'), '@', 1)
    )
from auth.users u
where not exists (
    select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;


-- =========================================================
-- 7. ROW-LEVEL SECURITY
-- =========================================================

alter table public.tasks            enable row level security;
alter table public.notifications    enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.workflows        enable row level security;
alter table public.workflow_runs    enable row level security;
alter table public.profiles         enable row level security;

-- Known security baseline: drop any pre-existing policies on
-- these tables, then create ownership-only policies.
do $$
declare
    pol record;
begin
    for pol in
        select policyname, tablename
        from pg_policies
        where schemaname = 'public'
          and tablename in (
            'tasks', 'notifications', 'ai_conversations',
            'audit_logs', 'workflows', 'workflow_runs', 'profiles'
          )
    loop
        execute format(
            'drop policy %I on public.%I',
            pol.policyname,
            pol.tablename
        );
    end loop;
end;
$$;


-- tasks: owner-only
create policy atlas_tasks_select_own
    on public.tasks for select
    to authenticated
    using (created_by = auth.uid());

create policy atlas_tasks_insert_own
    on public.tasks for insert
    to authenticated
    with check (created_by = auth.uid());

create policy atlas_tasks_update_own
    on public.tasks for update
    to authenticated
    using (created_by = auth.uid())
    with check (created_by = auth.uid());

create policy atlas_tasks_delete_own
    on public.tasks for delete
    to authenticated
    using (created_by = auth.uid());


-- notifications: owner-only
create policy atlas_notifications_select_own
    on public.notifications for select
    to authenticated
    using (user_id = auth.uid());

create policy atlas_notifications_insert_own
    on public.notifications for insert
    to authenticated
    with check (user_id = auth.uid());

create policy atlas_notifications_update_own
    on public.notifications for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy atlas_notifications_delete_own
    on public.notifications for delete
    to authenticated
    using (user_id = auth.uid());


-- ai_conversations: owner-only
create policy atlas_ai_conversations_select_own
    on public.ai_conversations for select
    to authenticated
    using (user_id = auth.uid());

create policy atlas_ai_conversations_insert_own
    on public.ai_conversations for insert
    to authenticated
    with check (user_id = auth.uid());

create policy atlas_ai_conversations_delete_own
    on public.ai_conversations for delete
    to authenticated
    using (user_id = auth.uid());


-- audit_logs: owner-only
create policy atlas_audit_logs_select_own
    on public.audit_logs for select
    to authenticated
    using (user_id = auth.uid());

create policy atlas_audit_logs_insert_own
    on public.audit_logs for insert
    to authenticated
    with check (user_id = auth.uid());


-- workflows: owner-only
create policy atlas_workflows_select_own
    on public.workflows for select
    to authenticated
    using (created_by = auth.uid());

create policy atlas_workflows_insert_own
    on public.workflows for insert
    to authenticated
    with check (created_by = auth.uid());

create policy atlas_workflows_update_own
    on public.workflows for update
    to authenticated
    using (created_by = auth.uid())
    with check (created_by = auth.uid());

create policy atlas_workflows_delete_own
    on public.workflows for delete
    to authenticated
    using (created_by = auth.uid());


-- workflow_runs: owner-only
create policy atlas_workflow_runs_select_own
    on public.workflow_runs for select
    to authenticated
    using (created_by = auth.uid());

create policy atlas_workflow_runs_insert_own
    on public.workflow_runs for insert
    to authenticated
    with check (created_by = auth.uid());


-- profiles: directory is readable by any signed-in user;
-- owners write only their own row.
create policy atlas_profiles_select_all_authenticated
    on public.profiles for select
    to authenticated
    using (true);

create policy atlas_profiles_update_own
    on public.profiles for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());


-- =========================================================
-- 8. TASK PROJECT-OWNERSHIP GUARD
-- =========================================================
--
-- tasks.project_id must reference a project the task creator
-- owns. RLS on tasks alone would not verify the referenced
-- project, so this trigger closes the gap.

create or replace function public.assert_task_project_owned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.project_id is not null then
        if not exists (
            select 1
            from public.projects p
            where p.id = new.project_id
              and p.created_by = auth.uid()
        ) then
            raise exception 'project does not belong to the current user'
                using errcode = '42501';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists tasks_project_owned on public.tasks;
create trigger tasks_project_owned
    before insert or update of project_id on public.tasks
    for each row
    execute function public.assert_task_project_owned();


commit;
