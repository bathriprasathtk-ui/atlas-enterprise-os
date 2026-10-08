"use client";

import {
  Bot,
  CheckCircle2,
  FileText,
  FolderPlus,
  Upload,
} from "lucide-react";

const activities = [
  {
    title: "Employee Handbook uploaded",
    user: "Sarah",
    time: "2 mins ago",
    icon: Upload,
  },
  {
    title: "AI summarized Q2 Financial Report",
    user: "Atlas AI",
    time: "15 mins ago",
    icon: Bot,
  },
  {
    title: "Project Atlas created",
    user: "John",
    time: "1 hour ago",
    icon: FolderPlus,
  },
  {
    title: "HR Policy updated",
    user: "HR Team",
    time: "3 hours ago",
    icon: CheckCircle2,
  },
  {
    title: "Quarterly report added",
    user: "Finance Team",
    time: "5 hours ago",
    icon: FileText,
  },
];

export default function ActivityFeed() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Recent Activity
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Latest workspace events
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-medium text-slate-500 transition-colors hover:text-cyan-400"
        >
          View all
        </button>
      </div>

      {/* Activity list */}
      <div className="mt-5 space-y-1">
        {activities.map((activity, index) => {
          const Icon = activity.icon;

          return (
            <div
              key={`${activity.title}-${index}`}
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
                  {activity.title}
                </p>

                <p className="mt-1 text-[11px] text-slate-600">
                  {activity.user}
                </p>
              </div>

              {/* Time */}
              <span className="shrink-0 text-[10px] text-slate-600">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}