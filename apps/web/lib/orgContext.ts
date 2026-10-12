/* =========================================================
   ORGANIZATION CONTEXT (client)

   Resolves the signed-in user's organization once and caches
   it for the session. Every data layer uses the cached id for
   explicit scoping (defense in depth on top of RLS).

   The cache is invalidated whenever membership changes
   (create/accept/leave organization).
========================================================= */

import { supabase } from "./supabaseClient.ts";

type OrgSnapshot = {
  userId: string;
  orgId: string | null;
  role: "owner" | "admin" | "member" | null;
};

let cache: OrgSnapshot | null = null;

export function invalidateOrgCache(): void {
  cache = null;
}

export async function getCurrentOrg(): Promise<OrgSnapshot | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    cache = null;
    return null;
  }

  if (cache && cache.userId === user.id) {
    return cache;
  }

  const { data, error } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  cache = {
    userId: user.id,
    orgId: data?.organization_id ?? null,
    role: (data?.role as OrgSnapshot["role"]) ?? null,
  };

  return cache;
}

/** Organization id, or null when the user has not joined one. */
export async function getCurrentOrgId(): Promise<string | null> {
  const snapshot = await getCurrentOrg();
  return snapshot?.orgId ?? null;
}

/**
 * Organization id for writes. Throws a user-facing message
 * when the user has no organization yet (the workspace layout
 * shows the onboarding gate before this point).
 */
export async function requireOrgId(): Promise<string> {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    throw new Error(
      "You need to join or create an organization first."
    );
  }

  return orgId;
}

/** True when the signed-in user is an owner or admin. */
export async function isOrgAdmin(): Promise<boolean> {
  const snapshot = await getCurrentOrg();
  return snapshot?.role === "owner" || snapshot?.role === "admin";
}
