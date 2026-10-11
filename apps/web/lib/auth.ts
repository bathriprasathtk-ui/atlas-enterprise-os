import { supabase } from "./supabaseClient";

export async function signIn(
  email: string,
  password: string
) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/* =========================================================
   CURRENT USER IDENTITY
   (used by the Topbar and Dashboard header)
========================================================= */

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  initials: string;
};

/**
 * Resolves the authenticated user's display identity,
 * or null when signed out.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const email = user.email ?? "";

  const metadata = (user.user_metadata ?? {}) as Record<
    string,
    unknown
  >;

  const metadataName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : "";

  const displayName =
    metadataName.trim() ||
    email.split("@")[0] ||
    "User";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return {
    id: user.id,
    email,
    displayName,
    initials,
  };
}
