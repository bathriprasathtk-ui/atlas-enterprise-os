/* =========================================================
   ROUTE HANDLER AUTHENTICATION

   Small helper for API route handlers: returns the cookie-
   session Supabase client plus the authenticated user, or
   user: null when the request is unauthenticated.
========================================================= */

import type {
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabaseServer";

export async function getRouteAuth(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: error ? null : user,
  };
}
