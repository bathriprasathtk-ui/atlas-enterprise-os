/* =========================================================
   POST /api/workflows/run?workflowId=...

   Executes one of the user's workflows for real:
   - task_reminder: lists open tasks due within N days
   - document_digest: summarizes recent document activity

   Every run (success or failure) is recorded in
   workflow_runs. Nothing is simulated — if the underlying
   data cannot be read, the run is recorded as failed.
========================================================= */

import { NextResponse } from "next/server";

import { logAudit } from "@/lib/auditServer";
import { getRouteAuth } from "@/lib/routeAuth";
import { validateWorkflow } from "@/lib/workflowValidation";

/* Execution guard: bail out if a step takes too long. */
const RUN_TIMEOUT_MS = 20_000;

type WorkflowRow = {
  id: string;
  name: string;
  kind: string;
  config: Record<string, unknown> | null;
  status: string;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getRouteAuth();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to run a workflow." },
        { status: 401 }
      );
    }

    const workflowId = new URL(request.url).searchParams.get(
      "workflowId"
    );

    if (!workflowId) {
      return NextResponse.json(
        { error: "A workflowId query parameter is required." },
        { status: 400 }
      );
    }

    /* Load the workflow — explicit owner scoping + RLS. */
    const { data: workflow, error: workflowError } =
      await supabase
        .from("workflows")
        .select("id, name, kind, config, status")
        .eq("id", workflowId)
        .eq("created_by", user.id)
        .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found." },
        { status: 404 }
      );
    }

    const row = workflow as WorkflowRow;

    if (row.status !== "active") {
      return NextResponse.json(
        {
          status: "failed",
          message:
            "This workflow is paused. Activate it before running.",
        },
        { status: 409 }
      );
    }

    const config = (row.config ?? {}) as Record<string, unknown>;
    const validation = validateWorkflow(row.kind, config);

    if (validation) {
      return NextResponse.json(
        { status: "failed", message: validation },
        { status: 400 }
      );
    }

    const startedAt = new Date().toISOString();
    const deadline = Date.now() + RUN_TIMEOUT_MS;

    /* How many actionable items the run surfaced — used to
       decide whether a notification is worth creating. */
    let actionableCount = 0;

    /* =======================================================
       EXECUTE THE WORKFLOW FOR REAL
       ======================================================= */

    let status: "success" | "failed" = "success";
    let message = "";

    try {
      if (row.kind === "task_reminder") {
        const days =
          typeof config.days === "number" ? config.days : 7;

        const until = new Date();
        until.setDate(until.getDate() + days);
        const untilString = until.toISOString().slice(0, 10);

        if (Date.now() > deadline) {
          throw new Error("Workflow execution timed out.");
        }

        const { data: tasks, error: tasksError } =
          await supabase
            .from("tasks")
            .select("id, title, due_date, status, priority")
            .eq("created_by", user.id)
            .neq("status", "done")
            .not("due_date", "is", null)
            .lte("due_date", untilString)
            .order("due_date", { ascending: true });

        if (tasksError) {
          throw new Error(tasksError.message);
        }

        const count = tasks?.length ?? 0;
        actionableCount = count;

        message =
          count === 0
            ? `No open tasks are due in the next ${days} day${days === 1 ? "" : "s"}.`
            : `${count} task${count === 1 ? " is" : "s are"} due in the next ${days} day${days === 1 ? "" : "s"}: ${(tasks ?? [])
                .slice(0, 5)
                .map((task) => task.title)
                .join(", ")}${count > 5 ? "…" : ""}`;
      } else if (row.kind === "document_digest") {
        const days =
          typeof config.days === "number" ? config.days : 7;

        const since = new Date();
        since.setDate(since.getDate() - days);

        if (Date.now() > deadline) {
          throw new Error("Workflow execution timed out.");
        }

        const { data: documents, error: documentsError } =
          await supabase
            .from("documents")
            .select("id, title, created_at")
            .eq("uploaded_by", user.id)
            .gte("created_at", since.toISOString())
            .order("created_at", { ascending: false });

        if (documentsError) {
          throw new Error(documentsError.message);
        }

        const count = documents?.length ?? 0;
        actionableCount = count;

        message =
          count === 0
            ? `No documents were uploaded in the last ${days} day${days === 1 ? "" : "s"}.`
            : `${count} document${count === 1 ? "" : "s"} uploaded in the last ${days} day${days === 1 ? "" : "s"}: ${(documents ?? [])
                .slice(0, 5)
                .map((document) => document.title)
                .join(", ")}${count > 5 ? "…" : ""}`;
      } else {
        status = "failed";
        message = `Unknown workflow type: ${row.kind}`;
      }
    } catch (error) {
      status = "failed";
      message =
        error instanceof Error
          ? error.message
          : "The workflow failed to execute.";
    }

    const finishedAt = new Date().toISOString();

    /* =======================================================
       RECORD THE RUN + UPDATE LAST_RUN_AT (best-effort)
       ======================================================= */

    try {
      await supabase.from("workflow_runs").insert({
        workflow_id: row.id,
        created_by: user.id,
        status,
        message,
        started_at: startedAt,
        finished_at: finishedAt,
      });

      await supabase
        .from("workflows")
        .update({ last_run_at: finishedAt })
        .eq("id", row.id)
        .eq("created_by", user.id);

      /* Audit trail for the dashboard activity feed. */
      await logAudit(supabase, {
        action: "workflow.run",
        entity: "workflow",
        entityId: row.id,
        metadata: { status, kind: row.kind },
      });

      /*
       * Real notification: only when the run actually
       * surfaced something that needs attention.
       */
      if (status === "success" && actionableCount > 0) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title:
            row.kind === "task_reminder"
              ? "Tasks due soon"
              : "New documents",
          message,
          notification_type:
            row.kind === "task_reminder" ? "task" : "document",
        });
      }
    } catch (error) {
      console.error(
        "Failed to record workflow run:",
        error
      );
    }

    return NextResponse.json(
      { status, message },
      { status: status === "success" ? 200 : 500 }
    );
  } catch (error) {
    console.error("Workflow run error:", error);

    return NextResponse.json(
      {
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "The workflow could not be run.",
      },
      { status: 500 }
    );
  }
}
