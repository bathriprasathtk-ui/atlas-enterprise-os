"use client";

import { useEffect, useState } from "react";

import ProjectGrid from "@/components/projects/ProjectGrid";
import CreateProjectModal from "@/components/projects/CreateProjectModal";

export default function ProjectsPage() {
  const [createOpen, setCreateOpen] =
    useState(false);

  const [refreshKey, setRefreshKey] =
    useState(0);

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Workspace
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Projects
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage your organization's active initiatives,
            track progress, and keep teams aligned.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-[#06101b] transition-all duration-200 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.15)]"
        >
          + Create project
        </button>

      </div>

      {/* Projects */}
      <ProjectGrid key={refreshKey} />

      {/* Create modal */}
      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() =>
          setRefreshKey((current) => current + 1)
        }
      />

    </div>
  );
}