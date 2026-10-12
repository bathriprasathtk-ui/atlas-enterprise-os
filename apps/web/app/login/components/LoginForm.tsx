"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

import {
  sendPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
} from "@/lib/auth";

type Mode = "signin" | "signup" | "reset";

/**
 * Build-time flag: the Google button only appears when the
 * Google provider is configured in Supabase AND this flag is
 * set for the build. Nothing fake is ever rendered.
 */
const GOOGLE_SSO_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "1";

const HEADERS: Record<
  Mode,
  { eyebrow: string; title: string; subtitle: string }
> = {
  signin: {
    eyebrow: "Welcome back",
    title: "Sign in to Atlas",
    subtitle: "Access your organization and workspace.",
  },
  signup: {
    eyebrow: "New workspace",
    title: "Create your account",
    subtitle:
      "Set up your Atlas account and start organizing your work.",
  },
  reset: {
    eyebrow: "Account recovery",
    title: "Reset your password",
    subtitle:
      "We will email you a link to choose a new password.",
  },
};

export default function LoginForm() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const header = HEADERS[mode];

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  /* ---------------- actions ---------------- */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setNotice("");
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error: signInError } = await signIn(
          email.trim(),
          password
        );

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.replace("/workspace/dashboard");
        router.refresh();
        return;
      }

      if (mode === "signup") {
        if (name.trim().length < 2) {
          setError("Please enter your name.");
          return;
        }

        if (password.length < 6) {
          setError(
            "The password must be at least 6 characters."
          );
          return;
        }

        const { data, error: signUpError } = await signUp(
          name,
          email.trim(),
          password
        );

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          /* Email confirmation disabled: signed in already. */
          router.replace("/workspace/dashboard");
          router.refresh();
          return;
        }

        setNotice(
          "Your account was created. Check your inbox to confirm your email, then sign in."
        );
        return;
      }

      /* mode === "reset" */
      const { error: resetError } = await sendPasswordReset(
        email.trim()
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setNotice(
        "If an account exists for that address, a password reset link is on its way. Open it on this device."
      );
    } catch (err) {
      console.error("Auth error:", err);

      setError(
        "Unable to connect to the authentication service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (loading) return;

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const { error: oauthError } =
        await signInWithGoogle();

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
      /* On success the browser navigates to Google. */
    } catch (err) {
      console.error("OAuth error:", err);
      setError(
        "Unable to start Google sign-in. Please try again."
      );
      setLoading(false);
    }
  }

  const busyLabel =
    mode === "signin"
      ? "Signing in..."
      : mode === "signup"
        ? "Creating account..."
        : "Sending link...";

  const submitLabel =
    mode === "signin"
      ? "Sign in  →"
      : mode === "signup"
        ? "Create account  →"
        : "Send reset link  →";

  return (
    <Card className="relative w-full rounded-[24px] border border-white/10 bg-[#0b1220]/85 p-7 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-500 sm:p-8">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="mb-7">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="text-cyan-400"
            >
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>

          <p className="mb-1.5 text-sm font-medium text-cyan-400">
            {header.eyebrow}
          </p>

          <h2 className="text-2xl font-semibold tracking-tight text-white">
            {header.title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {header.subtitle}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3">
            <p className="text-sm leading-5 text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* Notice (success / info) */}
        {notice && (
          <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3">
            <p className="text-sm leading-5 text-emerald-300">
              {notice}
            </p>
          </div>
        )}

        {/* Name (signup only) */}
        {mode === "signup" && (
          <div className="mb-5">
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Full name
            </label>

            <Input
              id="name"
              type="text"
              placeholder="Ada Lovelace"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError("");
              }}
              autoComplete="name"
              required
            />
          </div>
        )}

        {/* Email */}
        <div className="mb-5">
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Email address
          </label>

          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
            autoComplete="email"
            required
          />
        </div>

        {/* Password (not in reset mode) */}
        {mode !== "reset" && (
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-300"
              >
                Password
              </label>

              {mode === "signin" && (
                <button
                  type="button"
                  className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
                  onClick={() => switchMode("reset")}
                >
                  Forgot password?
                </button>
              )}
            </div>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={
                  mode === "signup"
                    ? "At least 6 characters"
                    : "Enter your password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError("");
                }}
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                required
                minLength={mode === "signup" ? 6 : undefined}
                className="pr-12"
              />

              {/* Password visibility */}
              <button
                type="button"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.05] hover:text-cyan-400"
              >
                {showPassword ? (
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.8 4.3A10.5 10.5 0 0 1 12 4c5.2 0 8.6 4 9.5 8-0.4 1.1-1.1 2.3-2.1 3.4" />
                    <path d="M6.3 6.3C4.1 7.7 2.9 9.5 2.5 12c1 2.9 4.4 6 9.5 6 1 0 2-.2 2.9-.5" />
                  </svg>
                ) : (
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Confirm password (signup only) */}
        {mode === "signup" && (
          <div className="mb-5">
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Confirm password
            </label>

            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (error) setError("");
              }}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
        )}

        {/* Session note (signin only — replaces the old
            non-functional "Remember me" checkbox) */}
        {mode === "signin" && (
          <div className="mb-6 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Sessions use secure, HTTP-only cookies.
            </span>

            <span className="text-xs text-slate-600">
              Secure session
            </span>
          </div>
        )}

        {(mode === "reset" || mode === "signup") && (
          <div className="mb-6" />
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-500 text-sm font-semibold shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? busyLabel : submitLabel}
        </Button>

        {/* Google SSO (opt-in via build flag + provider config) */}
        {mode === "signin" && GOOGLE_SSO_ENABLED && (
          <>
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/[0.08]" />

              <span className="text-xs text-slate-600">or</span>

              <span className="h-px flex-1 bg-white/[0.08]" />
            </div>

            <Button
              type="button"
              disabled={loading}
              onClick={() => void handleGoogleSignIn()}
              className="h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.03] text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Google
            </Button>
          </>
        )}

        {/* Mode switcher */}
        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "signin" && (
            <>
              Don&apos;t have an Atlas workspace?{" "}
              <button
                type="button"
                className="font-medium text-cyan-400 transition hover:text-cyan-300"
                onClick={() => switchMode("signup")}
              >
                Create workspace
              </button>
            </>
          )}

          {mode !== "signin" && (
            <>
              {mode === "signup"
                ? "Already have an account? "
                : "Remembered your password? "}
              <button
                type="button"
                className="font-medium text-cyan-400 transition hover:text-cyan-300"
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </form>
    </Card>
  );
}
