"use client";

import {
  Bell,
  Check,
  Lock,
  Moon,
  Shield,
  User,
  Settings as SettingsIcon,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06]">
            <SettingsIcon
              size={20}
              strokeWidth={1.7}
              className="text-cyan-400"
            />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Settings
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              Manage your Atlas workspace preferences and account settings.
            </p>
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Account
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Your personal Atlas account information.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/[0.08] p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-semibold text-[#06101b]">
            B
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">
              Bathriprasath
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Administrator
            </p>
          </div>

          <button
            type="button"
            className="hidden items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white sm:flex"
          >
            <User size={13} />
            Edit
          </button>
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Preferences
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Customize how Atlas behaves for you.
          </p>
        </div>

        <div className="space-y-2">
          {/* Theme */}
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <Moon
                size={16}
                className="text-slate-400"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-300">
                Appearance
              </p>

              <p className="mt-1 text-[11px] text-slate-600">
                Use dark mode across the Atlas workspace.
              </p>
            </div>

            <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-cyan-400">
              Dark
            </span>
          </div>

          {/* Notifications */}
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <Bell
                size={16}
                className="text-slate-400"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-300">
                Notifications
              </p>

              <p className="mt-1 text-[11px] text-slate-600">
                Receive important workspace notifications.
              </p>
            </div>

            <div className="flex h-5 w-9 items-center rounded-full bg-cyan-400 p-0.5">
              <div className="ml-auto h-4 w-4 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Security
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Manage account security and access preferences.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <Lock
                size={16}
                className="text-slate-400"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-300">
                Authentication
              </p>

              <p className="mt-1 text-[11px] text-slate-600">
                Your account is protected by Supabase authentication.
              </p>
            </div>

            <Check
              size={16}
              className="text-emerald-400"
            />
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <Shield
                size={16}
                className="text-slate-400"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-300">
                Workspace security
              </p>

              <p className="mt-1 text-[11px] text-slate-600">
                Your workspace security controls are enabled.
              </p>
            </div>

            <span className="text-[10px] font-medium text-emerald-400">
              Protected
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}