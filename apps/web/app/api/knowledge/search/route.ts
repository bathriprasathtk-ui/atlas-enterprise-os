/* =========================================================
   SEMANTIC KNOWLEDGE SEARCH API

   POST /api/knowledge/search
   Body: { query: string }

   Returns document-level matches (best chunk per document)
   ranked by cosine similarity across the signed-in user's
   ORGANIZATION indexed documents (migration 0005).

   RLS + match_document_chunks' organization scope guarantee
   no cross-organization results; embedding uses the
   server-side key.
========================================================= */

import { NextResponse } from "next/server";

import {
  MIN_SIMILARITY,
  findRelevantChunks,
} from "@/lib/rag";
import { getRouteAuth } from "@/lib/routeAuth";

export const runtime = "nodejs";

/** Chunks requested per search (before per-document dedupe). */
const SEARCH_MATCH_COUNT = 12;

/** Similarity floor for search results. */
const SEARCH_MIN_SIMILARITY = 0.3;

const SNIPPET_LENGTH = 180;

/** Maximum article keyword hits returned per search. */
const ARTICLE_HIT_COUNT = 5;

/**
 * PostgREST `ilike` filter values must not contain the
 * characters that delimit `.or()` expressions.
 */
function sanitizeForIlike(value: string): string {
  return value.replace(/[%_,()\\]/g, " ").trim();
}

function snippet(content: string): string {
  const clean = content.replace(/\s+/g, " ").trim();

  return clean.length <= SNIPPET_LENGTH
    ? clean
    : `${clean.slice(0, SNIPPET_LENGTH).trimEnd()}…`;
}

export async function POST(request: Request) {
  /* ---------- AUTHENTICATION ---------- */

  const { supabase, user } = await getRouteAuth();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to search." },
      { status: 401 }
    );
  }

  /* ---------- QUERY ---------- */

  let query = "";

  try {
    const body = await request.json();
    query =
      typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    /* handled below */
  }

  if (!query) {
    return NextResponse.json(
      { error: "A search query is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  /* ---------- RETRIEVE ---------- */

  try {
    const matches = await findRelevantChunks(
      supabase,
      query,
      apiKey,
      {
        matchCount: SEARCH_MATCH_COUNT,
        minSimilarity: SEARCH_MIN_SIMILARITY,
      }
    );

    /*
     * Collapse chunk matches to one (best) entry per document,
     * preserving similarity order.
     */
    const seen = new Set<string>();
    const documents: unknown[] = [];

    for (const match of matches) {
      if (match.similarity < SEARCH_MIN_SIMILARITY) {
        continue;
      }

      if (seen.has(match.documentId)) {
        continue;
      }

      seen.add(match.documentId);

      documents.push({
        documentId: match.documentId,
        title: match.title,
        snippet: snippet(match.content),
        similarity: Number(match.similarity.toFixed(4)),
      });
    }

    /*
     * Articles are plain text (not embedded), so they are
     * matched by keyword rather than similarity. Honest
     * labelling: the UI calls these keyword matches.
     */
    const needle = sanitizeForIlike(query).slice(0, 120);
    let articles: {
      id: string;
      title: string;
      category: string | null;
    }[] = [];

    if (needle.length >= 2) {
      const { data: articleRows, error: articleError } =
        await supabase
          .from("knowledge_articles")
          .select("id, title, category")
          .or(
            `title.ilike.%${needle}%,content.ilike.%${needle}%`
          )
          .order("updated_at", { ascending: false })
          .limit(ARTICLE_HIT_COUNT);

      if (articleError) {
        console.error("Article keyword search error:", articleError);
      } else {
        articles = (articleRows ?? []) as typeof articles;
      }
    }

    return NextResponse.json({
      query,
      documents,
      articles,
      minSimilarity: SEARCH_MIN_SIMILARITY,
      defaultMinSimilarity: MIN_SIMILARITY,
    });
  } catch (error) {
    console.error("Semantic search error:", error);

    return NextResponse.json(
      {
        error:
          "Semantic search is unavailable right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
