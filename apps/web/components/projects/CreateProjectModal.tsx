"use client";

import { FormEvent, useState } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";

import {
  createProject,
  ProjectStatus,
} from "@/lib/projects";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [status, setStatus] =
    useState<ProjectStatus>("Active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await createProject({
        name,
        description,
        status,
        progress: 0,
      });

      setName("");
      setDescription("");
      setStatus("Active");

      onCreated();
      onClose();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create project."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">

      {/* Modal */}
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1020] shadow-2xl shadow-black/50">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.08]">
              <FolderPlus
                size={19}
                className="text-cyan-400"
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">
                Create project
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Start a new workspace initiative
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
          >
            <X size={18} />
          </button>

        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-5 sm:p-6"
        >

          {/* Project name */}
          <div>
            <label
              htmlFor="project-name"
              className="mb-2 block text-xs font-medium text-slate-300"
            >
              Project name
            </label>

            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Atlas Mobile App"
              disabled={loading}
              autoFocus
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-white/[0.04] focus:ring-1 focus:ring-cyan-400/10 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-description"
              className="mb-2 block text-xs font-medium text-slate-300"
            >
              Description
            </label>

            <textarea
              id="project-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="What is this project about?"
              rows={4}
              disabled={loading}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 text-sm leading-5 text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-white/[0.04] focus:ring-1 focus:ring-cyan-400/10 disabled:opacity-50"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="project-status"
              className="mb-2 block text-xs font-medium text-slate-300"
            >
              Status
            </label>

            <select
              id="project-status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as ProjectStatus
                )
              }
              disabled={loading}
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0c1426] px-3.5 text-sm text-white outline-none transition-all focus:border-cyan-400/30 focus:ring-1 focus:ring-cyan-400/10 disabled:opacity-50"
            >
              <option value="Active">
                Active
              </option>

              <option value="In Review">
                In Review
              </option>

              <option value="Completed">
                Completed
              </option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs leading-5 text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-semibold text-[#06101b] transition-all hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Creating..."
                : "Create project"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}