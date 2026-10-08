"use client";

import { useEffect, useState } from "react";

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
    loadDocuments();
  }, []);

  const filteredDocuments = documents.filter((document) =>
    document.title
      .toLowerCase()
      .includes(search.toLowerCase())
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
      <CategoryFilter />

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