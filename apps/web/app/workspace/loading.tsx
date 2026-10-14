/* =========================================================
   WORKSPACE ROUTE LOADING STATE

   Shown while a workspace segment streams or transitions.
   Kept minimal and accessible (announced to screen readers).
========================================================= */

export default function WorkspaceLoading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <span
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-2
                     border-white/10 border-t-cyan-400"
        />

        <p className="text-sm text-slate-400">Loading workspace…</p>
      </div>
    </div>
  );
}
