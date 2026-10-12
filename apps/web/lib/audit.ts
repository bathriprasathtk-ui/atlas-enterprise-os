/* =========================================================
   AUDIT LOGS (client data layer)

   - logAuditClient(): browser mutations — inserts with the
     signed-in user's own JWT (RLS: user_id = auth.uid()).
     Never throws.
   - getRecentActivity(): own activity feed (RLS-scoped).

   SERVER-ONLY logAudit() lives in ./auditServer.ts — route
   handlers must import it from there so this module's
   browser Supabase client is never executed at build time.
========================================================= */

import type { AuditEntry, LogAuditInput } from "./auditServer.ts";
import { getCurrentOrgId } from "./orgContext.ts";
import { supabase } from "./supabaseClient.ts";

export type { AuditEntry } from "./auditServer.ts";

export async function logAuditClient(
  input: LogAuditInput
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const orgId = await getCurrentOrgId();

    if (!orgId) {
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      organization_id: orgId,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    /* Auditing must never break the user's operation. */
  }
}

export async function getRecentActivity(
  limit = 8
): Promise<AuditEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return data ?? [];
}
