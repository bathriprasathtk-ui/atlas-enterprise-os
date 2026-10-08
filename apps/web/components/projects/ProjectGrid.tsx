"use client";

import { useEffect, useState } from "react";

import ProjectCard from "./ProjectCard";
import FadeIn from "@/components/animations/FadeIn";

import {
  getProjects,
  Project,
} from "@/lib/projects";

export default function ProjectGrid() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProjects() {
    try {
      setLoading(true);

      const data = await getProjects();

      setProjects(data);
    } catch (error) {
      console.error(
        "Failed to load projects:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

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

        {/* Empty */}
        {!loading && projects.length === 0 && (
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
        {!loading && projects.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                title={project.name}
                description={
                  project.description ||
                  "No description provided"
                }
                members={0}
                status={project.status}
                progress={project.progress}
              />
            ))}
          </div>
        )}

      </section>
    </FadeIn>
  );
}