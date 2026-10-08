"use client";

import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  Users,
} from "lucide-react";

type ProjectStatus = "Active" | "In Review" | "Completed";

type ProjectCardProps = {
  title: string;
  description: string;
  members: number;
  status: ProjectStatus;
  progress: number;
};

const statusConfig = {
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

export default function ProjectCard({
  title,
  description,
  members,
  status,
  progress,
}: ProjectCardProps) {
  const config = statusConfig[status];
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

        <span
          className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-medium ${config.className}`}
        >
          <StatusIcon size={10} />
          {config.label}
        </span>
      </div>

      {/* Content */}
      <div className="mt-4">
        <h3 className="truncate text-sm font-semibold text-white">
          {title}
        </h3>

        <p className="mt-1 truncate text-xs text-slate-600">
          {description}
        </p>
      </div>

      {/* Progress */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
            Progress
          </span>

          <span className="text-[11px] font-medium text-slate-400">
            {progress}%
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center gap-1.5 border-t border-white/[0.05] pt-3">
        <Users
          size={13}
          strokeWidth={1.7}
          className="text-slate-600"
        />

        <span className="text-[11px] text-slate-500">
          {members} members
        </span>
      </div>
    </div>
  );
}