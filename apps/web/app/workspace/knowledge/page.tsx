"use client";

import { useEffect, useState } from "react";

import KnowledgeHeader from "@/components/knowledge/KnowledgeHeader";
import SearchBar from "@/components/knowledge/SearchBar";
import UploadZone from "@/components/knowledge/UploadZone";
import AIKnowledgeCard from "@/components/knowledge/AIKnowledgeCard";
import CategoryFilter from "@/components/knowledge/CategoryFilter";
import DocumentGrid from "@/components/knowledge/DocumentGrid";
import RecentDocuments from "@/components/knowledge/RecentDocuments";

import {
  getDocuments,
  Document,
} from "@/lib/documents";

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDocuments() {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = documents.filter((doc) =>
    doc.title
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">

      <KnowledgeHeader />

      <SearchBar
        search={search}
        setSearch={setSearch}
      />

      <CategoryFilter />

      <UploadZone />

      <AIKnowledgeCard />

      <div className="grid gap-8 xl:grid-cols-3">

        <div className="xl:col-span-2">

          <DocumentGrid
            documents={filteredDocuments}
            loading={loading}
          />

        </div>

        <RecentDocuments />

      </div>

    </div>
  );
}