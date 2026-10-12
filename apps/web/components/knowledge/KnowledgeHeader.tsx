"use client";

/* =========================================================
   KNOWLEDGE HUB HEADER + TABS
   Documents (uploads, semantic search) and Articles
   (org-wide wiki with version history).
========================================================= */

import { BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  icon: typeof FileText;
  exact?: boolean;
};

const TABS: Tab[] = [
  {
    href: "/workspace/knowledge",
    label: "Documents",
    icon: FileText,
    exact: true,
  },
  {
    href: "/workspace/knowledge/articles",
    label: "Articles",
    icon: BookOpen,
  },
];

export default function KnowledgeHeader() {
  const pathname = usePathname();

  return (
    <div>
      <h1 className="text-4xl font-bold text-white">
        Knowledge Hub
      </h1>

      <p className="mt-2 text-slate-400">
        Store, organize and search your organization&apos;s
        knowledge.
      </p>

      <nav
        aria-label="Knowledge sections"
        className="mt-5 inline-flex rounded-xl border border-white/[0.07] bg-white/[0.025] p-1"
      >
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-cyan-400/10 text-cyan-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
