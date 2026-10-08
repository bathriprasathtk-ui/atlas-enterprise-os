"use client";

import Link from "next/link";
import {
  FolderKanban,
  MoreHorizontal,
} from "lucide-react";

const projects = [
  {
    name: "Atlas Enterprise OS",
    status: "Active",
    progress: 72,
  },
  {
    name: "HR Portal",
    status: "In Review",
    progress: 84,
  },
  {
    name: "Finance Dashboard",
    status: "Completed",
    progress: 100,
  },
];

export default function RecentProjects() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Recent Projects
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Latest project activity
          </p>
        </div>

        <Link
          href="/workspace/projects"
          className="text-xs font-medium text-slate-500 transition-colors hover:text-cyan-400"
        >
          View all
        </Link>
      </div>

      <div className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.name}
            className="group rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3">
              <Link
                href="/workspace/projects"
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                  <FolderKanban
                    size={15}
                    strokeWidth={1.7}
                    className="text-cyan-400"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-300 group-hover:text-white">
                    {project.name}
                  </p>

                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{
                        width: `${project.progress}%`,
                      }}
                    />
                  </div>
                </div>
              </Link>

              <div className="text-right">
                <p className="text-[11px] font-medium text-slate-400">
                  {project.progress}%
                </p>

                <p className="mt-1 text-[10px] text-slate-600">
                  {project.status}
                </p>
              </div>

              <button
                type="button"
                aria-label={`More options for ${project.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.05] hover:text-slate-300"
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}