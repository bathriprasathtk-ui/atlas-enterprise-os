/* =========================================================
   AUDIT LOGS — SERVER ENTRY POINT

   Import this from route handlers. It deliberately has no
   dependency on the browser Supabase client, so importing
   it during `next build` never executes browser-only code.

   logAudit(): call from route handlers that already
   authenticated the user. Audit failures never break the
   main operation, and never log content or PII.

   The client data layer (logAuditClient, getRecentActivity)
   lives in ./audit.ts and must NOT be imported server-side.
========================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type LogAuditInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Writes one audit row for the authenticated user carried by
 * the server client's JWT. Never throws.
 */
export async function logAudit(
  serverSupabase: SupabaseClient,
  input: LogAuditInput
): Promise<void> {
  try {
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data: orgId } = await serverSupabase.rpc(
      "current_org_id"
    );

    if (!orgId) {
      return;
    }

    await serverSupabase.from("audit_logs").insert({
      user_id: user.id,
      organization_id: orgId as string,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    /* Auditing must never break the user's operation. */
  }
}
