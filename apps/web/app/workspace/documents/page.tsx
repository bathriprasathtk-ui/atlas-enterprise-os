"use client";

import { useEffect, useMemo, useState } from "react";

import KnowledgeHeader from "@/components/knowledge/KnowledgeHeader";
import SearchBar from "@/components/knowledge/SearchBar";
import CategoryFilter from "@/components/knowledge/CategoryFilter";
import DocumentGrid from "@/components/knowledge/DocumentGrid";
import RecentDocuments from "@/components/knowledge/RecentDocuments";

import {
  getDocuments,
  Document,
} from "@/lib/documents";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  async function loadDocuments() {
    try {
      setLoading(true);

      const docs = await getDocuments();

      setDocuments(docs);
    } catch (error) {
      console.error(
        "Failed to load documents:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(loadDocuments);
  }, []);

  const categories = useMemo(() => {
    const names = new Set<string>();

    for (const document of documents) {
      if (document.category) {
        names.add(document.category);
      }
    }

    return [...names].sort();
  }, [documents]);

  const filteredDocuments = documents.filter(
    (document) =>
      document.title
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (category === "All" ||
        document.category === category)
  );

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Header */}
      <KnowledgeHeader />

      {/* Search */}
      <SearchBar
        search={search}
        setSearch={setSearch}
      />

      {/* Filters */}
      <CategoryFilter
        categories={categories}
        active={category}
        onSelect={setCategory}
      />

      {/* Documents */}
      <div className="grid gap-6 xl:grid-cols-3">

        {/* Main document area */}
        <div className="min-w-0 xl:col-span-2">

          <DocumentGrid
            documents={filteredDocuments}
            loading={loading}
          />

        </div>

        {/* Recent documents */}
        <div className="min-w-0">

          <RecentDocuments />

        </div>

      </div>

    </div>
  );
}