"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";

const insights = [
  {
    title: "Knowledge usage is growing",
    description: "Your team has increased knowledge activity this week.",
    value: "+18.7%",
    icon: ArrowUpRight,
    badge: "Growth",
  },
  {
    title: "3 tasks need attention",
    description:
      "A few high-priority tasks are approaching their deadlines.",
    value: "Priority",
    icon: CheckCircle2,
    badge: "Priority",
  },
];

export default function AIInsights() {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0B1020]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08]">
            <BrainCircuit
              size={20}
              className="text-violet-400"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white sm:text-lg">
               AI Insights
              </h2>

              <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-300">
                ✦ Atlas AI
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Intelligence from your workspace
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        {insights.map((insight) => {
          const Icon = insight.icon;

          return (
            <div
              key={insight.title}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 transition-all duration-300 hover:border-cyan-400/20 hover:bg-white/[0.03]"
            >
              <div className="flex gap-3">
                
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                  <Icon
                    size={17}
                    className="text-cyan-400"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-medium text-slate-200">
                      {insight.title}
                    </h3>

                    <span className="shrink-0 rounded-full bg-cyan-400/[0.08] px-2 py-1 text-[10px] font-medium text-cyan-400">
                      {insight.value}
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <button
  type="button"
  className="group mt-4 flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.015] px-4 py-3 text-sm text-slate-400 transition-all hover:border-cyan-400/20 hover:bg-white/[0.03] hover:text-white"
>
        <span>View AI workspace</span>

        <ArrowRight
          size={16}
          className="transition-transform group-hover:translate-x-1"
        />
      </button>
    </section>
  );
}