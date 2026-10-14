/* =========================================================
   404 — NOT FOUND

   Replaces the default create-next-app 404 with a branded page
   that offers real next steps. Rendered inside the root layout.
========================================================= */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main
      className="flex min-h-[70vh] flex-col items-center justify-center
                 px-6 py-16 text-center"
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.2em]
                   text-cyan-400"
      >
        Error 404
      </p>

      <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
        This page does not exist
      </h1>

      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
        The link may be out of date, or the item was moved or
        deleted. Use the navigation to find what you need.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/workspace/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-xl
                     bg-cyan-400 px-5 text-sm font-semibold text-[#06101b]
                     transition-colors hover:bg-cyan-300
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2
                     focus-visible:outline-cyan-300"
        >
          Go to dashboard
        </Link>

        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-xl
                     border border-white/[0.09] px-5 text-sm font-medium
                     text-slate-300 transition-colors hover:bg-white/[0.05]
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2
                     focus-visible:outline-cyan-300"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
