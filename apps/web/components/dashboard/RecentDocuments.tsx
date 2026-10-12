"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { FileText, Loader2 } from "lucide-react";

import { getDocuments, type Document } from "@/lib/documents";
import { formatBytes, timeAgo } from "@/lib/format";

export default function RecentDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getDocuments()
      .then((rows) => {
        if (!cancelled) {
          setDocuments(rows.slice(0, 5));
        }
      })
      .catch(() => {
        /* Handled by the empty state below. */
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
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Recent Documents
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Latest uploads in your library
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
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            Loading documents…
          </div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-600">
            No documents yet. Upload one from the Documents
            page.
          </div>
        ) : (
          documents.map((document) => (
            <Link
              key={document.id}
              href="/workspace/documents"
              className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.025]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025]">
                <FileText
                  size={15}
                  strokeWidth={1.7}
                  className="text-slate-500 transition-colors group-hover:text-cyan-400"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-300 group-hover:text-white">
                  {document.title}
                </p>

                <p className="mt-1 text-[10px] text-slate-600">
                  {formatBytes(document.file_size)} ·{" "}
                  {timeAgo(document.created_at)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
