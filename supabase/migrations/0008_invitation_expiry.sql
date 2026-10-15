/* =========================================================
   0008 — INVITATION EXPIRY

   Pending invitations previously never expired: a leaked
   invite email was a permanent join token for an
   organization. Every invitation now expires 7 days after
   it was created (or last re-issued), and an expired
   invitation can neither be listed to the invitee nor
   accepted. Existing pending rows receive a fresh 7-day
   window from the moment this migration runs.

   Changes:
     1. org_invitations.expires_at (default now() + 7 days)
     2. invite_member()    — stamps and refreshes expires_at;
                             re-inviting the same address
                             restarts the 7-day window
     3. my_invitations()   — hides expired invitations
     4. accept_invitation()— rejects expired invitations with
                             a distinct, honest error

   Idempotent: safe to re-run (add column if not exists,
   create or replace functions).
========================================================= */

alter table public.org_invitations
    add column if not exists expires_at timestamptz
    not null
    default (now() + interval '7 days');


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
        (organization_id, email, role, invited_by, expires_at)
    values
        (v_org, v_email, p_role, v_user, now() + interval '7 days')
    on conflict (organization_id, email)
    do update set role = excluded.role,
                  /* re-inviting restarts the window */
                  expires_at = excluded.expires_at;

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
      and i.expires_at > now()
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

    if v_inv.expires_at <= now() then
        raise exception 'invitation has expired' using errcode = '42501';
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
