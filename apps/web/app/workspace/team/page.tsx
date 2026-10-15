"use client";

/* =========================================================
   TEAM — organization members, roles, invitations and
   departments (migration 0005).

   Every mutation goes through the RLS/RBAC rules of
   migration 0005: owners change roles, admins manage
   members and departments, members see the directory.
========================================================= */

import {
  Briefcase,
  Building2,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getCurrentOrg } from "@/lib/orgContext";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  getMembers,
  getMyOrganization,
  getOrgInvitations,
  inviteMember,
  removeMember,
  revokeInvitation,
  setMemberDepartment,
  setMemberRole,
  type Department,
  type OrgInvitation,
  type OrgMember,
  type OrgRole,
} from "@/lib/orgs";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);

  if (parts.length === 0 || (parts.length === 1 && !parts[0])) {
    return "?";
  }

  return parts.map((part) => part[0]!.toUpperCase()).join("");
}

function formatDate(value: string): string {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function roleBadgeClass(role: OrgRole): string {
  if (role === "owner") {
    return "border-amber-400/25 bg-amber-400/[0.08] text-amber-300";
  }

  if (role === "admin") {
    return "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-300";
  }

  return "border-white/[0.1] bg-white/[0.04] text-slate-400";
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [orgName, setOrgName] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>(
    []
  );
  const [invitations, setInvitations] = useState<OrgInvitation[]>(
    []
  );

  /* Page-load timestamp: invitation expiry is compared against
     this rather than calling Date.now() during render. */
  const [loadedAt] = useState(() => Date.now());
  const [role, setRole] = useState<OrgRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "admin" | "member"
  >("member");
  const [deptName, setDeptName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const snapshot = await getCurrentOrg();

        if (cancelled) {
          return;
        }

        if (!snapshot?.orgId) {
          setMembers([]);
          setDepartments([]);
          setInvitations([]);
          setRole(null);
          setUserId(snapshot?.userId ?? null);
          setError(
            "You are not a member of an organization yet."
          );
          return;
        }

        const adminish =
          snapshot.role === "owner" || snapshot.role === "admin";

        const [org, memberRows, deptRows, pending] =
          await Promise.all([
            getMyOrganization(),
            getMembers(),
            getDepartments(),
            /* RLS: only org administrators can read these. */
            adminish
              ? getOrgInvitations()
              : Promise.resolve([] as OrgInvitation[]),
          ]);

        if (cancelled) {
          return;
        }

        setOrgName(org?.name ?? null);
        setMembers(memberRows);
        setDepartments(deptRows);
        setInvitations(pending);
        setRole(snapshot.role);
        setUserId(snapshot.userId);
        setError(null);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "The team could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(load);

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const canInvite = role === "owner" || role === "admin";
  const canChangeRole = role === "owner";
  const canManageDept = role === "owner" || role === "admin";
  const ownerCount = members.filter(
    (member) => member.role === "owner"
  ).length;

  function refresh() {
    /* run() clears the notice at the start of each action,
       so a success message survives the reload. */
    setReloadKey((key) => key + 1);
  }

  async function run(
    action: () => Promise<void>,
    success?: string
  ) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await action();

      if (success) {
        setNotice(success);
      }

      refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The operation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleInvite(event: FormEvent) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const address = inviteEmail.trim().toLowerCase();

    setBusy(true);
    setError(null);
    setNotice(null);

    void (async () => {
      try {
        await inviteMember(address, inviteRole);
        setInviteEmail("");

        /* Best-effort email; honest about unconfigured. */
        let emailed = false;

        try {
          const response = await fetch(
            "/api/org/invite-email",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: address }),
            }
          );

          const payload = (await response.json().catch(
            () => ({})
          )) as { status?: string };

          emailed = payload.status === "sent";
        } catch {
          /* delivery is never required for the invite itself */
        }

        setNotice(
          emailed
            ? `Invitation created for ${address} — email sent.`
            : `Invitation created for ${address}. Email delivery is not configured — ask them to sign up with that address.`
        );

        refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The invitation could not be created."
        );
      } finally {
        setBusy(false);
      }
    })();
  }

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
              {orgName
                ? `Members of ${orgName}. Roles decide who can invite, change roles and manage departments.`
                : "Members of your organization. Roles decide who can invite, change roles and manage departments."}
            </p>
          </div>
        </div>
      </section>

      {/* Feedback */}
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-300"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3 text-xs leading-5 text-cyan-200"
        >
          {notice}
        </p>
      ) : null}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">Members</p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {loading ? "—" : members.length}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">Departments</p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {loading ? "—" : departments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-xl">
          <p className="text-xs text-slate-600">Your role</p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {loading ? (
              "—"
            ) : role ? (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-sm font-medium ${roleBadgeClass(role)}`}
              >
                {ROLE_LABEL[role]}
              </span>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {/* Members */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Members
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Owners change roles. Admins can remove members and
            assign departments.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            Loading members…
          </div>
        ) : members.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-600">
            No members found.
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isSelf = member.user_id === userId;
              const soleOwner =
                member.role === "owner" && ownerCount === 1;

              return (
                <div
                  key={member.user_id}
                  className="group flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.02]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-semibold text-[#06101b]">
                    {initials(member.display_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-300 group-hover:text-white">
                      {member.display_name}

                      {isSelf ? (
                        <span className="ml-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                          You
                        </span>
                      ) : null}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      {member.designation ? (
                        <span className="flex items-center gap-1.5">
                          <Briefcase size={11} />
                          {member.designation}
                        </span>
                      ) : null}

                      <span className="flex items-center gap-1.5">
                        <Shield size={11} />
                        Joined {formatDate(member.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Role (owner-controlled) */}
                  {canChangeRole && !soleOwner ? (
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="sr-only">
                        Role for {member.display_name}
                      </span>

                      <select
                        value={member.role}
                        disabled={
                          busy ||
                          (isSelf && soleOwner)
                        }
                        onChange={(event) =>
                          void run(() =>
                            setMemberRole(
                              member.user_id,
                              event.target.value as OrgRole
                            ),
                            `Role updated for ${member.display_name}.`
                          )
                        }
                        className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 text-xs text-slate-300 outline-none transition-colors focus:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    </label>
                  ) : (
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${roleBadgeClass(member.role)}`}
                    >
                      {ROLE_LABEL[member.role]}
                    </span>
                  )}

                  {/* Department assignment (admin) */}
                  {canManageDept ? (
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="sr-only">
                        Department for {member.display_name}
                      </span>

                      <select
                        value={member.department_id ?? ""}
                        disabled={busy}
                        onChange={(event) =>
                          void run(() =>
                            setMemberDepartment(
                              member.user_id,
                              event.target.value || null
                            ),
                            `Department updated for ${member.display_name}.`
                          )
                        }
                        className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 text-xs text-slate-300 outline-none transition-colors focus:border-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">No department</option>

                        {departments.map((department) => (
                          <option
                            key={department.id}
                            value={department.id}
                          >
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {/* Remove (admin, not self, not last owner) */}
                  {canManageDept && !isSelf && !soleOwner ? (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Remove ${member.display_name}`}
                      onClick={() =>
                        void run(
                          () => removeMember(member.user_id),
                          `${member.display_name} was removed.`
                        )
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-400/15 text-red-300/70 transition-colors hover:border-red-400/40 hover:bg-red-400/[0.08] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Invitations (administrators) */}
      {canInvite ? (
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-white">
              Invitations
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Invited accounts appear here until they accept.
              Invitations expire after 7 days — re-inviting the
              same address extends the window.
            </p>
          </div>

          <form
            onSubmit={handleInvite}
            className="mb-4 flex flex-wrap items-end gap-3"
          >
            <label className="min-w-[220px] flex-1">
              <span className="mb-1.5 block text-xs text-slate-500">
                Email address
              </span>

              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(event) =>
                  setInviteEmail(event.target.value)
                }
                placeholder="teammate@company.com"
                className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/30"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs text-slate-500">
                Role
              </span>

              <select
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(
                    event.target.value as "admin" | "member"
                  )
                }
                className="h-10 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-slate-300 outline-none transition-colors focus:border-cyan-400/30"
              >
                <option value="member">Member</option>

                {role === "owner" ? (
                  <option value="admin">Admin</option>
                ) : null}
              </select>
            </label>

            <button
              type="submit"
              disabled={busy || !inviteEmail.trim()}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-cyan-400/10 px-4 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus size={14} />
              Invite
            </button>
          </form>

          {invitations.length === 0 ? (
            <p className="text-xs text-slate-600">
              No pending invitations.
            </p>
          ) : (
            <div className="space-y-2">
              {invitations.map((invitation) => {
                const expired =
                  new Date(invitation.expires_at).getTime() <=
                  loadedAt;

                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm text-slate-300">
                        <Mail size={13} className="shrink-0" />
                        <span className="truncate">
                          {invitation.email}
                        </span>
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-600">
                        {ROLE_LABEL[invitation.role]} · sent{" "}
                        {formatDate(invitation.created_at)}{" "}
                        {expired ? (
                          <span className="text-amber-400/80">
                            · expired — invite again to extend
                          </span>
                        ) : (
                          `· expires ${formatDate(invitation.expires_at)}`
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => revokeInvitation(invitation.id),
                          "Invitation revoked."
                        )
                      }
                      className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-red-400/30 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Departments (administrators) */}
      {canManageDept ? (
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-white">
              Departments
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Optional grouping for members. Deleting a
              department clears it from its members.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();

              void run(async () => {
                await createDepartment(deptName);
                setDeptName("");
              }, "Department created.");
            }}
            className="mb-4 flex flex-wrap items-center gap-3"
          >
            <label className="min-w-[220px] flex-1">
              <span className="mb-1.5 block text-xs text-slate-500">
                Department name
              </span>

              <input
                type="text"
                required
                maxLength={80}
                value={deptName}
                onChange={(event) =>
                  setDeptName(event.target.value)
                }
                placeholder="Engineering"
                className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/30"
              />
            </label>

            <button
              type="submit"
              disabled={busy || !deptName.trim()}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-cyan-400/10 px-4 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Building2 size={14} />
              Add
            </button>
          </form>

          {departments.length === 0 ? (
            <p className="text-xs text-slate-600">
              No departments yet.
            </p>
          ) : (
            <div className="space-y-2">
              {departments.map((department) => {
                const assigned = members.filter(
                  (member) =>
                    member.department_id === department.id
                ).length;

                return (
                  <div
                    key={department.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5"
                  >
                    <div>
                      <p className="text-sm text-slate-300">
                        {department.name}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-600">
                        {assigned} member
                        {assigned === 1 ? "" : "s"} assigned
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Delete ${department.name}`}
                      onClick={() =>
                        void run(
                          () => deleteDepartment(department.id),
                          "Department deleted."
                        )
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-400/15 text-red-300/70 transition-colors hover:border-red-400/40 hover:bg-red-400/[0.08] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
