/* =========================================================
   MULTI-FACTORS AUTHENTICATION (client data layer)

   Real supabase-js MFA APIs (TOTP). Enrolling stores a
   factor on the user's Supabase account; verifying promotes
   the session to AAL2. Requiring the second factor at
   sign-in is a Supabase dashboard setting — this module
   never claims enforcement the app does not perform.
========================================================= */

import { supabase } from "./supabaseClient.ts";

export type TotpFactor = {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
};

export type TotpEnrollment = {
  factorId: string;
  secret: string;
  uri: string;
};

/** TOTP factors (verified and pending) for the signed-in user. */
export async function listTotpFactors(): Promise<TotpFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.totp ?? []).map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? null,
    status: factor.status as TotpFactor["status"],
  }));
}

/** Starts enrollment; returns the secret to add to an
 *  authenticator app. The factor stays `unverified` until
 *  verifyTotp() confirms a real code. */
export async function enrollTotp(
  friendlyName = "Authenticator app"
): Promise<TotpEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.totp?.secret || !data.totp.uri) {
    throw new Error(
      "Supabase did not return a TOTP secret. Check that MFA is enabled for this project."
    );
  }

  return {
    factorId: data.id,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Confirms the factor with a real 6-digit code. */
export async function verifyTotp(
  factorId: string,
  code: string
): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Removes a factor (verified or pending). */
export async function disableTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({
    factorId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
