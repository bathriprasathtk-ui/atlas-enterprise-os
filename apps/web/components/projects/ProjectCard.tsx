"use client";

import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  Loader2,
  Trash2,
} from "lucide-react";

import type {
  Project,
  ProjectStatus,
} from "@/lib/projects";

type ProjectCardProps = {
  project: Project;
  busy?: boolean;
  onStatusChange: (
    project: Project,
    status: ProjectStatus
  ) => void;
  onProgressChange: (
    project: Project,
    progress: number
  ) => void;
  onDelete: (project: Project) => void;
};

const statusConfig: Record<
  ProjectStatus,
  { label: string; icon: typeof Clock3; className: string }
> = {
  Active: {
    label: "Active",
    icon: Clock3,
    className:
      "border-cyan-400/10 bg-cyan-400/[0.06] text-cyan-400",
  },
  "In Review": {
    label: "In Review",
    icon: Clock3,
    className:
      "border-amber-400/10 bg-amber-400/[0.06] text-amber-400",
  },
  Completed: {
    label: "Completed",
    icon: CheckCircle2,
    className:
      "border-emerald-400/10 bg-emerald-400/[0.06] text-emerald-400",
  },
};

function formatUpdatedDate(iso: string): string {
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return "unknown";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ProjectCard({
  project,
  busy = false,
  onStatusChange,
  onProgressChange,
  onDelete,
}: ProjectCardProps) {
  const config = statusConfig[project.status];
  const StatusIcon = config.icon;

  return (
    <div className="group rounded-xl border border-white/[0.06] bg-black/[0.08] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/10 hover:bg-white/[0.025]">
      {/* Top */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025]">
          <FolderKanban
            size={16}
            strokeWidth={1.7}
            className="text-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-medium ${config.className}`}
          >
            {busy ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <StatusIcon size={10} />
            )}
            {config.label}
          </span>

          <button
            type="button"
            onClick={() => onDelete(project)}
            disabled={busy}
            aria-label={`Delete project: ${project.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        <h3 className="truncate text-sm font-semibold text-white">
          {project.name}
        </h3>

        <p className="mt-1 truncate text-xs text-slate-600">
          {project.description || "No description provided"}
        </p>
      </div>

      {/* Status select */}
      <div className="mt-4">
        <label
          htmlFor={`status-${project.id}`}
          className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-slate-600"
        >
          Status
        </label>

        <select
          id={`status-${project.id}`}
          value={project.status}
          disabled={busy}
          onChange={(event) =>
            onStatusChange(
              project,
              event.target.value as ProjectStatus
            )
          }
          className="w-full rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-2 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none disabled:opacity-60"
        >
          <option
            value="Active"
            className="bg-[#0a0f1a] text-slate-300"
          >
            Active
          </option>
          <option
            value="In Review"
            className="bg-[#0a0f1a] text-slate-300"
          >
            In Review
          </option>
          <option
            value="Completed"
            className="bg-[#0a0f1a] text-slate-300"
          >
            Completed
          </option>
        </select>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <label
          htmlFor={`progress-${project.id}`}
          className="mb-2 flex items-center justify-between"
        >
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
            Progress
          </span>

          <span className="text-[11px] font-medium text-slate-400">
            {project.progress}%
          </span>
        </label>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>

        <input
          id={`progress-${project.id}`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={project.progress}
          disabled={busy}
          aria-label={`Progress for ${project.name}`}
          onChange={(event) =>
            onProgressChange(
              project,
              Number(event.target.value)
            )
          }
          className="mt-2 w-full accent-cyan-400 disabled:opacity-60"
        />
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-white/[0.05] pt-3 text-[11px] text-slate-600">
        Updated {formatUpdatedDate(project.updated_at)}
      </div>
    </div>
  );
}
