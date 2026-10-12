"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
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

/** Minimum characters before semantic search engages. */
const SEMANTIC_MIN_CHARS = 3;

/** Debounce before calling the semantic search API. */
const SEMANTIC_DEBOUNCE_MS = 350;

type SemanticMatch = {
  documentId: string;
  title: string;
  snippet: string;
  similarity: number;
};

type ArticleHit = {
  id: string;
  title: string;
  category: string | null;
};

type SemanticState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      matches: SemanticMatch[];
      articles: ArticleHit[];
    }
  | { status: "fallback" };

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [semantic, setSemantic] = useState<SemanticState>({
    status: "idle",
  });

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
    // Deep link from the top-bar search box: /workspace/knowledge?q=...
    const initialQuery = new URLSearchParams(
      window.location.search
    ).get("q");

    if (initialQuery) {
      void Promise.resolve().then(() =>
        setSearch(initialQuery)
      );
    }

    // Deferred so no state update runs synchronously in the effect.
    void Promise.resolve().then(loadDocuments);
  }, []);

  /* =========================================================
     SEMANTIC SEARCH

     Debounced call to /api/knowledge/search (which searches
     only this user's indexed documents). Any failure falls
     back to the local title filter silently - search never
     breaks because the embedding service is unavailable.
  ========================================================= */

  useEffect(() => {
    const query = search.trim();

    if (query.length < SEMANTIC_MIN_CHARS) {
      /* "idle" is derived during render — no state writes here */
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSemantic({ status: "loading" });

      try {
        const response = await fetch(
          "/api/knowledge/search",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Search failed (${response.status})`);
        }

        const data = (await response.json()) as {
          documents?: SemanticMatch[];
          articles?: ArticleHit[];
        };

        setSemantic({
          status: "ready",
          matches: data.documents ?? [],
          articles: data.articles ?? [],
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return; /* superseded by a newer keystroke */
        }

        console.error(
          "Semantic search unavailable; using title filter.",
          error
        );

        setSemantic({ status: "fallback" });
      }
    }, SEMANTIC_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  /* =========================================================
     RESULT LIST

     - Semantic matches (ranked by AI similarity) when found
     - otherwise the classic title filter
  ========================================================= */

  const query = search.trim();

  const titleMatches = documents.filter((doc) =>
    doc.title.toLowerCase().includes(query.toLowerCase())
  );

  /*
   * Short query → idle, derived from state rather than written
   * into state from the effect (avoids sync setState in effect).
   */
  const effectiveSemantic: SemanticState =
    query.length < SEMANTIC_MIN_CHARS
      ? { status: "idle" }
      : semantic;

  let filteredDocuments = titleMatches;
  let semanticNote: string | null = null;

  if (
    effectiveSemantic.status === "ready" &&
    effectiveSemantic.matches.length > 0
  ) {
    const byId = new Map(documents.map((doc) => [doc.id, doc]));

    const ranked = effectiveSemantic.matches
      .map((match) => byId.get(match.documentId))
      .filter((doc): doc is Document => Boolean(doc));

    if (ranked.length > 0) {
      filteredDocuments = ranked;
      semanticNote = `Semantic match — ${
        ranked.length
      } document${ranked.length === 1 ? "" : "s"} ranked by AI relevance.`;
    }
  }

  const categories = (() => {
    const names = new Set<string>();

    for (const document of documents) {
      if (document.category) {
        names.add(document.category);
      }
    }

    return [...names].sort();
  })();

  if (category !== "All") {
    filteredDocuments = filteredDocuments.filter(
      (document) => document.category === category
    );
  }

  return (
    <div className="space-y-8">

      <KnowledgeHeader />

      <SearchBar
        search={search}
        setSearch={setSearch}
      />

      {effectiveSemantic.status === "loading" && (
        <p
          role="status"
          className="-mt-4 text-sm text-slate-400"
        >
          Searching your knowledge…
        </p>
      )}

      {semanticNote && (
        <p
          role="status"
          className="-mt-4 text-sm text-cyan-300/80"
        >
          {semanticNote}
        </p>
      )}

      <CategoryFilter
        categories={categories}
        active={category}
        onSelect={setCategory}
      />

      <UploadZone onUploaded={loadDocuments} />

      <AIKnowledgeCard />

      {/* Keyword-matched organization articles */}
      {effectiveSemantic.status === "ready" &&
      effectiveSemantic.articles.length > 0 ? (
        <section
          aria-label="Matching articles"
          className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl"
        >
          <h2 className="text-sm font-semibold text-white">
            Matching articles
          </h2>

          <p className="mt-1 text-[11px] text-slate-600">
            Keyword matches in your organization&apos;s
            articles — articles are plain text, not embedded
            for semantic search.
          </p>

          <div className="mt-3 space-y-2">
            {effectiveSemantic.articles.map((article) => (
              <Link
                key={article.id}
                href={`/workspace/knowledge/articles/${article.id}`}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/[0.08] p-3.5 transition-colors hover:border-white/[0.09] hover:bg-white/[0.02]"
              >
                <BookOpen
                  size={15}
                  className="shrink-0 text-slate-500"
                />

                <span className="min-w-0 flex-1 truncate text-sm text-slate-300 group-hover:text-white">
                  {article.title}
                </span>

                {article.category ? (
                  <span className="shrink-0 rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-slate-500">
                    {article.category}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

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
