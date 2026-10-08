"use client";

import Link from "next/link";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  MoreHorizontal,
} from "lucide-react";

const documents = [
  {
    name: "Employee Handbook",
    type: "PDF",
    updated: "2 mins ago",
    icon: FileText,
  },
  {
    name: "Q2 Financial Report",
    type: "XLSX",
    updated: "15 mins ago",
    icon: FileSpreadsheet,
  },
  {
    name: "Product Strategy",
    type: "DOCX",
    updated: "1 hour ago",
    icon: FileText,
  },
  {
    name: "Brand Guidelines",
    type: "PNG",
    updated: "3 hours ago",
    icon: FileImage,
  },
];

export default function RecentDocuments() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Recent Documents
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Recently accessed files
          </p>
        </div>

        <Link
          href="/workspace/documents"
          className="text-xs font-medium text-slate-500 transition-colors hover:text-cyan-400"
        >
          View all
        </Link>
      </div>

      <div className="space-y-1">
        {documents.map((document) => {
          const Icon = document.icon;

          return (
            <div
              key={document.name}
              className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.025]"
            >
              <Link
                href="/workspace/documents"
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025]">
                  <Icon
                    size={15}
                    strokeWidth={1.7}
                    className="text-slate-500 transition-colors group-hover:text-cyan-400"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-300 group-hover:text-white">
                    {document.name}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-600">
                    {document.type} · {document.updated}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                aria-label={`More options for ${document.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.05] hover:text-slate-300"
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}