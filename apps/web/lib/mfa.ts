/* =========================================================
   MULTI-FACTOR AUTHENTICATION (client data layer)

   Real supabase-js MFA APIs (TOTP):
   - settings page: enroll / verify / disable factors;
   - sign-in: the login form calls pendingTotpFactorId()
     and challenges before entering the workspace;
   - middleware + getRouteAuth() reject an AAL1 session
     that still needs its second factor (app-level
     enforcement — Supabase does not challenge for us).

   Supabase Auth itself does NOT require the second factor
   at sign-in; the application does, at every layer it
   controls. Direct PostgREST access with an AAL1 JWT is
   the one layer this cannot cover — see the optional RLS
   hardening recipe in docs/DEPLOYMENT.md before enabling
   MFA for real users.
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

/**
 * True when a signed-in session has not completed a second
 * factor that its user has already enrolled: password alone
 * (AAL1) must not enter the workspace yet.
 */
export function isMfaPending(aal: {
  currentLevel: string | null;
  nextLevel: string | null;
} | null): boolean {
  return (
    aal !== null &&
    aal.currentLevel === "aal1" &&
    aal.nextLevel === "aal2"
  );
}

/** The verified TOTP factor to challenge, or null. */
export function selectVerifiedTotpFactor(
  factors: TotpFactor[]
): TotpFactor | null {
  return (
    factors.find((factor) => factor.status === "verified") ??
    null
  );
}

/**
 * Factor id to challenge for the CURRENT session, or null
 * when no second factor is pending (no session, already
 * AAL2, or no verified factor).
 */
export async function pendingTotpFactorId(): Promise<
  string | null
> {
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (!isMfaPending(aal)) {
    return null;
  }

  const factors = await listTotpFactors().catch(
    () => [] as TotpFactor[]
  );

  return selectVerifiedTotpFactor(factors)?.id ?? null;
}

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
