"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkles, ShieldCheck, Zap, Users } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 sm:pt-20 lg:pt-24">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[8%] h-[420px] w-[420px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute right-[5%] top-[15%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute left-1/2 top-[45%] h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[160px]" />

        {/* Stars */}
        <div className="absolute left-[12%] top-[18%] h-1 w-1 rounded-full bg-cyan-300" />
        <div className="absolute left-[22%] top-[32%] h-1 w-1 rounded-full bg-blue-400" />
        <div className="absolute right-[18%] top-[24%] h-1 w-1 rounded-full bg-purple-300" />
        <div className="absolute right-[28%] top-[48%] h-1 w-1 rounded-full bg-cyan-300" />
      </div>

      {/* Hero content */}
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 text-center">
        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-sm text-slate-300 backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />

          <Sparkles className="h-4 w-4 text-cyan-400" />

          <span>AI-powered enterprise intelligence</span>
        </div>

        {/* Heading */}
        <h1 className="max-w-5xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-8xl">
          Your company.
          <br />

          <span className="bg-gradient-to-r from-white via-cyan-300 to-purple-400 bg-clip-text text-transparent">
            One intelligent OS.
          </span>
        </h1>

        {/* Description */}
        <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
          Atlas brings your knowledge, people, workflows, projects, and AI
          intelligence together in one powerful enterprise operating system.
        </p>

        {/* Buttons */}
        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-500 px-8 font-semibold text-white shadow-[0_0_35px_rgba(59,130,246,0.25)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_45px_rgba(59,130,246,0.4)]"
          >
            Get Started

            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <button
            type="button"
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-8 font-medium text-slate-200 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.06]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
            </span>

            Explore Platform
          </button>
        </div>

        {/* Trust points */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span>Enterprise-ready</span>
          </div>

          <span className="hidden h-4 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <span>AI-powered workflows</span>
          </div>

          <span className="hidden h-4 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span>Built for modern teams</span>
          </div>
        </div>

        {/* Product preview */}
        <div className="relative mt-20 w-full max-w-6xl">
          {/* Glow behind preview */}
          <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[120px]" />

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2 shadow-[0_0_80px_rgba(59,130,246,0.12)] backdrop-blur-2xl">
            {/* Browser bar */}
            <div className="flex h-11 items-center gap-2 border-b border-white/10 px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />

              <div className="ml-4 h-6 flex-1 rounded-md bg-white/[0.04] text-left">
                <span className="ml-3 text-[10px] leading-6 text-slate-600">
                  app.atlas-enterprise.local
                </span>
              </div>
            </div>

            {/* Dashboard */}
            <div className="grid min-h-[420px] grid-cols-12 bg-[#0a1020]/90">
              {/* Sidebar */}
              <aside className="col-span-3 hidden border-r border-white/10 p-5 sm:block">
                <div className="mb-8 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold">
                    A
                  </div>

                  <span className="font-semibold">Atlas</span>
                </div>

                <div className="space-y-2 text-left text-xs">
                  <div className="rounded-lg bg-cyan-500/10 px-3 py-2 text-cyan-300">
                    Overview
                  </div>

                  <div className="px-3 py-2 text-slate-500">Knowledge</div>
                  <div className="px-3 py-2 text-slate-500">Projects</div>
                  <div className="px-3 py-2 text-slate-500">Workflows</div>
                  <div className="px-3 py-2 text-slate-500">AI Assistant</div>
                  <div className="px-3 py-2 text-slate-500">Analytics</div>
                </div>
              </aside>

              {/* Main dashboard */}
              <div className="col-span-12 p-5 sm:col-span-9 sm:p-7">
                <div className="mb-7">
                  <p className="text-xs text-slate-500">Monday, August 10</p>

                  <h2 className="mt-1 text-xl font-semibold">
                    Good morning, team.
                  </h2>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    label="Knowledge"
                    value="12,482"
                    growth="+18.4%"
                  />

                  <StatCard
                    label="Workflows"
                    value="284"
                    growth="+12.7%"
                  />

                  <StatCard
                    label="AI Actions"
                    value="8,921"
                    growth="+31.2%"
                  />
                </div>

                {/* Lower dashboard */}
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {/* Chart */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Organizational Activity
                      </span>

                      <span className="text-[10px] text-slate-600">
                        Last 30 days
                      </span>
                    </div>

                    <div className="mt-7 flex h-40 items-end gap-2">
                      {[35, 48, 42, 68, 55, 78, 63, 88, 72, 94, 80].map(
                        (height, index) => (
                          <div
                            key={index}
                            className="flex-1 rounded-t-md bg-gradient-to-t from-blue-600/30 to-cyan-400/80"
                            style={{ height: `${height}%` }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* AI card */}
                  <div className="rounded-2xl border border-purple-400/10 bg-purple-500/[0.04] p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                      </div>

                      <span className="text-sm font-medium">Atlas AI</span>
                    </div>

                    <p className="mt-5 text-xs leading-6 text-slate-500">
                      I found 12 knowledge items related to your current
                      project and identified 4 workflow improvements.
                    </p>

                    <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" />
                    </div>

                    <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                      <span>AI processing</span>
                      <span>78%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-24" />
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  growth,
}: {
  label: string;
  value: string;
  growth: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left">
      <p className="text-[10px] text-slate-500">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-lg font-semibold">{value}</span>

        <span className="text-[9px] text-emerald-400">{growth}</span>
      </div>
    </div>
  );
}