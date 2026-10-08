"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  FolderKanban,
  CheckSquare,
  FileText,
  BarChart3,
  Workflow,
  Users,
  CalendarDays,
  Plug,
  Settings,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const mainItems = [
  {
    title: "Dashboard",
    href: "/workspace/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Knowledge Hub",
    href: "/workspace/knowledge",
    icon: BookOpen,
  },
  {
    title: "AI Assistant",
    href: "/workspace/ai",
    icon: Bot,
  },
  {
    title: "Projects",
    href: "/workspace/projects",
    icon: FolderKanban,
  },
  {
    title: "Tasks",
    href: "/workspace/tasks",
    icon: CheckSquare,
  },
  {
    title: "Documents",
    href: "/workspace/documents",
    icon: FileText,
  },
];

const workspaceItems = [
  {
    title: "Analytics",
    href: "/workspace/analytics",
    icon: BarChart3,
  },
  {
    title: "Workflows",
    href: "/workspace/workflows",
    icon: Workflow,
  },
  {
    title: "Team",
    href: "/workspace/team",
    icon: Users,
  },
  {
    title: "Calendar",
    href: "/workspace/calendar",
    icon: CalendarDays,
  },
  {
    title: "Integrations",
    href: "/workspace/integrations",
    icon: Plug,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-full flex-col bg-[#070b16] px-4 py-5">
      {/* Brand */}
      <div className="mb-8 px-3">
        <Link href="/workspace/dashboard" className="group block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] shadow-[0_0_25px_rgba(34,211,238,0.05)] transition duration-300 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/[0.1]">
              <Sparkles
                size={19}
                strokeWidth={1.8}
                className="text-cyan-400"
              />
            </div>

            <div>
              <h1 className="text-[17px] font-semibold tracking-[0.18em] text-white">
                ATLAS
              </h1>

              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Enterprise OS
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 pr-1">
        {/* Main */}
        <div className="mb-7">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Main
          </p>

          <nav className="space-y-1">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm transition-all duration-200 ${
                    active
                      ? "bg-cyan-400/[0.09] text-white"
                      : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-100"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 h-6 w-[2px] rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                  )}

                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.7}
                    className={`shrink-0 transition-colors ${
                      active
                        ? "text-cyan-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />

                  <span className={active ? "font-medium" : ""}>
                    {item.title}
                  </span>

                  {active && (
                    <ChevronRight
                      size={14}
                      className="ml-auto text-cyan-400/70"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Workspace */}
        <div>
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Workspace
          </p>

          <nav className="space-y-1">
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`group relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm transition-all duration-200 ${
                    active
                      ? "bg-cyan-400/[0.09] text-white"
                      : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-100"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 h-6 w-[2px] rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                  )}

                  <Icon
                    size={18}
                    strokeWidth={active ? 2 : 1.7}
                    className={`shrink-0 transition-colors ${
                      active
                        ? "text-cyan-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />

                  <span className={active ? "font-medium" : ""}>
                    {item.title}
                  </span>

                  {active && (
                    <ChevronRight
                      size={14}
                      className="ml-auto text-cyan-400/70"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-5 border-t border-white/[0.06] pt-4">
        {/* Settings */}
        <Link
          href="/workspace/settings"
          className={`group mb-3 flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm transition-all duration-200 ${
            pathname === "/workspace/settings"
              ? "bg-cyan-400/[0.09] text-white"
              : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-100"
          }`}
        >
          <Settings
            size={18}
            strokeWidth={1.7}
            className="text-slate-500 transition-colors group-hover:text-slate-300"
          />

          <span>Settings</span>
        </Link>

        {/* User */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition-all duration-300 hover:border-cyan-400/10 hover:bg-white/[0.035]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-semibold text-[#06101b] shadow-[0_0_18px_rgba(34,211,238,0.12)]">
              B
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                Bathriprasath
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                Administrator
              </p>
            </div>

            <div className="ml-auto h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          </div>
        </div>
      </div>
    </aside>
  );
}