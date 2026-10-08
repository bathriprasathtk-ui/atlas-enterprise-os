"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

import { signIn } from "@/lib/auth";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await signIn(
        email.trim(),
        password
      );

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Authentication successful
      router.replace("/workspace/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Unable to connect to the authentication service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="relative w-full rounded-[24px] border border-white/10 bg-[#0b1220]/85 p-7 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-500 sm:p-8">
      <form onSubmit={handleLogin}>
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
            Welcome back
          </p>

          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Sign in to Atlas
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Access your organization and workspace.
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
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            autoComplete="email"
            required
          />
        </div>

        {/* Password */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-300"
            >
              Password
            </label>

            <button
              type="button"
              className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
              onClick={() => {
                setError("Password reset will be available soon.");
              }}
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              autoComplete="current-password"
              required
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

        {/* Remember */}
        <div className="mb-6 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) =>
                setRememberMe(e.target.checked)
              }
              className="h-4 w-4 cursor-pointer accent-cyan-400"
            />

            Remember me
          </label>

          <span className="text-xs text-slate-600">
            Secure session
          </span>
        </div>

        {/* Sign in */}
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-500 text-sm font-semibold shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in  →"}
        </Button>

        {/* Create workspace */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an Atlas workspace?{" "}
          <button
            type="button"
            className="font-medium text-cyan-400 transition hover:text-cyan-300"
            onClick={() => {
              setError("Workspace creation will be available soon.");
            }}
          >
            Create workspace
          </button>
        </p>
      </form>
    </Card>
  );
}