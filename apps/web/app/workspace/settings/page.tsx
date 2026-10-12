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
  Building2,
  Check,
  Lock,
  LogOut,
  Moon,
  Save,
  Shield,
  Trash2,
  User,
  Settings as SettingsIcon,
} from "lucide-react";

import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { getCurrentOrg } from "@/lib/orgContext";
import {
  deleteMyOrganization,
  getMyOrganization,
  leaveOrganization,
  renameOrganization,
  type Organization,
  type OrgRole,
} from "@/lib/orgs";
import { logAuditClient } from "@/lib/audit";
import {
  getOwnProfile,
  updateOwnProfile,
  type Profile,
} from "@/lib/profiles";
import {
  disableTotp,
  enrollTotp,
  listTotpFactors,
  verifyTotp,
  type TotpEnrollment,
  type TotpFactor,
} from "@/lib/mfa";
import {
  getBadgePrefServerSnapshot,
  getBadgePrefSnapshot,
  setBadgePref,
  subscribeToBadgePref,
} from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";

const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

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

  /* ---------------- organization ---------------- */
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null);
  const [orgNameInput, setOrgNameInput] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgMessage, setOrgMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  /* ---------------- two-factor (TOTP) ---------------- */
  const [totpFactors, setTotpFactors] = useState<TotpFactor[]>(
    []
  );
  const [enrollment, setEnrollment] =
    useState<TotpEnrollment | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMessage, setMfaMessage] = useState<{
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
      const [user, ownProfile, snapshot] = await Promise.all([
        getCurrentUser(),
        getOwnProfile().catch(() => null),
        getCurrentOrg(),
      ]);

      const org = snapshot?.orgId
        ? await getMyOrganization().catch(() => null)
        : null;

      const factors = await listTotpFactors().catch(
        () => [] as TotpFactor[]
      );

      setTotpFactors(factors);
      setCurrentUser(user);
      setProfile(ownProfile);
      setOrganization(org);
      setOrgRole(snapshot?.role ?? null);
      setOrgNameInput(org?.name ?? "");
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

  /* ---------------- two-factor (TOTP) ---------------- */
  async function refreshFactors(): Promise<TotpFactor[]> {
    const factors = await listTotpFactors().catch(
      () => [] as TotpFactor[]
    );

    setTotpFactors(factors);
    return factors;
  }

  async function handleMfaStart(): Promise<void> {
    if (mfaBusy) return;

    setMfaBusy(true);
    setMfaMessage(null);

    try {
      /* A pending factor from an interrupted setup cannot
         reveal its secret again — restart it cleanly. */
      const pending = totpFactors.find(
        (factor) => factor.status === "unverified"
      );

      if (pending) {
        await disableTotp(pending.id);
        await refreshFactors();
      }

      setEnrollment(await enrollTotp());
      setMfaCode("");
    } catch (err) {
      setMfaMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Two-factor setup could not be started.",
      });
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleMfaVerify(): Promise<void> {
    if (mfaBusy || !enrollment) return;

    if (!/^\d{6}$/.test(mfaCode.trim())) {
      setMfaMessage({
        kind: "error",
        text: "Enter the 6-digit code from your authenticator app.",
      });
      return;
    }

    setMfaBusy(true);
    setMfaMessage(null);

    try {
      await verifyTotp(enrollment.factorId, mfaCode);
      setEnrollment(null);
      setMfaCode("");
      await refreshFactors();
      setMfaMessage({
        kind: "success",
        text: "Two-factor authentication is now on for your account.",
      });
    } catch (err) {
      setMfaMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "That code was not accepted. Try the current code.",
      });
    } finally {
      setMfaBusy(false);
    }
  }

  async function handleMfaDisable(
    factorId: string
  ): Promise<void> {
    if (mfaBusy) return;

    const confirmed = window.confirm(
      "Turn off two-factor authentication for your account?"
    );

    if (!confirmed) return;

    setMfaBusy(true);
    setMfaMessage(null);

    try {
      await disableTotp(factorId);
      setEnrollment(null);
      await refreshFactors();
      setMfaMessage({
        kind: "success",
        text: "Two-factor authentication is off.",
      });
    } catch (err) {
      setMfaMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Two-factor authentication could not be turned off.",
      });
    } finally {
      setMfaBusy(false);
    }
  }

  /* ---------------- organization ---------------- */
  async function handleOrgRename(
    event: React.FormEvent
  ): Promise<void> {
    event.preventDefault();

    if (savingOrg) return;

    setSavingOrg(true);
    setOrgMessage(null);

    try {
      await renameOrganization(orgNameInput);
      await loadAccount();
      setOrgMessage({
        kind: "success",
        text: "Organization renamed.",
      });
    } catch (err) {
      setOrgMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Could not rename the organization.",
      });
    } finally {
      setSavingOrg(false);
    }
  }

  async function handleLeaveOrg(): Promise<void> {
    if (!organization || savingOrg) return;

    const confirmed = window.confirm(
      `Leave "${organization.name}"? You will lose access to its projects, tasks and documents unless an administrator invites you back.`
    );

    if (!confirmed) return;

    setSavingOrg(true);
    setOrgMessage(null);

    try {
      await leaveOrganization();
      /* The onboarding gate takes over on the next load. */
      window.location.href = "/workspace";
    } catch (err) {
      setSavingOrg(false);
      setOrgMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Could not leave the organization.",
      });
    }
  }

  async function handleDeleteOrg(): Promise<void> {
    if (!organization || savingOrg) return;

    const confirmed = window.confirm(
      `Delete "${organization.name}" permanently? Every project, task, document and member of this organization will be removed. This cannot be undone.`
    );

    if (!confirmed) return;

    setSavingOrg(true);
    setOrgMessage(null);

    try {
      await deleteMyOrganization();
      window.location.href = "/workspace";
    } catch (err) {
      setSavingOrg(false);
      setOrgMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Could not delete the organization.",
      });
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

  const verifiedTotp = totpFactors.find(
    (factor) => factor.status === "verified"
  );

  const pendingTotp = totpFactors.some(
    (factor) => factor.status === "unverified"
  );

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
              Manage your account, organization, preferences
              and security.
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

      {/* Organization */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Organization
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Atlas scopes every project, task and document to a
            single organization. You belong to exactly one.
          </p>
        </div>

        {loadingAccount ? (
          <div
            className="h-16 animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.02]"
            aria-busy="true"
          />
        ) : !organization ? (
          <p className="text-xs text-slate-600">
            You are not part of an organization yet.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Current organization */}
            <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                <Building2 size={16} className="text-slate-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {organization.name}
                </p>

                <p className="mt-0.5 text-[11px] text-slate-500">
                  {orgRole === "owner"
                    ? "You own this organization: you can rename it, manage roles and delete it."
                    : orgRole === "admin"
                      ? "You are an administrator: you can invite members and manage departments."
                      : "You are a member of this organization."}
                </p>
              </div>

              {orgRole ? (
                <span className="shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-2.5 py-1 text-[10px] font-medium text-cyan-300">
                  {ORG_ROLE_LABEL[orgRole]}
                </span>
              ) : null}
            </div>

            {/* Rename (owner or admin — RLS enforces this) */}
            {orgRole === "owner" || orgRole === "admin" ? (
              <form
                onSubmit={handleOrgRename}
                className="rounded-xl border border-white/[0.05] bg-black/[0.08] p-4"
              >
                <label
                  htmlFor="settings-org-name"
                  className="mb-1.5 block text-xs font-medium text-slate-400"
                >
                  Organization name
                </label>

                <div className="flex flex-wrap gap-2">
                  <input
                    id="settings-org-name"
                    type="text"
                    required
                    maxLength={120}
                    value={orgNameInput}
                    onChange={(event) =>
                      setOrgNameInput(event.target.value)
                    }
                    className="h-10 min-w-[200px] flex-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors focus:border-cyan-400/30"
                  />

                  <button
                    type="submit"
                    disabled={savingOrg || !orgNameInput.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-400/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={13} />
                    {savingOrg ? "Saving..." : "Rename"}
                  </button>
                </div>
              </form>
            ) : null}

            {orgMessage ? (
              <p
                role={orgMessage.kind === "error" ? "alert" : "status"}
                className={`text-xs ${
                  orgMessage.kind === "success"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {orgMessage.text}
              </p>
            ) : null}

            {/* Danger zone */}
            <div className="rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
              <p className="text-xs font-medium text-slate-300">
                Leave or delete
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-600">
                Leaving removes your access to this
                organization&apos;s data. The last owner can
                neither leave nor be removed, and only an owner
                can delete the organization.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingOrg}
                  onClick={() => void handleLeaveOrg()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut size={13} />
                  Leave organization
                </button>

                {orgRole === "owner" ? (
                  <button
                    type="button"
                    disabled={savingOrg}
                    onClick={() => void handleDeleteOrg()}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-medium text-red-300/80 transition-colors hover:border-red-400/40 hover:bg-red-400/[0.08] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    Delete organization
                  </button>
                ) : null}
              </div>
            </div>
          </div>
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

          {/* Two-factor authentication (TOTP) */}
          <div className="rounded-xl border border-white/[0.05] bg-black/[0.08] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                <Shield size={16} className="text-slate-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-300">
                  Two-factor authentication
                </p>

                <p className="mt-0.5 text-[11px] text-slate-600">
                  {verifiedTotp
                    ? "A verified authenticator app is linked to your account."
                    : "Add a time-based one-time code as a second factor."}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                  verifiedTotp
                    ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                    : "border-white/[0.1] bg-white/[0.04] text-slate-500"
                }`}
              >
                {verifiedTotp ? "On" : "Off"}
              </span>
            </div>

            {mfaMessage ? (
              <p
                role={mfaMessage.kind === "error" ? "alert" : "status"}
                className={`mt-3 text-xs ${
                  mfaMessage.kind === "success"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {mfaMessage.text}
              </p>
            ) : null}

            {verifiedTotp ? (
              <button
                type="button"
                disabled={mfaBusy}
                onClick={() =>
                  void handleMfaDisable(verifiedTotp.id)
                }
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Turn off two-factor
              </button>
            ) : enrollment ? (
              <div className="mt-3 space-y-3">
                <p className="text-[11px] leading-5 text-slate-500">
                  Add this key to your authenticator app
                  (Google Authenticator, 1Password, Authy…),
                  then confirm with the 6-digit code it shows:
                </p>

                <code className="block break-all rounded-lg border border-white/[0.07] bg-black/[0.2] px-3 py-2 text-xs text-cyan-300">
                  {enrollment.secret}
                </code>

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="settings-totp-code"
                    className="sr-only"
                  >
                    Authenticator code
                  </label>

                  <input
                    id="settings-totp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={mfaCode}
                    onChange={(event) =>
                      setMfaCode(event.target.value)
                    }
                    placeholder="123456"
                    className="h-10 w-32 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm tracking-[0.3em] text-white outline-none transition-colors placeholder:tracking-normal placeholder:text-slate-600 focus:border-cyan-400/30"
                  />

                  <button
                    type="button"
                    disabled={mfaBusy || !/^\d{6}$/.test(mfaCode.trim())}
                    onClick={() => void handleMfaVerify()}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-400/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Verify and enable
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={mfaBusy}
                onClick={() => void handleMfaStart()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-400/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingTotp
                  ? "Restart setup"
                  : "Set up two-factor"}
              </button>
            )}

            <p className="mt-3 text-[11px] leading-4 text-slate-600">
              Enrolling and verifying work against your
              Supabase project&apos;s MFA support. Requiring
              the second factor at sign-in is a project-level
              setting — test a real sign-in before enforcing
              it.
            </p>
          </div>

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
                Every table ships with row-level security
                (migrations 0001–0006): workspace data is
                scoped to your organization, personal data
                stays yours alone, and role changes are
                enforced by the database.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
