"use client";

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  useState,
} from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  Lock,
  Moon,
  Save,
  Shield,
  User,
  Settings as SettingsIcon,
} from "lucide-react";

import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { logAuditClient } from "@/lib/audit";
import {
  getOwnProfile,
  updateOwnProfile,
  type Profile,
} from "@/lib/profiles";
import {
  getBadgePrefServerSnapshot,
  getBadgePrefSnapshot,
  setBadgePref,
  subscribeToBadgePref,
} from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
  /* ---------------- account data ---------------- */
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [accountError, setAccountError] =
    useState<string | null>(null);

  /* ---------------- profile edit form ---------------- */
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [designation, setDesignation] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  /* ---------------- password ---------------- */
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const loadAccount = useCallback(async () => {
    setLoadingAccount(true);
    setAccountError(null);

    try {
      const [user, ownProfile] = await Promise.all([
        getCurrentUser(),
        getOwnProfile().catch(() => null),
      ]);

      setCurrentUser(user);
      setProfile(ownProfile);
    } catch (err) {
      setAccountError(
        err instanceof Error
          ? err.message
          : "Could not load your account."
      );
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(loadAccount);
  }, [loadAccount]);

  /* Preference lives in localStorage; the hook re-renders this
     page whenever the value changes anywhere. */
  const notificationsEnabled = useSyncExternalStore(
    subscribeToBadgePref,
    getBadgePrefSnapshot,
    getBadgePrefServerSnapshot
  );

  /* ---------------- profile save ---------------- */
  async function handleProfileSave(
    event: React.FormEvent
  ): Promise<void> {
    event.preventDefault();

    if (savingProfile) return;

    setSavingProfile(true);
    setProfileMessage(null);

    try {
      await updateOwnProfile({
        display_name: displayName,
        designation: designation.trim() || null,
      });

      /* Keep auth metadata in sync so the top bar and
         dashboard headers reflect the new name. */
      const { error: metadataError } = await supabase.auth.updateUser(
        {
          data: { full_name: displayName.trim() },
        }
      );

      if (metadataError) {
        throw new Error(metadataError.message);
      }

      await logAuditClient({
        action: "profile.update",
        entity: "profile",
        entityId: currentUser?.id ?? null,
      });

      await loadAccount();
      setEditing(false);
      setProfileMessage({
        kind: "success",
        text: "Profile updated.",
      });
    } catch (err) {
      setProfileMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Could not update your profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  /* ---------------- notifications preference ---------------- */
  function toggleNotifications(): void {
    setBadgePref(!notificationsEnabled);
  }

  /* ---------------- password change ---------------- */
  async function handlePasswordSave(
    event: React.FormEvent
  ): Promise<void> {
    event.preventDefault();

    if (savingPassword) return;

    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({
        kind: "error",
        text: "The new password must be at least 8 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        kind: "error",
        text: "The passwords do not match.",
      });
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        kind: "success",
        text: "Password updated.",
      });
    } catch (err) {
      setPasswordMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Could not update your password.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  const initials =
    (profile?.display_name || currentUser?.displayName || "U")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  /* ---------------- render ---------------- */
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
              Manage your Atlas account, preferences and
              security.
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

        {loadingAccount && (
          <div
            className="h-16 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.02]"
            aria-busy="true"
          />
        )}

        {!loadingAccount && accountError && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/10 bg-amber-400/[0.04] p-4">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-amber-400"
            />

            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-400">
                Could not load your account
              </p>

              <p className="mt-1 break-words text-xs text-slate-500">
                {accountError}
              </p>
            </div>
          </div>
        )}

        {!loadingAccount && !accountError && (
          <>
            <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/[0.08] p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-semibold text-[#06101b]">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {profile?.display_name ??
                    currentUser?.displayName ??
                    "—"}
                </p>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {currentUser?.email ?? "Signed out"}
                  {profile?.designation
                    ? ` · ${profile.designation}`
                    : ""}
                </p>
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setDisplayName(
                      profile?.display_name ??
                        currentUser?.displayName ??
                        ""
                    );
                    setDesignation(profile?.designation ?? "");
                    setProfileMessage(null);
                    setEditing(true);
                  }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  <User size={13} />
                  Edit
                </button>
              )}
            </div>

            {/* Edit form */}
            {editing && (
              <form
                onSubmit={handleProfileSave}
                className="mt-4 space-y-4 rounded-xl border border-white/[0.06] bg-black/[0.2] p-4"
              >
                <div>
                  <label
                    htmlFor="settings-display-name"
                    className="mb-1.5 block text-xs font-medium text-slate-400"
                  >
                    Display name
                  </label>

                  <input
                    id="settings-display-name"
                    type="text"
                    required
                    maxLength={120}
                    value={displayName}
                    onChange={(event) =>
                      setDisplayName(event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-designation"
                    className="mb-1.5 block text-xs font-medium text-slate-400"
                  >
                    Designation{" "}
                    <span className="text-slate-600">
                      (optional)
                    </span>
                  </label>

                  <input
                    id="settings-designation"
                    type="text"
                    maxLength={120}
                    value={designation}
                    onChange={(event) =>
                      setDesignation(event.target.value)
                    }
                    placeholder="e.g. Engineering Manager"
                    className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/30"
                  />
                </div>

                {profileMessage && (
                  <p
                    className={`text-xs ${
                      profileMessage.kind === "success"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                    role="status"
                  >
                    {profileMessage.text}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-400/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={13} />
                    {savingProfile ? "Saving..." : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setProfileMessage(null);
                    }}
                    className="rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>

      {/* Preferences */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Preferences
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Customize how Atlas behaves for you. Preferences
            are stored in this browser.
          </p>
        </div>

        <div className="space-y-2">
          {/* Theme */}
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <Moon size={16} className="text-slate-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-300">
                Appearance
              </p>

              <p className="mt-1 text-[11px] text-slate-600">
                Atlas currently ships a single dark theme —
                there is no light mode to switch to yet.
              </p>
            </div>

            <span className="rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-cyan-400">
              Dark
            </span>
          </div>

          {/* Notifications */}
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <Bell size={16} className="text-slate-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-300">
                Notification badge
              </p>

              <p className="mt-1 text-[11px] text-slate-600">
                Show the unread badge on the top-bar bell.
                Notifications themselves always arrive.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              aria-label="Toggle notification badge"
              onClick={toggleNotifications}
              className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                notificationsEnabled
                  ? "bg-cyan-400"
                  : "bg-white/[0.12]"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  notificationsEnabled
                    ? "translate-x-4"
                    : "translate-x-0"
                }`}
              />
            </button>
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
            Manage account security and review how Atlas
            protects your data.
          </p>
        </div>

        <div className="space-y-2">
          {/* Password change */}
          <form
            onSubmit={handlePasswordSave}
            className="space-y-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                <Lock size={16} className="text-slate-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-300">
                  Change password
                </p>

                <p className="mt-1 text-[11px] text-slate-600">
                  Signed in with email and password. Changing
                  it here updates your Supabase account.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="settings-new-password"
                  className="mb-1.5 block text-xs font-medium text-slate-400"
                >
                  New password
                </label>

                <input
                  id="settings-new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/30"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-confirm-password"
                  className="mb-1.5 block text-xs font-medium text-slate-400"
                >
                  Confirm new password
                </label>

                <input
                  id="settings-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/30"
                />
              </div>
            </div>

            {passwordMessage && (
              <p
                className={`text-xs ${
                  passwordMessage.kind === "success"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
                role="status"
              >
                {passwordMessage.text}
              </p>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-400/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shield size={13} />
              {savingPassword
                ? "Updating..."
                : "Update password"}
            </button>
          </form>

          {/* Session info */}
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <Check
                size={16}
                className="text-emerald-400"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-300">
                Authentication
              </p>

              <p className="mt-1 text-[11px] text-slate-600">
                Sessions are issued by Supabase Auth and stored
                in HTTP-only cookies; middleware guards every
                /workspace route.
              </p>
            </div>
          </div>

          {/* RLS info */}
          <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <Shield
                size={16}
                className="text-slate-400"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-300">
                Data access
              </p>

              <p className="mt-1 text-[11px] text-slate-600">
                Every table ships with owner-only row-level
                security policies (migrations 0001–0003), so
                you only ever query your own rows.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
