"use client";

import {
  Bot,
  FilePlus2,
  FolderPlus,
  Upload,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

const actions = [
  {
    title: "Upload document",
    description: "Add knowledge to Atlas",
    icon: Upload,
    href: "/workspace/knowledge",
  },
  {
    title: "Create project",
    description: "Start a new initiative",
    icon: FolderPlus,
    href: "/workspace/projects",
  },
  {
    title: "Ask Atlas AI",
    description: "Get an intelligent answer",
    icon: Bot,
    href: "/workspace/ai",
  },
  {
    title: "Create document",
    description: "Start from scratch",
    icon: FilePlus2,
    href: "/workspace/documents",
  },
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <section className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06]">
          <Zap
            size={17}
            strokeWidth={1.7}
            className="text-cyan-400"
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">
            Quick Actions
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Jump into your most common workflows
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              type="button"
              onClick={() => router.push(action.href)}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/[0.08] p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/15 hover:bg-white/[0.025]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                <Icon
                  size={16}
                  strokeWidth={1.7}
                  className="text-slate-500 transition-colors group-hover:text-cyan-400"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-300 transition-colors group-hover:text-white">
                  {action.title}
                </p>

                <p className="mt-1 truncate text-[10px] text-slate-600">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}