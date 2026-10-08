"use client";

import {
  Check,
  ExternalLink,
  Globe,
  GitBranch,
  MessageCircle,
  Plus,
  Zap,
} from "lucide-react";

const integrations = [
  {
    name: "GitHub",
    description: "Connect repositories, commits, issues and pull requests.",
    icon: GitBranch,
    status: "Connected",
    connected: true,
  },
  {
    name: "Slack",
    description: "Bring team conversations and notifications into Atlas.",
    icon: MessageCircle,
    status: "Available",
    connected: false,
  },
  {
    name: "Google Workspace",
    description: "Connect Drive, Docs and other Google Workspace services.",
    icon: Globe,
    status: "Available",
    connected: false,
  },
  {
    name: "Microsoft 365",
    description: "Connect Microsoft productivity and collaboration tools.",
    icon: Globe,
    status: "Available",
    connected: false,
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <section>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.06]">
            <Zap
              size={20}
              strokeWidth={1.7}
              className="text-cyan-400"
            />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Integrations
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              Connect Atlas with the tools your organization already uses.
            </p>
          </div>
        </div>
      </section>

      {/* Connected */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-white">
            Integrations
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Manage your connected services and available integrations.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {integrations.map((integration) => {
            const Icon = integration.icon;

            return (
              <div
                key={integration.name}
                className="group rounded-2xl border border-white/[0.06] bg-black/[0.08] p-5 transition-all duration-200 hover:border-cyan-400/15 hover:bg-white/[0.025]"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035]">
                    <Icon
                      size={19}
                      strokeWidth={1.7}
                      className="text-slate-400 transition-colors group-hover:text-cyan-400"
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">
                        {integration.name}
                      </h3>

                      {integration.connected ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                          <Check size={11} />
                          Connected
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-slate-500">
                          Available
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {integration.description}
                    </p>

                    {/* Action */}
                    <div className="mt-4">
                      {integration.connected ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
                        >
                          <ExternalLink size={13} />
                          Manage
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06] px-3 py-2 text-xs font-medium text-cyan-400 transition-all hover:border-cyan-400/20 hover:bg-cyan-400/[0.1]"
                        >
                          <Plus size={13} />
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Enterprise note */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/[0.06]">
            <Globe
              size={15}
              className="text-cyan-400"
            />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-300">
              Enterprise integrations
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              Atlas is designed to connect your organization's
              existing tools, data sources and workflows in one
              unified workspace.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}