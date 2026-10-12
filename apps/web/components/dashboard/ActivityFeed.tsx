"use client";

import { useEffect, useState } from "react";

import {
  Bot,
  CheckCircle2,
  FileText,
  FolderPlus,
  Loader2,
  Settings,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getRecentActivity } from "@/lib/audit";
import { timeAgo } from "@/lib/format";

const ICON_BY_ENTITY: Record<string, LucideIcon> = {
  document: FileText,
  task: CheckCircle2,
  project: FolderPlus,
  workflow: Bot,
  profile: Settings,
};

function iconForAction(action: string, entity: string): LucideIcon {
  if (action.startsWith("upload") || action === "document.ingest") {
    return Upload;
  }

  return ICON_BY_ENTITY[entity] ?? Bot;
}

export default function ActivityFeed() {
  const [entries, setEntries] = useState<
    Awaited<ReturnType<typeof getRecentActivity>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getRecentActivity(8)
      .then((rows) => {
        if (!cancelled) {
          setEntries(rows);
        }
      })
      .catch(() => {
        /* Activity is non-critical: show the empty state. */
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Recent Activity
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Your latest workspace events
          </p>
        </div>
      </div>

      {/* Activity list */}
      <div className="mt-5 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            Loading activity…
          </div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-600">
            No activity recorded yet. Upload a document or
            create a task and it will show up here.
          </div>
        ) : (
          entries.map((entry) => {
            const Icon = iconForAction(entry.action, entry.entity);

            return (
              <div
                key={entry.id}
                className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors duration-200 hover:bg-white/[0.025]"
              >
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025]">
                  <Icon
                    size={15}
                    strokeWidth={1.7}
                    className="text-slate-500 transition-colors group-hover:text-cyan-400"
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-300 transition-colors group-hover:text-white">
                    {entry.action}
                  </p>

                  <p className="mt-1 text-[11px] capitalize text-slate-600">
                    {entry.entity}
                  </p>
                </div>

                {/* Time */}
                <span className="shrink-0 text-[10px] text-slate-600">
                  {timeAgo(entry.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
