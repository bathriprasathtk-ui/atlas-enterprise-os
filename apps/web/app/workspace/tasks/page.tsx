"use client";

import {
  CheckCircle2,
  Clock3,
  ListTodo,
  Plus,
} from "lucide-react";

const tasks = [
  {
    title: "Review uploaded documents",
    description: "Review recently added knowledge sources.",
    priority: "High",
    status: "In Progress",
  },
  {
    title: "Complete HR Portal",
    description: "Finish the remaining project tasks.",
    priority: "Medium",
    status: "Pending",
  },
  {
    title: "Prepare finance report",
    description: "Review the latest financial dashboard data.",
    priority: "Low",
    status: "Completed",
  },
];

export default function TasksPage() {
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
                Organize and track your team's work across Atlas.
              </p>
            </div>
          </div>

          <button
            type="button"
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
          <p className="text-xs text-slate-600">
            Total tasks
          </p>

          <p className="mt-2 text-2xl font-semibold text-white">
            12
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">
            In progress
          </p>

          <p className="mt-2 text-2xl font-semibold text-cyan-400">
            4
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">
            Completed
          </p>

          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            6
          </p>
        </div>
      </div>

      {/* Task list */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Recent Tasks
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Your latest workspace tasks.
          </p>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.title}
              className="group flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.02]"
            >
              {/* Status icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                {task.status === "Completed" ? (
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
              </div>

              {/* Task */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-300 group-hover:text-white">
                  {task.title}
                </p>

                <p className="mt-1 truncate text-xs text-slate-600">
                  {task.description}
                </p>
              </div>

              {/* Priority */}
              <span
                className={`hidden rounded-full px-2.5 py-1 text-[10px] font-medium sm:block ${
                  task.priority === "High"
                    ? "bg-red-400/[0.07] text-red-400"
                    : task.priority === "Medium"
                      ? "bg-amber-400/[0.07] text-amber-400"
                      : "bg-slate-400/[0.07] text-slate-500"
                }`}
              >
                {task.priority}
              </span>

              {/* Status */}
              <span className="hidden text-[10px] text-slate-600 md:block">
                {task.status}
              </span>
            </div>
          ))}
        </div>

        {/* Mobile button */}
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-semibold text-[#06101b] transition-colors hover:bg-cyan-300 sm:hidden"
        >
          <Plus size={15} />
          New task
        </button>
      </section>
    </div>
  );
}