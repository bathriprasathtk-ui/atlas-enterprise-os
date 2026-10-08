"use client";

import {
  Activity,
  ArrowUpRight,
  Brain,
  FileText,
  Users,
} from "lucide-react";

const stats = [
  {
    title: "AI Requests",
    value: "145",
    change: "+18.7%",
    icon: Brain,
  },
  {
    title: "Documents",
    value: "321",
    change: "+8.2%",
    icon: FileText,
  },
  {
    title: "Active Users",
    value: "18",
    change: "+12.4%",
    icon: Users,
  },
  {
    title: "Workflows",
    value: "24",
    change: "+5.4%",
    icon: Activity,
  },
];

const activity = [
  {
    title: "AI knowledge query",
    description: "Atlas AI processed a knowledge request",
    time: "2 mins ago",
  },
  {
    title: "Document indexed",
    description: "Employee Handbook was added to the knowledge base",
    time: "15 mins ago",
  },
  {
    title: "Project updated",
    description: "Atlas Enterprise OS progress changed to 72%",
    time: "1 hour ago",
  },
  {
    title: "New workflow created",
    description: "Document processing workflow was created",
    time: "3 hours ago",
  },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">
          Analytics
        </p>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Workspace Analytics
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Monitor workspace activity, AI usage, documents, users, and
          workflows from one place.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/15 hover:bg-white/[0.035]"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/[0.04] blur-2xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035]">
                    <Icon
                      size={17}
                      strokeWidth={1.7}
                      className="text-cyan-400"
                    />
                  </div>

                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <ArrowUpRight size={12} />
                    {stat.change}
                  </span>
                </div>

                <p className="mt-5 text-xs font-medium text-slate-500">
                  {stat.title}
                </p>

                <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Analytics */}
      <div className="grid gap-5 xl:grid-cols-3">
        {/* Usage Overview */}
        <section className="xl:col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Usage Overview
              </h2>

              <p className="mt-1 text-xs text-slate-600">
                Workspace activity over the current period
              </p>
            </div>

            <span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[11px] text-slate-500">
              This month
            </span>
          </div>

          {/* Simple chart */}
          <div className="mt-8 flex h-[260px] items-end gap-2 sm:gap-4">
            {[38, 52, 44, 68, 57, 76, 63, 82, 71, 91, 78, 96].map(
              (height, index) => (
                <div
                  key={index}
                  className="group flex h-full flex-1 items-end"
                >
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/20 to-cyan-400/70 transition-all duration-300 group-hover:from-cyan-500/30 group-hover:to-cyan-300"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ),
            )}
          </div>

          <div className="mt-3 flex justify-between text-[10px] text-slate-700">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </section>

        {/* Activity */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Recent Activity
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Latest workspace events
            </p>
          </div>

          <div className="mt-5 space-y-1">
            {activity.map((item) => (
              <div
                key={item.title}
                className="rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.025]"
              >
                <div className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-300">
                      {item.title}
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-slate-600">
                      {item.description}
                    </p>

                    <p className="mt-1.5 text-[10px] text-slate-700">
                      {item.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}