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

import { isMfaPending } from "@/lib/mfa";
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

  if (error || !user) {
    return { supabase, user: null };
  }

  /*
   * Second-factor enforcement (defense in depth): a user who
   * has enrolled TOTP must reach AAL2 through the login
   * challenge before calling protected APIs. Supabase does
   * not enforce this for us, so an AAL1 session that still
   * needs its factor is treated as unauthenticated — routes
   * already answer 401 when `user` is null, and the client
   * lands on /login where the challenge prompt appears.
   *
   * A null result (AAL could not be read from an otherwise
   * valid session) does not deny: identity was just proven
   * by getUser(), and failing open here would 401 every
   * request on a transient parse error. Only a definite
   * "pending" answer blocks.
   */
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (isMfaPending(aal)) {
    return { supabase, user: null };
  }

  return { supabase, user };
}
