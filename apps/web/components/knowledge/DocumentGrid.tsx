"use client";

import DocumentCard from "./DocumentCard";
import EmptyState from "./EmptyState";

import { Document } from "@/lib/documents";

type Props = {
  documents: Document[];
  loading: boolean;
};

export default function DocumentGrid({
  documents,
  loading,
}: Props) {
  if (loading) {
    return (
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white">
          Documents
        </h2>

        <p className="text-slate-400">
          Loading...
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">

      <div className="flex items-center justify-between">

        <h2 className="text-2xl font-bold text-white">
          Documents
        </h2>

        <p className="text-slate-400">
          {documents.length} Documents
        </p>

      </div>

      {documents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
            />
          ))}

        </div>
      )}

    </section>
  );
}