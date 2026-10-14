/* =========================================================
   UNIT TESTS — semantic retrieval floor (mocked fetch + RPC)

   No network access and no database: embedText's fetch is
   replaced, and match_document_chunks is a stub that echoes
   fixed similarities. Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { EMBEDDING_DIMENSIONS } from "../embeddings.ts";
import {
  MIN_SIMILARITY,
  findRelevantChunks,
} from "../rag.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockEmbeddingFetch() {
  const values = Array.from(
    { length: EMBEDDING_DIMENSIONS },
    () => 0.1
  );

  globalThis.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ embeddings: [{ values }] }),
      text: async () => "",
    }) as unknown as Response) as typeof fetch;
}

/** Stub whose RPC returns the given similarities verbatim. */
function stubClient(similarities: number[]) {
  let sentFloor: unknown = null;

  const client = {
    rpc: async (_name: string, params: { min_similarity?: number }) => {
      sentFloor = params.min_similarity;

      return {
        data: similarities.map((similarity, index) => ({
          id: `chunk-${index}`,
          document_id: `doc-${index % 2}`,
          title: `Document ${index}`,
          content: `content ${index}`,
          chunk_index: index,
          similarity,
        })),
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  return {
    client,
    floorSentToSql: () => sentFloor,
  };
}

describe("findRelevantChunks", () => {
  it("drops rows below the DEFAULT floor", async () => {
    mockEmbeddingFetch();
    const { client } = stubClient([
      0.9,
      MIN_SIMILARITY - 0.01,
      0.05,
    ]);

    const matches = await findRelevantChunks(client, "q", "key");

    assert.equal(matches.length, 1);
    assert.equal(matches[0].similarity, 0.9);
  });

  it("applies a caller-supplied floor in SQL AND in memory (regression)", async () => {
    mockEmbeddingFetch();
    const { client, floorSentToSql } = stubClient([
      0.9, 0.35, 0.25, 0.1,
    ]);

    const matches = await findRelevantChunks(client, "q", "key", {
      minSimilarity: 0.3,
    });

    /* The stricter floor must reach the SQL function … */
    assert.equal(floorSentToSql(), 0.3);

    /* … and the in-memory filter must not keep rows the old
       hard-coded 0.2 floor would have let through. */
    assert.deepEqual(
      matches.map((m) => m.similarity),
      [0.9, 0.35]
    );
  });

  it("maps an RPC error to a thrown error the caller can fall back on", async () => {
    mockEmbeddingFetch();

    const client = {
      rpc: async () => ({
        data: null,
        error: { message: "relation does not exist" },
      }),
    } as unknown as SupabaseClient;

    await assert.rejects(() =>
      findRelevantChunks(client, "q", "key")
    );
  });
});
