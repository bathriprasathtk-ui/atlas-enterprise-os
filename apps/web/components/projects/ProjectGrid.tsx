"use client";

import { useCallback, useEffect, useState } from "react";

import ProjectCard from "./ProjectCard";
import FadeIn from "@/components/animations/FadeIn";

import {
  deleteProject,
  getProjects,
  updateProject,
  type Project,
  type ProjectStatus,
} from "@/lib/projects";

export default function ProjectGrid() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(
    null
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getProjects();
      setProjects(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your projects could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(loadProjects);
  }, [loadProjects]);

  async function handleStatusChange(
    project: Project,
    status: ProjectStatus
  ) {
    setActionError(null);
    setBusyId(project.id);

    try {
      const updated = await updateProject(project.id, {
        status,
      });

      setProjects((current) =>
        current.map((row) =>
          row.id === project.id ? updated : row
        )
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The project could not be updated."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleProgressChange(
    project: Project,
    progress: number
  ) {
    const clamped = Math.min(100, Math.max(0, progress));

    if (clamped === project.progress) {
      return;
    }

    setActionError(null);
    setBusyId(project.id);

    try {
      const updated = await updateProject(project.id, {
        progress: clamped,
      });

      setProjects((current) =>
        current.map((row) =>
          row.id === project.id ? updated : row
        )
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The project could not be updated."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(project: Project) {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setActionError(null);
    setBusyId(project.id);

    try {
      await deleteProject(project.id);
      setProjects((current) =>
        current.filter((row) => row.id !== project.id)
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The project could not be deleted."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FadeIn delay={0.2}>
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Projects
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Track your active initiatives
            </p>
          </div>
        </div>

        {actionError ? (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-300"
          >
            {actionError}
          </div>
        ) : null}

        {/* Loading */}
        {loading && (
          <div className="grid gap-3 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-6 text-center text-xs text-red-300"
          >
            {error}

            <button
              type="button"
              onClick={() => void loadProjects()}
              className="mt-3 block w-full text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && projects.length === 0 && (
          <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
            <div>
              <p className="text-sm font-medium text-slate-300">
                No projects yet
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Create your first project to get started.
              </p>
            </div>
          </div>
        )}

        {/* Projects */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                busy={busyId === project.id}
                onStatusChange={(row, status) =>
                  void handleStatusChange(row, status)
                }
                onProgressChange={(row, progress) =>
                  void handleProgressChange(row, progress)
                }
                onDelete={(row) => void handleDelete(row)}
              />
            ))}
          </div>
        )}
      </section>
    </FadeIn>
  );
}
