/* =========================================================
   UNIT TESTS — Gemini embeddings client (mocked fetch)

   No network access: global fetch is replaced per test.
   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  EMBEDDING_DIMENSIONS,
  EmbeddingError,
  embedText,
  embedTexts,
} from "../embeddings.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** Builds a fake batchEmbedContents response. */
function fakeResponse(
  vectors: number[][],
  init: { ok?: boolean; status?: number } = {}
): Response {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;

  return {
    ok,
    status,
    json: async () => ({ embeddings: vectors.map((v) => ({ values: v })) }),
    text: async () => "mock error body",
  } as unknown as Response;
}

function fakeVector(fill = 0.1): number[] {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, () => fill);
}

describe("embedTexts", () => {
  it("returns [] without calling the API for empty input", async () => {
    let called = 0;

    globalThis.fetch = (async () => {
      called += 1;
      return fakeResponse([]);
    }) as typeof fetch;

    assert.deepEqual(await embedTexts(["", "   "], "key"), []);
    assert.equal(called, 0);
  });

  it("calls the Gemini endpoint with the API key header", async () => {
    let seenUrl = "";
    let seenKey = "";
    let seenBody = "";

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      seenUrl = String(url);
      seenKey = String((init?.headers as Record<string, string>)?.["x-goog-api-key"]);
      seenBody = String(init?.body);
      return fakeResponse([fakeVector()]);
    }) as typeof fetch;

    const vectors = await embedTexts(["enterprise security"], "test-key");

    assert.equal(vectors.length, 1);
    assert.equal(vectors[0].length, EMBEDDING_DIMENSIONS);
    assert.ok(seenUrl.includes("batchEmbedContents"));
    assert.equal(seenKey, "test-key");
    assert.ok(seenBody.includes("outputDimensionality"));
    assert.ok(seenBody.includes(String(EMBEDDING_DIMENSIONS)));
  });

  it("batches large inputs in groups of 20", async () => {
    let calls = 0;

    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      calls += 1;
      const parsed = JSON.parse(String(init?.body)) as { requests: unknown[] };
      const vectors = parsed.requests.map(() => fakeVector());
      return fakeResponse(vectors);
    }) as typeof fetch;

    const texts = Array.from({ length: 21 }, (_, i) => `text ${i}`);
    const vectors = await embedTexts(texts, "key");

    assert.equal(vectors.length, 21);
    assert.equal(calls, 2);
  });

  it("throws EmbeddingError when a vector count mismatches", async () => {
    globalThis.fetch = (async () => fakeResponse([fakeVector()])) as typeof fetch;

    await assert.rejects(
      () => embedTexts(["one", "two"], "key"),
      (error: unknown) =>
        error instanceof EmbeddingError &&
        error.message.includes("one vector per input")
    );
  });

  it("throws EmbeddingError on wrong dimensionality", async () => {
    globalThis.fetch = (async () => fakeResponse([[0.1, 0.2, 0.3]])) as typeof fetch;

    await assert.rejects(
      () => embedTexts(["one"], "key"),
      (error: unknown) =>
        error instanceof EmbeddingError &&
        error.message.includes("expected 768")
    );
  });

  it("throws EmbeddingError with the HTTP status on API failure", async () => {
    globalThis.fetch = (async () =>
      fakeResponse([], { ok: false, status: 429 })) as typeof fetch;

    await assert.rejects(
      () => embedTexts(["one"], "key"),
      (error: unknown) =>
        error instanceof EmbeddingError && error.status === 429
    );
  });

  it("maps a request timeout to a clear EmbeddingError", async () => {
    globalThis.fetch = (async () => {
      const timeout = new Error("The operation was aborted due to timeout");
      timeout.name = "TimeoutError";
      throw timeout;
    }) as typeof fetch;

    await assert.rejects(
      () => embedTexts(["one"], "key"),
      (error: unknown) =>
        error instanceof EmbeddingError &&
        error.message.includes("timed out")
    );
  });

  it("passes an abort signal so a hung request cannot stall the route", async () => {
    const seen: { signal: AbortSignal | null | undefined } = {
      signal: undefined,
    };

    globalThis.fetch = (async (_url, init) => {
      seen.signal = init?.signal ?? null;
      return fakeResponse([fakeVector()]);
    }) as typeof fetch;

    await embedTexts(["one"], "key");

    assert.ok(seen.signal instanceof AbortSignal);
  });
});

describe("embedText", () => {
  it("throws when the response contains no vector", async () => {
    globalThis.fetch = (async () => fakeResponse([])) as typeof fetch;

    await assert.rejects(
      () => embedText("single input", "key"),
      (error: unknown) =>
        error instanceof EmbeddingError &&
        error.message.includes("one vector per input")
    );
  });

  it("rejects an empty API key before any network call", async () => {
    let called = 0;

    globalThis.fetch = (async () => {
      called += 1;
      return fakeResponse([fakeVector()]);
    }) as typeof fetch;

    await assert.rejects(
      () => embedText("input", ""),
      (error: unknown) => error instanceof EmbeddingError
    );
    assert.equal(called, 0);
  });
});
