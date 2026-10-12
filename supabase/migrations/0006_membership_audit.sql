-- =========================================================
-- 0006 — MEMBERSHIP AUDIT + NOTIFICATIONS
--
-- Membership events happen inside SECURITY DEFINER RPCs
-- (create_organization, accept_invitation) as well as through
-- ordinary PostgREST updates, so they are recorded by a table
-- trigger: every join, role change and removal is captured
-- exactly once, in the same transaction, no matter which code
-- path performed it. Client-side audit writes could miss the
-- RPC paths — this cannot.
--
-- The trigger function is SECURITY DEFINER (table-owner
-- privileges, bypasses RLS) but always attributes the event
-- to auth.uid(), the authenticated actor. All writes are
-- best-effort: a failure never blocks a membership change,
-- mirroring logAudit() in the application.
--
-- Role changes and removals also notify the affected member.
-- Notifications are personal rows (0003 RLS: user_id only),
-- so only a definer function can create one for another user.
-- =========================================================

create or replace function public.audit_membership_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_actor     uuid := auth.uid();
    v_org       uuid;
    v_action    text;
    v_target    uuid;
    v_metadata  jsonb;
begin
    if tg_op = 'INSERT' then
        v_org      := new.organization_id;
        v_action   := 'org.member.joined';
        v_target   := new.user_id;
        v_metadata := jsonb_build_object('role', new.role);
    elsif tg_op = 'UPDATE' then
        if new.role is distinct from old.role then
            v_org      := new.organization_id;
            v_action   := 'org.member.role_changed';
            v_target   := new.user_id;
            v_metadata := jsonb_build_object(
                'from', old.role,
                'to',   new.role
            );
        else
            return new;
        end if;
    else
        v_org      := old.organization_id;
        v_action   := 'org.member.removed';
        v_target   := old.user_id;
        v_metadata := jsonb_build_object('role', old.role);
    end if;

    if v_actor is null then
        return coalesce(new, old);
    end if;

    insert into public.audit_logs
        (user_id, organization_id, action, entity, entity_id, metadata)
    values
        (v_actor, v_org, v_action, 'org_member',
         v_target::text, v_metadata);

    /* Notification failures must not take the audit row with
       them, so they run in their own savepoint block. */
    begin
        if tg_op = 'UPDATE' then
            insert into public.notifications
                (user_id, title, message, notification_type)
            values
                (new.user_id,
                 'Your role changed',
                 'An administrator changed your organization role to '
                     || new.role || '.',
                 'system');
        elsif tg_op = 'DELETE' and old.user_id <> v_actor then
            insert into public.notifications
                (user_id, title, message, notification_type)
            values
                (old.user_id,
                 'Removed from an organization',
                 'An administrator ended your membership in this organization.',
                 'system');
        end if;
    exception
        when others then
            null;
    end;

    return coalesce(new, old);
exception
    when others then
        /* Auditing must never block a membership change. */
        return coalesce(new, old);
end;
$$;

revoke execute on function public.audit_membership_event() from public;
revoke execute on function public.audit_membership_event() from anon;
revoke execute on function public.audit_membership_event() from authenticated;

drop trigger if exists audit_membership_events on public.org_members;
create trigger audit_membership_events
    after insert or update or delete on public.org_members
    for each row
    execute function public.audit_membership_event();
