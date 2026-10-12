"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { FolderKanban, Loader2 } from "lucide-react";

import { getProjects, type Project } from "@/lib/projects";

export default function RecentProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getProjects()
      .then((rows) => {
        if (!cancelled) {
          setProjects(rows.slice(0, 5));
        }
      })
      .catch(() => {
        /* Handled by the empty state below. */
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-600">
            No projects yet. Create one from the Projects page.
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="group rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.02]"
            >
              <Link
                href="/workspace/projects"
                className="flex items-center gap-3"
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

                <div className="text-right">
                  <p className="text-[11px] font-medium text-slate-400">
                    {project.progress}%
                  </p>

                  <p className="mt-1 text-[10px] text-slate-600">
                    {project.status}
                  </p>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
