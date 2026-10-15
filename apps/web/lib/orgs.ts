/* =========================================================
   ORGANIZATIONS, MEMBERS, DEPARTMENTS, INVITATIONS
   (client data layer)

   Membership mutations go through SECURITY DEFINER RPCs
   (migration 0005); roster/department reads are plain RLS
   queries. Everything is scoped by RLS to the caller's
   organization.
========================================================= */

import { logAuditClient } from "./audit.ts";
import { getCurrentOrg, invalidateOrgCache } from "./orgContext.ts";
import { supabase } from "./supabaseClient.ts";

export type OrgRole = "owner" | "admin" | "member";

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export type OrgMember = {
  user_id: string;
  role: OrgRole;
  created_at: string;
  display_name: string;
  designation: string | null;
  department_id: string | null;
  email_notifications?: boolean;
};

export type Department = {
  id: string;
  name: string;
};

export type Invitation = {
  id: string;
  organization_id: string;
  organization_name: string;
  role: OrgRole;
  invited_by_name: string;
  created_at: string;
};

/** Pending invitation as seen by an org's administrators. */
export type OrgInvitation = {
  id: string;
  email: string;
  role: OrgRole;
  created_at: string;
  /** Invitations expire 7 days after issue (0008). */
  expires_at: string;
};

/* =========================================================
   ORGANIZATION
========================================================= */

export async function getMyOrganization(): Promise<Organization | null> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    return null;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", snapshot.orgId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Organization) ?? null;
}

export async function createOrganization(
  name: string
): Promise<string> {
  const trimmed = name.trim();

  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new Error(
      "The organization name must be 1-120 characters."
    );
  }

  const { data, error } = await supabase.rpc(
    "create_organization",
    { p_name: trimmed }
  );

  if (error) {
    throw new Error(error.message);
  }

  invalidateOrgCache();

  await logAuditClient({
    action: "org.create",
    entity: "organization",
    entityId: data as string,
    metadata: { name: trimmed },
  });

  return data as string;
}

export async function renameOrganization(name: string): Promise<void> {
  const snapshot = await getCurrentOrg();
  const trimmed = name.trim();

  if (!snapshot?.orgId) {
    throw new Error("You need an organization first.");
  }

  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new Error(
      "The organization name must be 1-120 characters."
    );
  }

  const { error } = await supabase
    .from("organizations")
    .update({ name: trimmed })
    .eq("id", snapshot.orgId);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "org.rename",
    entity: "organization",
    entityId: snapshot.orgId,
    metadata: { name: trimmed },
  });
}

/* =========================================================
   MEMBERS
========================================================= */

export async function getMembers(): Promise<OrgMember[]> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    return [];
  }

  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, role, created_at")
    .eq("organization_id", snapshot.orgId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as {
    user_id: string;
    role: OrgRole;
    created_at: string;
  }[];

  if (rows.length === 0) {
    return [];
  }

  /* org_members.user_id references auth.users, so profiles
     are fetched in a second RLS-scoped query. */
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, designation, department_id")
    .in(
      "id",
      rows.map((row) => row.user_id)
    );

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const byId = new Map(
    ((profiles ?? []) as {
      id: string;
      display_name: string;
      designation: string | null;
      department_id: string | null;
    }[]).map((profile) => [profile.id, profile])
  );

  return rows.map((row) => {
    const profile = byId.get(row.user_id);

    return {
      user_id: row.user_id,
      role: row.role,
      created_at: row.created_at,
      display_name: profile?.display_name ?? "Member",
      designation: profile?.designation ?? null,
      department_id: profile?.department_id ?? null,
    };
  });
}

/** Display names for a set of same-org user ids. */
export async function getProfileNames(
  userIds: string[]
): Promise<Record<string, string>> {
  if (userIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (error) {
    return {};
  }

  const names: Record<string, string> = {};

  for (const row of (data ?? []) as {
    id: string;
    display_name: string;
  }[]) {
    names[row.id] = row.display_name;
  }

  return names;
}

export async function inviteMember(
  email: string,
  role: "admin" | "member" = "member"
): Promise<void> {
  const { error } = await supabase.rpc("invite_member", {
    p_email: email.trim(),
    p_role: role,
  });

  if (error) {
    throw new Error(error.message);
  }

  /* The invited address is the point of the event; audit
     metadata is org-internal and admin-visible only. */
  await logAuditClient({
    action: "org.invite",
    entity: "org_invitation",
    metadata: { email: email.trim().toLowerCase(), role },
  });
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await supabase
    .from("org_invitations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "org.invite.revoke",
    entity: "org_invitation",
    entityId: id,
  });
}

/** Pending invitations for the caller's organization
 *  (administrators only — RLS enforces that). */
export async function getOrgInvitations(): Promise<
  OrgInvitation[]
> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    return [];
  }

  const { data, error } = await supabase
    .from("org_invitations")
    .select("id, email, role, created_at, expires_at")
    .eq("organization_id", snapshot.orgId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrgInvitation[];
}

export async function getMyInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase.rpc("my_invitations");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Invitation[];
}

export async function acceptInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc("accept_invitation", {
    p_id: id,
  });

  if (error) {
    throw new Error(error.message);
  }

  invalidateOrgCache();
}

export async function setMemberRole(
  userId: string,
  role: OrgRole
): Promise<void> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    throw new Error("You need an organization first.");
  }

  const { error } = await supabase
    .from("org_members")
    .update({ role })
    .eq("organization_id", snapshot.orgId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeMember(userId: string): Promise<void> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    throw new Error("You need an organization first.");
  }

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("organization_id", snapshot.orgId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

/** Removes the signed-in user's own membership (blocked by
 *  the database when they are the last owner). */
export async function leaveOrganization(): Promise<void> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    throw new Error("You need an organization first.");
  }

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("organization_id", snapshot.orgId)
    .eq("user_id", snapshot.userId);

  if (error) {
    throw new Error(error.message);
  }

  invalidateOrgCache();
}

/** Deletes the signed-in user's own (owner) organization. */
export async function deleteMyOrganization(): Promise<void> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    throw new Error("You need an organization first.");
  }

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", snapshot.orgId);

  if (error) {
    throw new Error(error.message);
  }

  invalidateOrgCache();
}

/* =========================================================
   DEPARTMENTS
========================================================= */

export async function getDepartments(): Promise<Department[]> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    return [];
  }

  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("organization_id", snapshot.orgId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Department[];
}

export async function createDepartment(name: string): Promise<void> {
  const snapshot = await getCurrentOrg();
  const trimmed = name.trim();

  if (!snapshot?.orgId) {
    throw new Error("You need an organization first.");
  }

  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new Error("The department name must be 1-80 characters.");
  }

  const { error } = await supabase.from("departments").insert({
    organization_id: snapshot.orgId,
    name: trimmed,
  });

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "department.create",
    entity: "department",
    metadata: { name: trimmed },
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "department.delete",
    entity: "department",
    entityId: id,
  });
}

/** Admin assigns a member's department (or clears it). */
export async function setMemberDepartment(
  userId: string,
  departmentId: string | null
): Promise<void> {
  const snapshot = await getCurrentOrg();

  if (!snapshot?.orgId) {
    throw new Error("You need an organization first.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ department_id: departmentId })
    .eq("id", userId)
    .eq("organization_id", snapshot.orgId);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "org.member.department_changed",
    entity: "org_member",
    entityId: userId,
    metadata: {
      departmentId: departmentId ?? "none",
    },
  });
}
