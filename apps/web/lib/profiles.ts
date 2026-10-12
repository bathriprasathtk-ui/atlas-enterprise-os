/* =========================================================
   PROFILES (employee directory)

   Any signed-in user can view the directory (name +
   designation only — RLS on profiles). Users can update
   only their own row.
========================================================= */

import { supabase } from "./supabaseClient.ts";

export type Profile = {
  id: string;
  display_name: string;
  designation: string | null;
  created_at: string;
};

export async function getProfiles(): Promise<Profile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, designation, created_at")
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function validateProfileInput(input: {
  display_name: string;
}): string | null {
  const name = input.display_name.trim();

  if (!name) {
    return "A display name is required.";
  }

  if (name.length > 120) {
    return "The display name must be 120 characters or fewer.";
  }

  return null;
}

/**
 * Loads the signed-in user's own profile row, or null when
 * signed out / not yet backfilled.
 */
export async function getOwnProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, designation, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function updateOwnProfile(input: {
  display_name: string;
  designation?: string | null;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const validation = validateProfileInput(input);

  if (validation) {
    throw new Error(validation);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.display_name.trim(),
      designation: input.designation?.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}
