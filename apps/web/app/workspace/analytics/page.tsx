"use client";

import {
  Activity,
  Brain,
  FileText,
  ListTodo,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getTasks } from "@/lib/tasks";
import { getProjects } from "@/lib/projects";
import { getDocuments } from "@/lib/documents";
import { listConversations } from "@/lib/aiConversations";
import {
  getWorkflows,
  listWorkflowRuns,
} from "@/lib/workflows";
import { getRecentActivity } from "@/lib/audit";
import { formatBytes, timeAgo } from "@/lib/format";

type AnalyticsData = {
  totalTasks: number;
  completedTasks: number;
  totalProjects: number;
  documentCount: number;
  storageUsed: number;
  conversations: number;
  activeWorkflows: number;
  workflowRuns: number;
  workflowFailures: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activity, setActivity] = useState<
    Awaited<ReturnType<typeof getRecentActivity>>
  >([]);
  const [error, setError] = useState<string | null>(null);

  /* Captured when the data loads: render must stay pure, so
     the weekly buckets are computed against this fixed
     timestamp instead of Date.now() during render. */
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [
          tasks,
          projects,
          documents,
          conversations,
          workflows,
          runs,
          activityRows,
        ] = await Promise.all([
          getTasks(),
          getProjects(),
          getDocuments(),
          listConversations(200),
          getWorkflows(),
          listWorkflowRuns(undefined, 50),
          getRecentActivity(12),
        ]);

        if (cancelled) {
          return;
        }

        setLoadedAt(Date.now());
        setData({
          totalTasks: tasks.length,
          completedTasks: tasks.filter(
            (task) => task.status === "done"
          ).length,
          totalProjects: projects.length,
          documentCount: documents.length,
          storageUsed: documents.reduce(
            (sum, document) => sum + (document.file_size || 0),
            0
          ),
          conversations: conversations.length,
          activeWorkflows: workflows.filter(
            (workflow) => workflow.status === "active"
          ).length,
          workflowRuns: runs.length,
          workflowFailures: runs.filter(
            (run) => run.status === "failed"
          ).length,
        });

        setActivity(activityRows);
      } catch {
        if (!cancelled) {
          setError(
            "Your analytics could not be loaded. Please try again."
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Activity over the last 4 weeks, from real audit events. */
  const weeklyActivity = useMemo(() => {
    const now = loadedAt ?? 0;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const buckets = [0, 0, 0, 0];

    for (const entry of activity) {
      const then = new Date(entry.created_at).getTime();

      if (Number.isNaN(then)) {
        continue;
      }

      const weeksAgo = Math.floor((now - then) / weekMs);

      if (weeksAgo >= 0 && weeksAgo < 4) {
        buckets[3 - weeksAgo] += 1;
      }
    }

    return buckets;
  }, [activity, loadedAt]);

  const maxWeekly = Math.max(1, ...weeklyActivity);

  const completionRate =
    data && data.totalTasks > 0
      ? Math.round(
          (data.completedTasks / data.totalTasks) * 100
        )
      : null;

  const cards: {
    title: string;
    value: string;
    icon: LucideIcon;
  }[] = data
    ? [
        {
          title: "Tasks completed",
          value:
            completionRate === null
              ? `${data.completedTasks} / ${data.totalTasks}`
              : `${completionRate}%`,
          icon: ListTodo,
        },
        {
          title: "Documents",
          value: String(data.documentCount),
          icon: FileText,
        },
        {
          title: "Storage used",
          value: formatBytes(data.storageUsed),
          icon: Activity,
        },
        {
          title: "AI conversations",
          value: String(data.conversations),
          icon: Brain,
        },
      ]
    : [];

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
          Real metrics computed from your own tasks, projects,
          documents, assistant conversations, and workflow
          runs.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-300"
        >
          {error}
        </div>
      ) : null}

      {/* Stats */}
      {!data ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-8 text-xs text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          Computing analytics…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
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
                  </div>

                  <p className="mt-5 text-xs font-medium text-slate-500">
                    {card.title}
                  </p>

                  <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                    {card.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Analytics */}
      <div className="grid gap-5 xl:grid-cols-3">
        {/* Activity chart (real audit events, last 4 weeks) */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Activity — Last 4 Weeks
              </h2>

              <p className="mt-1 text-xs text-slate-600">
                Recorded events from your audit log
              </p>
            </div>

            <span className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[11px] text-slate-500">
              {activity.length} recent events
            </span>
          </div>

          <div className="mt-8 flex h-[260px] items-end gap-2 sm:gap-4">
            {weeklyActivity.map((count, index) => (
              <div
                key={index}
                className="group flex h-full flex-1 flex-col items-center justify-end"
              >
                <span className="mb-2 text-[11px] text-slate-500">
                  {count}
                </span>

                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500/20 to-cyan-400/70 transition-all duration-300 group-hover:from-cyan-500/30 group-hover:to-cyan-300"
                  style={{
                    height: `${Math.round((count / maxWeekly) * 100)}%`,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between text-[10px] text-slate-700">
            <span>4 weeks ago</span>
            <span>3 weeks ago</span>
            <span>2 weeks ago</span>
            <span>This week</span>
          </div>
        </section>

        {/* Activity feed */}
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
            {activity.length === 0 ? (
              <p className="py-6 text-center text-[11px] leading-5 text-slate-600">
                No recorded activity yet. Events appear here
                as you use the workspace.
              </p>
            ) : (
              activity.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.025]"
                >
                  <div className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300">
                        {entry.action}
                      </p>

                      <p className="mt-1 text-[10px] capitalize leading-4 text-slate-600">
                        {entry.entity}
                      </p>

                      <p className="mt-1.5 text-[10px] text-slate-700">
                        {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Honest labeling */}
      <p className="text-[11px] leading-5 text-slate-700">
        All metrics are computed from data owned by your
        account. Team-wide analytics require shared
        workspaces, which are not yet implemented.
      </p>
    </div>
  );
}
