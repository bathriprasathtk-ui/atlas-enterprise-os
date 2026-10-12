/* =========================================================
   WORKFLOWS (client data layer)

   Owner-only via RLS (created_by = auth.uid()) plus explicit
   user scoping. Execution happens server-side through
   POST /api/workflows/run — the runner records honest
   success/failure results.
========================================================= */

import { logAuditClient } from "./audit.ts";
import {
  getCurrentOrgId,
  requireOrgId,
} from "./orgContext.ts";
import { supabase } from "./supabaseClient.ts";

export type WorkflowKind =
  | "task_reminder"
  | "document_digest";

export type WorkflowStatus = "active" | "paused";

export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  kind: WorkflowKind;
  config: Record<string, unknown>;
  status: WorkflowStatus;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  status: "success" | "failed";
  message: string;
  started_at: string;
  finished_at: string | null;
};

export type WorkflowKindConfig = {
  days?: number;
};

import { validateWorkflow } from "./workflowValidation.ts";

export { validateWorkflow };


async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function getWorkflows(): Promise<Workflow[]> {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return [];
  }

  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export type CreateWorkflowInput = {
  name: string;
  description?: string;
  kind: WorkflowKind;
  config?: WorkflowKindConfig;
};

export async function createWorkflow(
  input: CreateWorkflowInput
): Promise<Workflow> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be signed in.");
  }

  const orgId = await requireOrgId();

  const name = input.name.trim();

  if (!name || name.length > 120) {
    throw new Error(
      "Give the workflow a name of 120 characters or fewer."
    );
  }

  const config = {
    days: input.config?.days ?? 7,
  };

  const validation = validateWorkflow(input.kind, config);

  if (validation) {
    throw new Error(validation);
  }

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      organization_id: orgId,
      name,
      description: input.description?.trim() || null,
      kind: input.kind,
      config,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "workflow.create",
    entity: "workflow",
    entityId: data.id,
  });

  return data as Workflow;
}

export async function setWorkflowStatus(
  id: string,
  status: WorkflowStatus
): Promise<void> {
  const orgId = await requireOrgId();

  const { error } = await supabase
    .from("workflows")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "workflow.update",
    entity: "workflow",
    entityId: id,
    metadata: { status },
  });
}

export async function deleteWorkflow(id: string): Promise<void> {
  const orgId = await requireOrgId();

  const { data: deleted, error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  /* A 0-row delete means RLS denied it (creator-or-admin). */
  if (!deleted || deleted.length === 0) {
    throw new Error(
      "Only the creator or an organization administrator can delete this workflow."
    );
  }

  await logAuditClient({
    action: "workflow.delete",
    entity: "workflow",
    entityId: id,
  });
}

/**
 * Executes a workflow server-side. Returns the recorded run
 * (success OR failure — the runner never fabricates success).
 */
export async function runWorkflow(
  id: string
): Promise<{ status: "success" | "failed"; message: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to run a workflow.");
  }

  /* Cookie session is sent automatically on same-origin fetch. */
  const response = await fetch(
    `/api/workflows/run?workflowId=${encodeURIComponent(id)}`,
    { method: "POST" }
  );

  const payload = (await response.json().catch(() => ({}))) as {
    status?: "success" | "failed";
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error ?? "The workflow could not be run."
    );
  }

  return {
    status: payload.status ?? "failed",
    message: payload.message ?? "No result was recorded.",
  };
}

export async function listWorkflowRuns(
  workflowId?: string,
  limit = 10
): Promise<WorkflowRun[]> {
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    return [];
  }

  let query = supabase
    .from("workflow_runs")
    .select("*")
    .eq("organization_id", orgId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (workflowId) {
    query = query.eq("workflow_id", workflowId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
