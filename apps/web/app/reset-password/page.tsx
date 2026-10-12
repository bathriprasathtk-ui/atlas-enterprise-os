"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";

type Stage = "verifying" | "set-password" | "done" | "invalid";

/**
 * Landing page for the password-reset email.
 *
 * Supabase issues a PKCE code at /reset-password?code=...;
 * exchanging it establishes a recovery session, after which
 * the user chooses a new password. The link must be opened
 * in the same browser that requested it (PKCE verifier).
 */
export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            if (!cancelled) setStage("invalid");
            return;
          }
        }

        /* Session established by the exchange, by the email
           link's implicit token, or already present. */
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled) {
          setStage(session ? "set-password" : "invalid");
        }
      } catch (err) {
        console.error("Reset verification error:", err);

        if (!cancelled) setStage("invalid");
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (saving) return;
    setError("");

    if (password.length < 6) {
      setError("The password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setStage("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The password could not be updated."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050816] px-6 py-10 text-white">
      <Card className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#0b1220]/85 p-7 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        {stage === "verifying" && (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-400" role="status">
              Verifying your reset link…
            </p>
          </div>
        )}

        {stage === "invalid" && (
          <div className="py-4 text-center">
            <h1 className="text-xl font-semibold text-white">
              This link is not valid
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Reset links expire and can only be used once, in
              the browser that requested them. Request a fresh
              link and try again.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400"
            >
              Back to sign in
            </Link>
          </div>
        )}

        {stage === "set-password" && (
          <form onSubmit={handleSave}>
            <h1 className="text-xl font-semibold text-white">
              Choose a new password
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Your identity is verified for this session. Pick a
              new password for your Atlas account.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300"
              >
                {error}
              </div>
            )}

            <div className="mt-6">
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                New password
              </label>

              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="confirm-new-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Confirm new password
              </label>

              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="mt-7 h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-500 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Update password"}
            </Button>
          </form>
        )}

        {stage === "done" && (
          <div className="py-4 text-center">
            <h1 className="text-xl font-semibold text-white">
              Password updated
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Your new password is active. You are still signed
              in on this device.
            </p>

            <Link
              href="/workspace/dashboard"
              className="mt-6 inline-flex rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400"
            >
              Continue to Atlas
            </Link>
          </div>
        )}
      </Card>
    </main>
  );
}
