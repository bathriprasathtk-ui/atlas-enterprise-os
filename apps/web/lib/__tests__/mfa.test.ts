/* =========================================================
   UNIT TESTS — MFA sign-in decision helpers

   Pure logic: no Supabase client is ever constructed (the
   shared client in supabaseClient.ts is created lazily on
   first property access, which these tests never touch).
   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isMfaPending,
  selectVerifiedTotpFactor,
  type TotpFactor,
} from "../mfa.ts";

describe("isMfaPending", () => {
  it("blocks a password-only session when a factor is enrolled", () => {
    assert.equal(
      isMfaPending({ currentLevel: "aal1", nextLevel: "aal2" }),
      true
    );
  });

  it("allows a session that already completed the challenge", () => {
    assert.equal(
      isMfaPending({ currentLevel: "aal2", nextLevel: "aal2" }),
      false
    );
  });

  it("allows a user with no enrolled factor", () => {
    assert.equal(
      isMfaPending({ currentLevel: "aal1", nextLevel: "aal1" }),
      false
    );
  });

  it("allows when no session could be read (null)", () => {
    assert.equal(isMfaPending(null), false);
  });
});

describe("selectVerifiedTotpFactor", () => {
  const verified: TotpFactor = {
    id: "factor-verified",
    friendlyName: "Authenticator app",
    status: "verified",
  };

  const pending: TotpFactor = {
    id: "factor-pending",
    friendlyName: "Second phone",
    status: "unverified",
  };

  it("picks the verified factor when present", () => {
    assert.deepEqual(
      selectVerifiedTotpFactor([pending, verified]),
      verified
    );
  });

  it("never challenges an unverified (abandoned) factor", () => {
    assert.equal(selectVerifiedTotpFactor([pending]), null);
  });

  it("returns null when no factor exists", () => {
    assert.equal(selectVerifiedTotpFactor([]), null);
  });
});
