"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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

import {
  getCurrentUser,
  signOut,
  type CurrentUser,
} from "@/lib/auth";
import {
  getBadgePrefServerSnapshot,
  getBadgePrefSnapshot,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToBadgePref,
  type AppNotification,
} from "@/lib/notifications";
import { timeAgo } from "@/lib/format";

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

  // Real notifications (RLS-scoped to the signed-in user)
  const [notifications, setNotifications] = useState<
    AppNotification[] | null
  >(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(
    null
  );

  /* Badge preference lives in localStorage; the hook keeps the
     bell in sync with the Settings toggle. */
  const badgeEnabled = useSyncExternalStore(
    subscribeToBadgePref,
    getBadgePrefSnapshot,
    getBadgePrefServerSnapshot
  );

  // Authenticated user identity
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

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

  // Load the signed-in user's identity
  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount =
    notifications?.filter((item) => !item.is_read).length ?? 0;

  const refreshNotifications =
    useCallback(async (): Promise<void> => {
      setNotifLoading(true);
      setNotifError(null);

      try {
        const items = await getNotifications(20);
        setNotifications(items);
      } catch (err) {
        setNotifError(
          err instanceof Error
            ? err.message
            : "Could not load notifications."
        );
      } finally {
        setNotifLoading(false);
      }
    }, []);

  // Load on mount and refresh every 60s. The initial call is
  // deferred so no state update runs synchronously in the effect.
  useEffect(() => {
    void Promise.resolve().then(refreshNotifications);

    const interval = window.setInterval(() => {
      void refreshNotifications();
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshNotifications]);

  async function handleMarkAllRead(): Promise<void> {
    if (notifBusy || unreadCount === 0) return;

    setNotifBusy(true);
    setNotifError(null);

    try {
      await markAllNotificationsRead();
      setNotifications(
        (current) =>
          current?.map((item) => ({
            ...item,
            is_read: true,
          })) ?? null
      );
    } catch (err) {
      setNotifError(
        err instanceof Error
          ? err.message
          : "Could not update notifications."
      );
    } finally {
      setNotifBusy(false);
    }
  }

  async function handleMarkRead(
    id: string
  ): Promise<void> {
    if (notifBusy) return;

    const previous = notifications;

    // Optimistic update
    setNotifications(
      (current) =>
        current?.map((item) =>
          item.id === id
            ? { ...item, is_read: true }
            : item
        ) ?? null
    );

    try {
      await markNotificationRead(id);
    } catch (err) {
      setNotifications(previous);
      setNotifError(
        err instanceof Error
          ? err.message
          : "Could not update that notification."
      );
    }
  }

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
      aria-label="Search the Knowledge Hub"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.blur();
          return;
        }

        if (event.key === "Enter") {
          const query = event.currentTarget.value.trim();

          if (query) {
            event.currentTarget.blur();
            router.push(
              `/workspace/knowledge?q=${encodeURIComponent(query)}`
            );
          }
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

              setNotificationsOpen((current) => {
                const next = !current;

                if (next) {
                  void refreshNotifications();
                }

                return next;
              });
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

            {/* Unread indicator (hidden when disabled or read) */}
            {badgeEnabled && unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread notifications`}
                className="absolute right-[9px] top-[8px] h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              />
            )}
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
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : notifications && notifications.length > 0
                        ? "All caught up"
                        : "Recent workspace activity"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={notifBusy || unreadCount === 0}
                  className="text-[11px] font-medium text-cyan-400 transition-colors hover:text-cyan-300 disabled:cursor-not-allowed disabled:text-slate-600"
                >
                  {notifBusy ? "Saving..." : "Mark all read"}
                </button>

              </div>

              {/* List */}
              <div className="max-h-[320px] overflow-y-auto">

                {/* Loading skeleton */}
                {notifLoading && notifications === null && (
                  <div className="space-y-3 p-4" aria-busy="true">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className="h-10 animate-pulse rounded-lg bg-white/[0.03]"
                      />
                    ))}
                  </div>
                )}

                {/* Error */}
                {notifError && (
                  <div className="border-b border-white/[0.05] px-4 py-3">
                    <p className="text-[11px] text-amber-400">
                      {notifError}
                    </p>
                  </div>
                )}

                {/* Empty state */}
                {!notifLoading &&
                  notifications !== null &&
                  notifications.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-slate-500">
                        You&apos;re all caught up.
                      </p>

                      <p className="mt-1 text-[11px] text-slate-600">
                        Notifications appear here when tasks,
                        documents or workflows need attention.
                      </p>
                    </div>
                  )}

                {/* Items */}
                {notifications?.map((item) => {
                  const dotColor =
                    item.notification_type === "task"
                      ? "bg-amber-400"
                      : item.notification_type === "workflow"
                        ? "bg-violet-400"
                        : item.notification_type === "document"
                          ? "bg-emerald-400"
                          : item.notification_type === "ai"
                            ? "bg-sky-400"
                            : "bg-cyan-400";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (!item.is_read) {
                          void handleMarkRead(item.id);
                        }
                      }}
                      className="flex w-full gap-3 border-b border-white/[0.05] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.025]"
                    >
                      <div
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          item.is_read
                            ? "bg-white/[0.15]"
                            : `${dotColor} shadow-[0_0_8px_rgba(34,211,238,0.4)]`
                        }`}
                      />

                      <div className="min-w-0">
                        <p
                          className={`text-xs ${
                            item.is_read
                              ? "font-normal text-slate-400"
                              : "font-medium text-slate-200"
                          }`}
                        >
                          {item.title}
                        </p>

                        <p className="mt-1 break-words text-[11px] leading-4 text-slate-500">
                          {item.message}
                        </p>

                        <p className="mt-1.5 text-[10px] text-slate-600">
                          {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}

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
              {currentUser?.initials ?? ""}
            </div>

            {/* User information */}
            <div className="hidden text-left md:block">

              <p className="max-w-[130px] truncate text-sm font-medium text-white">
                {currentUser?.displayName ?? "\u2026"}
              </p>

              <p className="mt-0.5 text-[11px] text-slate-500">
                {currentUser?.email ?? ""}
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
                    {currentUser?.initials ?? ""}
                  </div>

                  <div className="min-w-0">

                    <p className="truncate text-sm font-medium text-white">
                      {currentUser?.displayName ?? "\u2026"}
                    </p>

                    <p className="truncate text-[11px] text-slate-500">
                      {currentUser?.email ?? ""}
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