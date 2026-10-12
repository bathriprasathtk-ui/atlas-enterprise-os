"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  GitBranch,
  History,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  createWorkflow,
  deleteWorkflow,
  getWorkflows,
  listWorkflowRuns,
  runWorkflow,
  setWorkflowStatus,
  type Workflow,
  type WorkflowKind,
  type WorkflowRun,
} from "@/lib/workflows";
import { timeAgo } from "@/lib/format";

const KIND_META: Record<
  WorkflowKind,
  { label: string; description: string }
> = {
  task_reminder: {
    label: "Task reminder",
    description:
      "Lists open tasks due within the configured window.",
  },
  document_digest: {
    label: "Document digest",
    description:
      "Summarizes documents uploaded within the window.",
  },
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(
    null
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{
    name: string;
    status: "success" | "failed";
    message: string;
  } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formKind, setFormKind] =
    useState<WorkflowKind>("task_reminder");
  const [formDays, setFormDays] = useState(7);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [workflowRows, runRows] = await Promise.all([
        getWorkflows(),
        listWorkflowRuns(undefined, 10),
      ]);

      setWorkflows(workflowRows);
      setRuns(runRows);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Workflows could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(load);
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      const created = await createWorkflow({
        name: formName,
        description: formDescription || undefined,
        kind: formKind,
        config: { days: formDays },
      });

      setWorkflows((current) => [created, ...current]);
      setFormName("");
      setFormDescription("");
      setFormKind("task_reminder");
      setFormDays(7);
      setShowForm(false);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "The workflow could not be created."
      );
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleRun(workflow: Workflow) {
    setActionError(null);
    setRunResult(null);
    setBusyId(workflow.id);

    try {
      const result = await runWorkflow(workflow.id);

      setRunResult({ name: workflow.name, ...result });
      setRuns(await listWorkflowRuns(undefined, 10));
      setWorkflows((current) =>
        current.map((row) =>
          row.id === workflow.id
            ? {
                ...row,
                last_run_at: new Date().toISOString(),
              }
            : row
        )
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The workflow could not be run."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(workflow: Workflow) {
    setActionError(null);
    setBusyId(workflow.id);

    const next =
      workflow.status === "active" ? "paused" : "active";

    try {
      await setWorkflowStatus(workflow.id, next);
      setWorkflows((current) =>
        current.map((row) =>
          row.id === workflow.id
            ? { ...row, status: next }
            : row
        )
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The workflow could not be updated."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(workflow: Workflow) {
    const confirmed = window.confirm(
      `Delete "${workflow.name}"? Its run history will also be removed.`
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setBusyId(workflow.id);

    try {
      await deleteWorkflow(workflow.id);
      setWorkflows((current) =>
        current.filter((row) => row.id !== workflow.id)
      );
      setRuns((current) =>
        current.filter(
          (row) => row.workflow_id !== workflow.id
        )
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The workflow could not be deleted."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06]">
              <GitBranch
                size={19}
                className="text-cyan-400"
              />
            </div>

            <h1 className="text-2xl font-semibold text-white">
              Workflows
            </h1>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Automate repetitive processes. Every run executes
            real queries against your workspace and records an
            honest result.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-[#06101b] transition hover:bg-cyan-300"
        >
          <Plus size={17} />
          Create workflow
        </button>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-300"
        >
          {actionError}
        </div>
      ) : null}

      {runResult ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs ${
            runResult.status === "success"
              ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
              : "border-amber-400/20 bg-amber-400/[0.06] text-amber-300"
          }`}
        >
          <span className="font-semibold">
            {runResult.name} — {runResult.status}:
          </span>{" "}
          {runResult.message}
        </div>
      ) : null}

      {/* Workflow cards */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-10 text-xs text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          Loading workflows…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-6 text-center text-xs text-red-300"
        >
          {error}

          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 block w-full text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
          >
            Try again
          </button>
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
          <div>
            <p className="text-sm font-medium text-slate-300">
              No workflows yet
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Create a task reminder or document digest to get
              started.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {workflows.map((workflow) => {
            const meta =
              KIND_META[workflow.kind as WorkflowKind] ?? {
                label: workflow.kind,
                description: "",
              };

            return (
              <div
                key={workflow.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {workflow.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-600">
                      {workflow.description || meta.description}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      workflow.status === "active"
                        ? "bg-emerald-400/[0.07] text-emerald-400"
                        : "bg-amber-400/[0.07] text-amber-400"
                    }`}
                  >
                    {workflow.status}
                  </span>
                </div>

                <p className="mt-3 text-[11px] text-slate-600">
                  {meta.label} ·{" "}
                  {typeof workflow.config?.days === "number"
                    ? `${workflow.config.days}-day window`
                    : "default window"}
                </p>

                <p className="mt-1 text-[11px] text-slate-700">
                  Last run:{" "}
                  {workflow.last_run_at
                    ? timeAgo(workflow.last_run_at)
                    : "never"}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.05] pt-4">
                  <button
                    type="button"
                    onClick={() => void handleRun(workflow)}
                    disabled={busyId === workflow.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-2 text-[11px] font-semibold text-[#06101b] transition hover:bg-cyan-300 disabled:opacity-60"
                  >
                    {busyId === workflow.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} />
                    )}
                    Run now
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleToggle(workflow)}
                    disabled={busyId === workflow.id}
                    aria-label={
                      workflow.status === "active"
                        ? `Pause ${workflow.name}`
                        : `Activate ${workflow.name}`
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] text-slate-500 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                  >
                    {workflow.status === "active" ? (
                      <Pause size={13} />
                    ) : (
                      <Play size={13} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(workflow)}
                    disabled={busyId === workflow.id}
                    aria-label={`Delete ${workflow.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Runs history */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <History size={14} className="text-slate-500" />

          <h2 className="text-sm font-semibold text-white">
            Run History
          </h2>
        </div>

        {runs.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-600">
            No runs recorded yet. Run a workflow to see its
            result here.
          </p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5"
              >
                {run.status === "success" ? (
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />
                ) : (
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300">
                    {run.message}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-600">
                    {run.status} · {timeAgo(run.started_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create modal */}
      {showForm ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Create workflow"
        >
          <form
            onSubmit={(event) => void handleCreate(event)}
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0a0f1a] p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                New workflow
              </h3>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="workflow-name"
                  className="mb-1.5 block text-xs text-slate-500"
                >
                  Name
                </label>

                <input
                  id="workflow-name"
                  required
                  maxLength={120}
                  value={formName}
                  onChange={(event) =>
                    setFormName(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
                  placeholder="e.g. Weekly task reminder"
                />
              </div>

              <div>
                <label
                  htmlFor="workflow-description"
                  className="mb-1.5 block text-xs text-slate-500"
                >
                  Description{" "}
                  <span className="text-slate-700">(optional)</span>
                </label>

                <input
                  id="workflow-description"
                  value={formDescription}
                  onChange={(event) =>
                    setFormDescription(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
                  placeholder="What does this workflow do?"
                />
              </div>

              <div>
                <label
                  htmlFor="workflow-kind"
                  className="mb-1.5 block text-xs text-slate-500"
                >
                  Type
                </label>

                <select
                  id="workflow-kind"
                  value={formKind}
                  onChange={(event) =>
                    setFormKind(
                      event.target.value as WorkflowKind
                    )
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                >
                  <option
                    value="task_reminder"
                    className="bg-[#0a0f1a] text-slate-300"
                  >
                    Task reminder
                  </option>
                  <option
                    value="document_digest"
                    className="bg-[#0a0f1a] text-slate-300"
                  >
                    Document digest
                  </option>
                </select>

                <p className="mt-1.5 text-[11px] leading-4 text-slate-700">
                  {KIND_META[formKind].description}
                </p>
              </div>

              <div>
                <label
                  htmlFor="workflow-days"
                  className="mb-1.5 block text-xs text-slate-500"
                >
                  Window (days)
                </label>

                <input
                  id="workflow-days"
                  type="number"
                  min={1}
                  max={90}
                  value={formDays}
                  onChange={(event) =>
                    setFormDays(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                />
              </div>
            </div>

            {formError ? (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2.5 text-xs text-red-300"
              >
                {formError}
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={formSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-[#06101b] transition-colors hover:bg-cyan-300 disabled:opacity-60"
              >
                {formSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                Create
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
