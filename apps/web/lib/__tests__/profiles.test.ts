/* =========================================================
   UNIT TESTS — profile validation

   Stubs env before the dynamic import of the profiles
   module (the Supabase browser client is never used).
   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL ??=
  "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??=
  "test-key";

let validateProfileInput: (input: {
  display_name: string;
}) => string | null;

before(async () => {
  const mod = await import("../profiles.ts");
  validateProfileInput = mod.validateProfileInput;
});

describe("validateProfileInput", () => {
  it("requires a display name", () => {
    assert.ok(validateProfileInput({ display_name: "" }));
  });

  it("rejects a whitespace-only display name", () => {
    assert.ok(validateProfileInput({ display_name: "  " }));
  });

  it("rejects a name over 120 characters", () => {
    assert.ok(
      validateProfileInput({ display_name: "a".repeat(121) })
    );
  });

  it("accepts a 120-character name", () => {
    assert.equal(
      validateProfileInput({ display_name: "a".repeat(120) }),
      null
    );
  });

  it("accepts a normal name", () => {
    assert.equal(
      validateProfileInput({ display_name: "Ada Lovelace" }),
      null
    );
  });
});
