"use client";

import {
  Mail,
  MoreHorizontal,
  Plus,
  Shield,
  Users,
} from "lucide-react";

const members = [
  {
    name: "Bathriprasath",
    email: "Administrator",
    role: "Administrator",
    status: "Active",
    initials: "B",
  },
  {
    name: "Alex Morgan",
    email: "alex@atlas.local",
    role: "Member",
    status: "Active",
    initials: "A",
  },
  {
    name: "Sarah Wilson",
    email: "sarah@atlas.local",
    role: "Member",
    status: "Active",
    initials: "S",
  },
  {
    name: "Daniel Thomas",
    email: "daniel@atlas.local",
    role: "Viewer",
    status: "Pending",
    initials: "D",
  },
];

export default function TeamPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06]">
              <Users
                size={20}
                strokeWidth={1.7}
                className="text-cyan-400"
              />
            </div>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Team
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
                Manage your organization members and workspace access.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="hidden items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-semibold text-[#06101b] transition-colors hover:bg-cyan-300 sm:flex"
          >
            <Plus size={15} />
            Invite member
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">
            Team members
          </p>

          <p className="mt-2 text-2xl font-semibold text-white">
            8
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">
            Active
          </p>

          <p className="mt-2 text-2xl font-semibold text-cyan-400">
            7
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">
            Pending invites
          </p>

          <p className="mt-2 text-2xl font-semibold text-amber-400">
            1
          </p>
        </div>
      </div>

      {/* Team list */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Team members
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            People who have access to this workspace.
          </p>
        </div>

        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.email}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.02]"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-semibold text-[#06101b]">
                {member.initials}
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-300 group-hover:text-white">
                  {member.name}
                </p>

                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600">
                  <Mail size={11} />
                  <span className="truncate">
                    {member.email}
                  </span>
                </div>
              </div>

              {/* Role */}
              <div className="hidden items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 sm:flex">
                <Shield
                  size={12}
                  className="text-slate-500"
                />

                <span className="text-[10px] text-slate-500">
                  {member.role}
                </span>
              </div>

              {/* Status */}
              <span
                className={`hidden rounded-full px-2.5 py-1 text-[10px] font-medium md:block ${
                  member.status === "Active"
                    ? "bg-emerald-400/[0.07] text-emerald-400"
                    : "bg-amber-400/[0.07] text-amber-400"
                }`}
              >
                {member.status}
              </span>

              {/* More */}
              <button
                type="button"
                aria-label={`More options for ${member.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white/[0.05] hover:text-slate-300"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Mobile invite */}
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-semibold text-[#06101b] transition-colors hover:bg-cyan-300 sm:hidden"
        >
          <Plus size={15} />
          Invite member
        </button>
      </section>
    </div>
  );
}