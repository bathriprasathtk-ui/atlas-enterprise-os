/* =========================================================
   TRANSACTIONAL EMAIL — SERVER ENTRY POINT

   Invitation emails are delivered through Knock (product
   messaging: you connect the actual email provider —
   SendGrid/Postmark/etc. — inside the Knock dashboard).

   The module degrades honestly and never fakes a send:
   - no KNOCK_API_KEY          → status "not_configured"
   - provider/workflow error   → status "failed" + message
   - accepted by Knock         → status "sent"

   Import this only from route handlers (it must never be
   pulled into the browser bundle).
========================================================= */

import { Knock } from "@knocklabs/node";

export type MailResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

/**
 * Workflow key that must exist in the Knock dashboard. Its
 * email channel resolves the recipient from the recipient id
 * (the invited address) — invitees have no Atlas account yet.
 */
const INVITE_WORKFLOW = "org_invitation";

let client: Knock | null | undefined;

function getClient(): Knock | null {
  if (client === undefined) {
    const apiKey = process.env.KNOCK_API_KEY;
    client = apiKey ? new Knock({ apiKey }) : null;
  }

  return client;
}

/** Clears the cached client (test hook). */
export function resetMailClient(): void {
  client = undefined;
}

/** True when an email provider key is configured. */
export function isMailConfigured(): boolean {
  return getClient() !== null;
}

export async function sendInvitationEmail(input: {
  to: string;
  organizationName: string;
  invitedByName: string;
}): Promise<MailResult> {
  const knock = getClient();

  if (!knock) {
    return { status: "not_configured" };
  }

  try {
    await knock.workflows.trigger(INVITE_WORKFLOW, {
      recipients: [input.to],
      data: {
        email: input.to,
        organization_name: input.organizationName,
        invited_by_name: input.invitedByName,
        /* Matches org_invitations.expires_at (migration 0008). */
        expires_in_days: 7,
      },
    });

    return { status: "sent" };
  } catch (error) {
    console.error("Invitation email failed:", error);

    return {
      status: "failed",
      error:
        error instanceof Error
          ? error.message
          : "The email provider rejected the message.",
    };
  }
}
