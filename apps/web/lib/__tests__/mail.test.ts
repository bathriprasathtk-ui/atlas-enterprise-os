/* =========================================================
   UNIT TESTS — invitation email module

   Verifies the honest degradation contract: with no
   provider key configured the module reports
   "not_configured" and performs no network call.
   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

let isMailConfigured: () => boolean;
let resetMailClient: () => void;
let sendInvitationEmail: (input: {
  to: string;
  organizationName: string;
  invitedByName: string;
}) => Promise<
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; error: string }
>;

before(async () => {
  delete process.env.KNOCK_API_KEY;

  const mod = await import("../mail.ts");

  isMailConfigured = mod.isMailConfigured;
  resetMailClient = mod.resetMailClient;
  sendInvitationEmail = mod.sendInvitationEmail;
  mod.resetMailClient();
});

describe("mail module", () => {
  it("reports not configured without an API key", () => {
    resetMailClient();
    assert.equal(isMailConfigured(), false);
  });

  it("returns not_configured instead of pretending to send", async () => {
    resetMailClient();

    const result = await sendInvitationEmail({
      to: "teammate@company.com",
      organizationName: "Acme Inc.",
      invitedByName: "Alice Owner",
    });

    assert.equal(result.status, "not_configured");
  });
});
