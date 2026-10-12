"use client";

import {
  Briefcase,
  Loader2,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { getProfiles, type Profile } from "@/lib/profiles";
import { supabase } from "@/lib/supabaseClient";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);

  if (parts.length === 0 || (parts.length === 1 && !parts[0])) {
    return "?";
  }

  return parts.map((part) => part[0]!.toUpperCase()).join("");
}

export default function TeamPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [rows, auth] = await Promise.all([
          getProfiles(),
          supabase.auth.getUser(),
        ]);

        if (cancelled) {
          return;
        }

        setProfiles(rows);
        setCurrentUserId(auth.data.user?.id ?? null);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "The team directory could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <section>
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
              Directory of people with accounts in this Atlas
              instance.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">
            Directory members
          </p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {loading ? "—" : profiles.length}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">
            Invitations
          </p>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Not available yet
          </p>
        </div>
      </div>

      {/* Honest limitation notice */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[11px] leading-5 text-slate-600">
        Atlas currently runs as a per-user workspace: each
        account sees only its own data. Team invitations and
        role-based access are planned but not yet
        implemented — this page shows every registered
        profile (name and designation only).
      </div>

      {/* Team list */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Directory
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Profiles are visible to all signed-in users.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            Loading directory…
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-6 text-center text-xs text-red-300"
          >
            {error}
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-600">
            No profiles found. Sign up with another account to
            populate the directory.
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.02]"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-semibold text-[#06101b]">
                  {initials(profile.display_name)}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-300 group-hover:text-white">
                    {profile.display_name}

                    {profile.id === currentUserId ? (
                      <span className="ml-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                        You
                      </span>
                    ) : null}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600">
                    {profile.designation ? (
                      <>
                        <Briefcase size={11} />
                        <span className="truncate">
                          {profile.designation}
                        </span>
                      </>
                    ) : (
                      <>
                        <User size={11} />
                        <span>No designation set</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
