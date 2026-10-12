"use client";

/* =========================================================
   ORGANIZATION ONBOARDING GATE

   Migration 0005 scopes every workspace table to the
   caller's organization. A brand-new account belongs to no
   organization yet, so this gate replaces the workspace
   until the user either creates one or accepts a pending
   invitation. Nothing else in the app has to guess.
========================================================= */

import {
  Building2,
  Loader2,
  LogOut,
  Mail,
  Plus,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useState,
} from "react";

import { getCurrentOrg } from "@/lib/orgContext";
import {
  acceptInvitation,
  createOrganization,
  getMyInvitations,
  type Invitation,
} from "@/lib/orgs";
import { supabase } from "@/lib/supabaseClient";

type GateState = "loading" | "setup" | "ready";

type OrgGateProps = {
  children: ReactNode;
};

export default function OrgGate({ children }: OrgGateProps) {
  const [state, setState] = useState<GateState>("loading");
  const [invitations, setInvitations] = useState<Invitation[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [snapshot, pending] = await Promise.all([
          getCurrentOrg(),
          getMyInvitations(),
        ]);

        if (cancelled) {
          return;
        }

        setInvitations(pending);
        setError(null);
        setState(snapshot?.orgId ? "ready" : "setup");
      } catch (caught) {
        if (cancelled) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "Your organization status could not be loaded."
        );
        setState("setup");
      }
    }

    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(load);

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await createOrganization(orgName);
      setOrgName("");
      setReloadKey((key) => key + 1);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The organization could not be created."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(invitation: Invitation) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await acceptInvitation(invitation.id);
      setReloadKey((key) => key + 1);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be accepted."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (state === "ready") {
    return <>{children}</>;
  }

  /* ---------- LOADING ---------- */

  if (state === "loading") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#050816] text-white">
        <Loader2
          size={18}
          className="animate-spin text-cyan-400"
          aria-hidden="true"
        />

        <p className="text-xs text-slate-500">
          Loading your workspace…
        </p>
      </div>
    );
  }

  /* ---------- SETUP (create or join) ---------- */

  return (
    <div className="flex min-h-screen flex-col bg-[#050816] text-white">
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <main className="w-full max-w-md">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06]">
                <Building2
                  size={20}
                  strokeWidth={1.7}
                  className="text-cyan-400"
                  aria-hidden="true"
                />
              </div>

              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                  Set up your organization
                </h1>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Atlas organizes every project, task and
                  document inside a single organization. Create
                  one, or accept an invitation below.
                </p>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="mb-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-300"
              >
                {error}
              </p>
            ) : null}

            {/* Pending invitations */}
            {invitations.length > 0 ? (
              <section
                aria-label="Pending invitations"
                className="mb-6 space-y-3"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invitations
                </h2>

                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {invitation.organization_name}
                      </p>

                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Mail size={11} aria-hidden="true" />
                        <span className="truncate">
                          Invited by {invitation.invited_by_name}
                          {" · "}
                          {invitation.role}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAccept(invitation)}
                      className="shrink-0 rounded-lg bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </section>
            ) : null}

            {/* Create organization */}
            <form onSubmit={(event) => void handleCreate(event)}>
              <label
                htmlFor="org-name"
                className="mb-1.5 block text-xs text-slate-500"
              >
                Organization name
              </label>

              <div className="flex gap-2">
                <input
                  id="org-name"
                  type="text"
                  required
                  minLength={1}
                  maxLength={120}
                  value={orgName}
                  onChange={(event) =>
                    setOrgName(event.target.value)
                  }
                  placeholder="Acme Inc."
                  className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/30"
                />

                <button
                  type="submit"
                  disabled={busy || !orgName.trim()}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-cyan-400/10 px-4 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus size={14} aria-hidden="true" />
                  )}

                  Create
                </button>
              </div>
            </form>

            <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <p className="text-[11px] leading-4 text-slate-600">
                One account belongs to one organization.
              </p>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300"
              >
                <LogOut size={12} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
