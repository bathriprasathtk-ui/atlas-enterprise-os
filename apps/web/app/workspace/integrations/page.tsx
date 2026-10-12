"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Globe,
  GitBranch,
  MessageCircle,
  RefreshCw,
  Settings2,
  Zap,
} from "lucide-react";

type IntegrationStatus =
  | "configured"
  | "unconfigured"
  | "not_implemented";

type IntegrationService = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  detail: string;
};

const ICONS: Record<string, typeof GitBranch> = {
  supabase: Settings2,
  storage: Settings2,
  gemini: Zap,
  github: GitBranch,
  slack: MessageCircle,
  "google-workspace": Globe,
  "microsoft-365": Globe,
};

function StatusBadge({ status }: { status: IntegrationStatus }) {
  if (status === "configured") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-400">
        <Check size={11} />
        Configured
      </span>
    );
  }

  if (status === "unconfigured") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/10 bg-amber-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-amber-400">
        <AlertTriangle size={11} />
        Not configured
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-slate-500">
      Not implemented
    </span>
  );
}

export default function IntegrationsPage() {
  const [services, setServices] =
    useState<IntegrationService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations", {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          body?.error ?? `Request failed (${response.status}).`
        );
      }

      const body = (await response.json()) as {
        services?: IntegrationService[];
      };

      setServices(body.services ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load integration status."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(load);
  }, [load]);

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
              Live configuration status for the services Atlas
              talks to. Statuses are reported by the server —
              no credentials are ever shown here.
            </p>
          </div>
        </div>
      </section>

      {/* Status list */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Services
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Configured services are live. Everything else is
              honestly labelled.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Loading */}
        {loading && !services && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/10 bg-amber-400/[0.04] p-4">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-amber-400"
            />

            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-400">
                Could not load integration status
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Cards */}
        {services && services.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {services.map((service) => {
              const Icon = ICONS[service.id] ?? Globe;

              return (
                <div
                  key={service.id}
                  className="group rounded-2xl border border-white/[0.06] bg-black/[0.08] p-5 transition-all duration-200 hover:border-cyan-400/15 hover:bg-white/[0.025]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035]">
                      <Icon
                        size={19}
                        strokeWidth={1.7}
                        className="text-slate-400 transition-colors group-hover:text-cyan-400"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-white">
                          {service.name}
                        </h3>

                        <StatusBadge status={service.status} />
                      </div>

                      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">
                        {service.category}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {service.description}
                      </p>

                      <p className="mt-3 rounded-lg border border-white/[0.05] bg-black/[0.2] px-3 py-2 text-[11px] leading-4 text-slate-500">
                        {service.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && services?.length === 0 && (
          <p className="text-xs text-slate-600">
            No services reported.
          </p>
        )}
      </section>

      {/* Note */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/[0.06]">
            <ExternalLink
              size={15}
              className="text-cyan-400"
            />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-300">
              About third-party connectors
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              GitHub, Slack, Google Workspace and Microsoft 365
              are listed for planning purposes only. This build
              contains no connector code, so nothing is
              connected and no data leaves Atlas for those
              services. See docs/PROJECT-RECOVERY.md for the
              roadmap.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
