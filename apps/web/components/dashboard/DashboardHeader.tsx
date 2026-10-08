import FadeIn from "@/components/animations/FadeIn";
import { CalendarDays, Sparkles } from "lucide-react";

export default function DashboardHeader() {
  return (
    <FadeIn>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles
              size={15}
              strokeWidth={1.8}
              className="text-cyan-400"
            />

            <span className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-400">
              Organization Overview
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Welcome back, Bathriprasath
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            Here&apos;s what&apos;s happening across your organization today.
          </p>
        </div>

        <button
          type="button"
          className="flex h-10 w-fit items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 text-sm text-slate-400 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
        >
          <CalendarDays size={16} strokeWidth={1.7} />

          <span>Last 30 days</span>

          <span className="ml-1 text-slate-600">⌄</span>
        </button>
      </div>
    </FadeIn>
  );
}