"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Moon,
  Search,
  ChevronDown,
  Command,
  User,
  Settings,
  LogOut,
} from "lucide-react";

import { signOut } from "@/lib/auth";

export default function Topbar() {
  const router = useRouter();

  // Refs
  const searchRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // State
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Keyboard + outside click handling
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
    }

    function handleKeyboard(event: KeyboardEvent) {
  const key = event.key.toLowerCase();

  if (
    (event.ctrlKey || event.metaKey) &&
    key === "k"
  ) {
    event.preventDefault();

    searchRef.current?.focus();

    return;
  }

  if (event.key === "Escape") {
    searchRef.current?.blur();
    setProfileOpen(false);
    setNotificationsOpen(false);
  }
}
    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, []);

  // Sign out
  async function handleSignOut() {
    if (loading) return;

    setLoading(true);

    const { error } = await signOut();

    if (error) {
      console.error("Sign out failed:", error);
      setLoading(false);
      return;
    }

    router.replace("/login");
  }

  return (
    <div className="flex h-full w-full items-center justify-between px-5 sm:px-6 lg:px-8">

      {/* Search */}
<div className="flex min-w-0 flex-1 items-center">
  <div className="relative w-full max-w-[520px]">
    <Search
      size={18}
      strokeWidth={1.8}
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
    />

    <input
      ref={searchRef}
      type="search"
      placeholder="Search anything..."
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.blur();
        }
      }}
      className="h-11 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-11 pr-24 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.11] hover:bg-white/[0.035] focus:border-cyan-400/30 focus:bg-white/[0.04] focus:ring-1 focus:ring-cyan-400/10"
    />

    {/* Keyboard shortcut */}
    <button
      type="button"
      aria-label="Focus search"
      onClick={() => {
        searchRef.current?.focus();
      }}
      className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.035] px-1.5 py-1 text-[10px] text-slate-500 transition-colors hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-400"
    >
      <Command size={11} />
      <span>K</span>
    </button>
  </div>
</div>

      {/* =====================================================
          RIGHT CONTROLS
      ====================================================== */}

      <div className="ml-5 flex shrink-0 items-center gap-2">

        {/* =================================================
            NOTIFICATIONS
        ================================================== */}

        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={() => {
              setProfileOpen(false);

              setNotificationsOpen(
                (current) => !current
              );
            }}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border text-slate-400 transition-all duration-200 ${
              notificationsOpen
                ? "border-cyan-400/15 bg-white/[0.04] text-white"
                : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white"
            }`}
          >
            <Bell
              size={19}
              strokeWidth={1.7}
              className={
                notificationsOpen
                  ? "text-cyan-400"
                  : "transition-colors group-hover:text-cyan-400"
              }
            />

            {/* Unread indicator */}
            <span className="absolute right-[9px] top-[8px] h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </button>

          {/* Notification dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1020]/95 shadow-2xl shadow-black/40 backdrop-blur-2xl">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">

                <div>
                  <p className="text-sm font-semibold text-white">
                    Notifications
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Recent workspace activity
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {}}
                  className="text-[11px] font-medium text-cyan-400 transition-colors hover:text-cyan-300"
                >
                  Mark all read
                </button>

              </div>

              {/* Notifications */}
              <div className="max-h-[320px] overflow-y-auto">

                {/* Notification 1 */}
                <div className="flex gap-3 border-b border-white/[0.05] px-4 py-3.5 transition-colors hover:bg-white/[0.025]">

                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />

                  <div className="min-w-0">

                    <p className="text-xs font-medium text-slate-200">
                      Knowledge activity increased
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Your team added new documents to the Knowledge Hub.
                    </p>

                    <p className="mt-1.5 text-[10px] text-slate-600">
                      12 minutes ago
                    </p>

                  </div>
                </div>

                {/* Notification 2 */}
                <div className="flex gap-3 border-b border-white/[0.05] px-4 py-3.5 transition-colors hover:bg-white/[0.025]">

                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />

                  <div className="min-w-0">

                    <p className="text-xs font-medium text-slate-200">
                      AI insight generated
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Atlas AI found a new workspace trend.
                    </p>

                    <p className="mt-1.5 text-[10px] text-slate-600">
                      34 minutes ago
                    </p>

                  </div>
                </div>

                {/* Notification 3 */}
                <div className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.025]">

                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />

                  <div className="min-w-0">

                    <p className="text-xs font-medium text-slate-200">
                      Project updated
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Atlas Enterprise OS progress reached 72%.
                    </p>

                    <p className="mt-1.5 text-[10px] text-slate-600">
                      1 hour ago
                    </p>

                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="border-t border-white/[0.06] p-2">

                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  View all notifications
                </button>

              </div>

            </div>
          )}
        </div>

        {/* =================================================
            THEME
        ================================================== */}

        <button
          type="button"
          aria-label="Toggle theme"
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-400 transition-all duration-200 hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white sm:flex"
        >
          <Moon
            size={19}
            strokeWidth={1.7}
            className="transition-colors hover:text-cyan-400"
          />
        </button>

        {/* Divider */}
        <div className="mx-2 hidden h-7 w-px bg-white/[0.07] sm:block" />

        {/* =================================================
            PROFILE
        ================================================== */}

        <div
          ref={profileRef}
          className="relative"
        >
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => {
              setNotificationsOpen(false);

              setProfileOpen(
                (current) => !current
              );
            }}
            className={`group flex items-center gap-3 rounded-xl border px-2 py-1.5 transition-all duration-200 ${
              profileOpen
                ? "border-cyan-400/15 bg-white/[0.04]"
                : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.035]"
            }`}
          >

            {/* Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-semibold text-[#06101b] shadow-[0_0_18px_rgba(34,211,238,0.1)]">
              B
            </div>

            {/* User information */}
            <div className="hidden text-left md:block">

              <p className="max-w-[130px] truncate text-sm font-medium text-white">
                Bathriprasath
              </p>

              <p className="mt-0.5 text-[11px] text-slate-500">
                Administrator
              </p>

            </div>

            {/* Arrow */}
            <ChevronDown
              size={16}
              strokeWidth={1.8}
              className={`text-slate-500 transition-all duration-200 ${
                profileOpen
                  ? "rotate-180 text-cyan-400"
                  : "group-hover:text-slate-300"
              }`}
            />

          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[240px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1020]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl"
            >

              {/* User header */}
              <div className="mb-1 border-b border-white/[0.06] px-3 pb-3 pt-2">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-semibold text-[#06101b]">
                    B
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-medium text-white">
                      Bathriprasath
                    </p>

                    <p className="truncate text-[11px] text-slate-500">
                      Administrator
                    </p>

                  </div>

                </div>

              </div>

              {/* Profile */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);

                  router.push(
                    "/workspace/profile"
                  );
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <User
                  size={16}
                  strokeWidth={1.7}
                />

                <span>Profile</span>
              </button>

              {/* Settings */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);

                  router.push(
                    "/workspace/settings"
                  );
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <Settings
                  size={16}
                  strokeWidth={1.7}
                />

                <span>Settings</span>
              </button>

              {/* Sign out */}
              <div className="mt-1 border-t border-white/[0.06] pt-1">

                <button
                  type="button"
                  role="menuitem"
                  disabled={loading}
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-400/[0.06] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut
                    size={16}
                    strokeWidth={1.7}
                  />

                  <span>
                    {loading
                      ? "Signing out..."
                      : "Sign out"}
                  </span>

                </button>

              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}