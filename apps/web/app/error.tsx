"use client";

/* =========================================================
   ROOT ERROR BOUNDARY

   Replaces Next.js' bare "Internal Server Error" page with a
   recovery UI: the user can retry the same segment or go back
   to the dashboard.

   In production Next.js already redacts server-rendered error
   messages to a digest, so nothing internal is exposed here;
   the raw error is only written to the browser console.
========================================================= */

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="flex min-h-[60vh] flex-col items-center justify-center
                 px-6 py-16 text-center"
      role="alert"
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.2em]
                   text-cyan-400"
      >
        Something went wrong
      </p>

      <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
        We could not finish that request
      </h1>

      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
        Your data is safe. Try the request again — if the problem
        keeps happening, return to the dashboard or sign in again.
      </p>

      {error.digest ? (
        <p
          className="mt-4 rounded-lg border border-white/[0.07]
                     bg-white/[0.03] px-3 py-1.5 font-mono
                     text-[11px] text-slate-500"
        >
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-xl
                     bg-cyan-400 px-5 text-sm font-semibold text-[#06101b]
                     transition-colors hover:bg-cyan-300
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2
                     focus-visible:outline-cyan-300"
        >
          Try again
        </button>

        <Link
          href="/workspace/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-xl
                     border border-white/[0.09] px-5 text-sm font-medium
                     text-slate-300 transition-colors hover:bg-white/[0.05]
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2
                     focus-visible:outline-cyan-300"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
