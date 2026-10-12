"use client";

import {
  CheckCircle2,
  Clock3,
  ListTodo,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  computeTaskStats,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";
import { getProjects, type Project } from "@/lib/projects";

const STATUS_FILTERS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_FILTERS: { value: TaskPriority | "all"; label: string }[] = [
  { value: "all", label: "Any priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_META: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  todo: {
    label: "To do",
    className: "bg-slate-400/[0.07] text-slate-400",
  },
  in_progress: {
    label: "In progress",
    className: "bg-cyan-400/[0.07] text-cyan-400",
  },
  done: {
    label: "Done",
    className: "bg-emerald-400/[0.07] text-emerald-400",
  },
};

function priorityClassName(priority: TaskPriority): string {
  if (priority === "high") {
    return "bg-red-400/[0.07] text-red-400";
  }

  if (priority === "medium") {
    return "bg-amber-400/[0.07] text-amber-400";
  }

  return "bg-slate-400/[0.07] text-slate-500";
}

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) {
    return null;
  }

  const parsed = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<
    TaskStatus | "all"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<
    TaskPriority | "all"
  >("all");
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] =
    useState<TaskPriority>("medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [taskRows, projectRows] = await Promise.all([
        getTasks(),
        getProjects(),
      ]);

      setTasks(taskRows);
      setProjects(projectRows);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your tasks could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(load);
  }, [load]);

  const stats = useMemo(() => computeTaskStats(tasks), [tasks]);

  const visibleTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      if (
        priorityFilter !== "all" &&
        task.priority !== priorityFilter
      ) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return (
        task.title.toLowerCase().includes(needle) ||
        (task.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [tasks, statusFilter, priorityFilter, query]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      const created = await createTask({
        title: formTitle,
        description: formDescription || undefined,
        priority: formPriority,
        due_date: formDueDate || null,
        project_id: formProjectId || null,
      });

      setTasks((current) => [created, ...current]);
      setFormTitle("");
      setFormDescription("");
      setFormPriority("medium");
      setFormDueDate("");
      setFormProjectId("");
      setShowForm(false);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "The task could not be created."
      );
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleStatusChange(
    task: Task,
    status: TaskStatus
  ) {
    setActionError(null);
    setBusyId(task.id);

    try {
      await updateTask(task.id, { status });
      setTasks((current) =>
        current.map((row) =>
          row.id === task.id ? { ...row, status } : row
        )
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The task could not be updated."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task: Task) {
    setActionError(null);
    setBusyId(task.id);

    try {
      await deleteTask(task.id);
      setTasks((current) =>
        current.filter((row) => row.id !== task.id)
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The task could not be deleted."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06]">
              <ListTodo
                size={20}
                strokeWidth={1.7}
                className="text-cyan-400"
              />
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Tasks
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
                Organize and track your team&apos;s work across
                Atlas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowForm(true);
            }}
            className="hidden items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-[#06101b] transition-colors hover:bg-cyan-300 sm:flex"
          >
            <Plus size={15} />
            New task
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">Total tasks</p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {stats.total}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">In progress</p>

          <p className="mt-2 text-2xl font-semibold text-cyan-400">
            {stats.inProgress}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">Completed</p>

          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            {stats.done}
          </p>
        </div>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-300"
        >
          {actionError}
        </div>
      ) : null}

      {/* Task list */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Your Tasks
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Saved to your workspace — changes persist across
              sessions.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              />

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tasks"
                aria-label="Search tasks"
                className="w-full rounded-lg border border-white/[0.07] bg-black/20 py-2 pl-8 pr-3 text-xs text-slate-300 placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none sm:w-44"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as TaskStatus | "all"
                )
              }
              aria-label="Filter by status"
              className="rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-2 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
            >
              {STATUS_FILTERS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-[#0a0f1a] text-slate-300"
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value as TaskPriority | "all"
                )
              }
              aria-label="Filter by priority"
              className="rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-2 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
            >
              {PRIORITY_FILTERS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-[#0a0f1a] text-slate-300"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <Loader2 size={15} className="animate-spin" />
            Loading tasks…
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
        ) : visibleTasks.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">
              {tasks.length === 0
                ? "No tasks yet."
                : "No tasks match these filters."}
            </p>

            {tasks.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setShowForm(true);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-[#06101b] transition-colors hover:bg-cyan-300"
              >
                <Plus size={15} />
                Create your first task
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setQuery("");
                }}
                className="mt-3 text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map((task) => {
              const dueLabel = formatDueDate(task.due_date);
              const project = task.project_id
                ? projects.find(
                    (row) => row.id === task.project_id
                  )
                : undefined;

              return (
                <div
                  key={task.id}
                  className="group flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.02]"
                >
                  {/* Status toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      void handleStatusChange(
                        task,
                        task.status === "done" ? "todo" : "done"
                      )
                    }
                    disabled={busyId === task.id}
                    aria-label={
                      task.status === "done"
                        ? `Reopen task: ${task.title}`
                        : `Complete task: ${task.title}`
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] transition-colors hover:bg-white/[0.07] disabled:opacity-50"
                  >
                    {busyId === task.id ? (
                      <Loader2
                        size={16}
                        className="animate-spin text-slate-500"
                      />
                    ) : task.status === "done" ? (
                      <CheckCircle2
                        size={17}
                        className="text-emerald-400"
                      />
                    ) : (
                      <Clock3
                        size={17}
                        className="text-cyan-400"
                      />
                    )}
                  </button>

                  {/* Task */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        task.status === "done"
                          ? "text-slate-600 line-through"
                          : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {task.title}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-600">
                      {task.description ?? "No description"}
                      {project ? ` · ${project.name}` : ""}
                      {dueLabel ? ` · due ${dueLabel}` : ""}
                    </p>
                  </div>

                  {/* Status select */}
                  <select
                    value={task.status}
                    onChange={(event) =>
                      void handleStatusChange(
                        task,
                        event.target.value as TaskStatus
                      )
                    }
                    disabled={busyId === task.id}
                    aria-label={`Status for ${task.title}`}
                    className={`hidden rounded-full px-2.5 py-1 text-[10px] font-medium focus:outline-none sm:block ${
                      STATUS_META[task.status].className
                    }`}
                  >
                    <option
                      value="todo"
                      className="bg-[#0a0f1a] text-slate-300"
                    >
                      To do
                    </option>
                    <option
                      value="in_progress"
                      className="bg-[#0a0f1a] text-slate-300"
                    >
                      In progress
                    </option>
                    <option
                      value="done"
                      className="bg-[#0a0f1a] text-slate-300"
                    >
                      Done
                    </option>
                  </select>

                  {/* Priority */}
                  <span
                    className={`hidden rounded-full px-2.5 py-1 text-[10px] font-medium sm:block ${priorityClassName(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => void handleDelete(task)}
                    disabled={busyId === task.id}
                    aria-label={`Delete task: ${task.title}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile button */}
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setShowForm(true);
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-semibold text-[#06101b] transition-colors hover:bg-cyan-300 sm:hidden"
        >
          <Plus size={15} />
          New task
        </button>
      </section>

      {/* Create modal */}
      {showForm ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Create task"
        >
          <form
            onSubmit={(event) => void handleCreate(event)}
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0a0f1a] p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                New task
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
                  htmlFor="task-title"
                  className="mb-1.5 block text-xs text-slate-500"
                >
                  Title
                </label>

                <input
                  id="task-title"
                  required
                  maxLength={200}
                  value={formTitle}
                  onChange={(event) =>
                    setFormTitle(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
                  placeholder="e.g. Review Q4 roadmap"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="mb-1.5 block text-xs text-slate-500"
                >
                  Description{" "}
                  <span className="text-slate-700">(optional)</span>
                </label>

                <textarea
                  id="task-description"
                  rows={3}
                  value={formDescription}
                  onChange={(event) =>
                    setFormDescription(event.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400/40 focus:outline-none"
                  placeholder="What needs to be done?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1.5 block text-xs text-slate-500"
                  >
                    Priority
                  </label>

                  <select
                    id="task-priority"
                    value={formPriority}
                    onChange={(event) =>
                      setFormPriority(
                        event.target.value as TaskPriority
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                  >
                    <option
                      value="low"
                      className="bg-[#0a0f1a] text-slate-300"
                    >
                      Low
                    </option>
                    <option
                      value="medium"
                      className="bg-[#0a0f1a] text-slate-300"
                    >
                      Medium
                    </option>
                    <option
                      value="high"
                      className="bg-[#0a0f1a] text-slate-300"
                    >
                      High
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-due"
                    className="mb-1.5 block text-xs text-slate-500"
                  >
                    Due date
                  </label>

                  <input
                    id="task-due"
                    type="date"
                    value={formDueDate}
                    onChange={(event) =>
                      setFormDueDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                  />
                </div>
              </div>

              {projects.length > 0 ? (
                <div>
                  <label
                    htmlFor="task-project"
                    className="mb-1.5 block text-xs text-slate-500"
                  >
                    Project{" "}
                    <span className="text-slate-700">(optional)</span>
                  </label>

                  <select
                    id="task-project"
                    value={formProjectId}
                    onChange={(event) =>
                      setFormProjectId(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
                  >
                    <option
                      value=""
                      className="bg-[#0a0f1a] text-slate-300"
                    >
                      No project
                    </option>

                    {projects.map((project) => (
                      <option
                        key={project.id}
                        value={project.id}
                        className="bg-[#0a0f1a] text-slate-300"
                      >
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
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
                  <Plus size={14} />
                )}
                Create task
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
