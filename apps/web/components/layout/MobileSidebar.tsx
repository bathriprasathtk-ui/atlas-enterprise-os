"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
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
} from "lucide-react";

const menuItems = [
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
  {
    title: "Settings",
    href: "/workspace/settings",
    icon: Settings,
  },
];

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex h-[64px] items-center justify-between border-b border-white/[0.06] bg-[#050816]/85 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/workspace/dashboard">
          <div>
            <h1 className="text-[16px] font-semibold tracking-[0.18em] text-white">
              ATLAS
            </h1>

            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Enterprise OS
            </p>
          </div>
        </Link>

        <button
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-300 transition hover:border-cyan-400/20 hover:bg-white/[0.05] hover:text-cyan-400"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-white/[0.07] bg-[#070b16] px-4 py-5 shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold tracking-[0.18em] text-white">
              ATLAS
            </h1>

            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Enterprise OS
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.04] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm transition-all ${
                  active
                    ? "bg-cyan-400/[0.09] text-white"
                    : "text-slate-400 hover:bg-white/[0.035] hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2 : 1.7}
                  className={
                    active ? "text-cyan-400" : "text-slate-500"
                  }
                />

                <span className={active ? "font-medium" : ""}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-semibold text-[#06101b]">
                B
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  Bathriprasath
                </p>

                <p className="mt-0.5 text-[11px] text-slate-500">
                  Administrator
                </p>
              </div>

              <div className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}