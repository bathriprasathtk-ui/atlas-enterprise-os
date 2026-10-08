"use client";

import { GitBranch, Plus, Play, Settings2 } from "lucide-react";

const workflows = [
  {
    name: "Document Processing",
    description: "Automatically process and index uploaded documents.",
    status: "Active",
  },
  {
    name: "Project Onboarding",
    description: "Create tasks and notify team members for new projects.",
    status: "Draft",
  },
  {
    name: "AI Knowledge Sync",
    description: "Keep the organizational knowledge base synchronized.",
    status: "Active",
  },
];

export default function WorkflowsPage() {
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
            Automate repetitive processes across your organization.
          </p>
        </div>

        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-[#06101b] transition hover:bg-cyan-300"
        >
          <Plus size={17} />
          Create workflow
        </button>
      </div>

      {/* Workflow cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <div
            key={workflow.name}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl transition hover:border-cyan-400/20 hover:bg-white/[0.035]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                <GitBranch
                  size={18}
                  className="text-cyan-400"
                />
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  workflow.status === "Active"
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-amber-400/10 text-amber-400"
                }`}
              >
                {workflow.status}
              </span>
            </div>

            <h2 className="mt-5 text-sm font-semibold text-white">
              {workflow.name}
            </h2>

            <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">
              {workflow.description}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] py-2 text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Play size={14} />
                Run
              </button>

              <button
                type="button"
                className="flex items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Settings2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}