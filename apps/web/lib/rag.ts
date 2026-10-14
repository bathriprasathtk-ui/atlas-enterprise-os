/* =========================================================
   RETRIEVAL (Organizational Memory)

   Semantic retrieval helpers shared by the AI ask route and
   the Knowledge semantic-search API. All queries are scoped
   to the caller's organization twice over:
     1. RLS policies from 0005 (organization_id)
     2. match_document_chunks() itself filters by the
        caller's organization (replaced in migration 0005)
========================================================= */

import type { SupabaseClient } from "@supabase/supabase-js";

import { embedText } from "./embeddings.ts";

/** Top-k chunks fed to the AI per question. */
export const TOP_K_CHUNKS = 8;

/**
 * Cosine similarity floor (1 - distance). Below this, chunks
 * are too loosely related to ground an answer.
 */
export const MIN_SIMILARITY = 0.2;

export type ChunkMatch = {
  documentId: string;
  title: string;
  content: string;
  chunkIndex: number;
  similarity: number;
};

type MatchRow = {
  id: string;
  document_id: string;
  title: string | null;
  content: string;
  chunk_index: number | null;
  similarity: number | null;
};

/**
 * Number of indexed chunks the signed-in user owns. RLS-
 * scoped: the count only reflects their own documents.
 */
export async function countUserChunks(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/**
 * Top-k most similar chunks to the question, from the
 * signed-in user's own documents only.
 *
 * Throws on embedding/API failure - callers decide whether
 * to fall back to the legacy full-document path.
 */
export async function findRelevantChunks(
  supabase: SupabaseClient,
  question: string,
  apiKey: string,
  options?: {
    matchCount?: number;
    minSimilarity?: number;
  }
): Promise<ChunkMatch[]> {
  const embedding = await embedText(question, apiKey);

  /* The same floor is applied in SQL and in memory below. */
  const floor =
    options?.minSimilarity ?? MIN_SIMILARITY;

  const { data, error } = await supabase.rpc(
    "match_document_chunks",
    {
      query_embedding: embedding,
      match_count: options?.matchCount ?? TOP_K_CHUNKS,
      min_similarity: floor,
    }
  );

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as MatchRow[];

  return rows
    .filter(
      (row) =>
        typeof row.similarity === "number" &&
        row.similarity >= floor
    )
    .map((row) => ({
      documentId: row.document_id,
      title: row.title ?? "Untitled document",
      content: row.content,
      chunkIndex: row.chunk_index ?? 0,
      similarity: row.similarity as number,
    }));
}
