/* =========================================================
   UNIT TESTS — text chunking

   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CHUNK_MAX_CHARS,
  CHUNK_OVERLAP_CHARS,
  chunkText,
  normalizeText,
} from "../chunking.ts";

describe("normalizeText", () => {
  it("converts CRLF to LF and collapses runs of blank lines", () => {
    const text = "Line one.\r\n\r\n\r\n\r\nLine two.\r\n";

    assert.equal(normalizeText(text), "Line one.\n\nLine two.");
  });
});

describe("chunkText", () => {
  it("returns no chunks for empty or whitespace-only input", () => {
    assert.deepEqual(chunkText(""), []);
    assert.deepEqual(chunkText("   \n\t  \n  "), []);
  });

  it("returns a single indexed chunk for short text", () => {
    const chunks = chunkText("A short policy document.");

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].index, 0);
    assert.equal(chunks[0].content, "A short policy document.");
  });

  it("keeps every chunk within the maximum size", () => {
    const paragraphs = Array.from(
      { length: 40 },
      (_, i) =>
        `Paragraph ${i} talks about enterprise security policies ` +
        `and compliance requirements in considerable detail.`
    );

    const chunks = chunkText(paragraphs.join("\n\n"));

    assert.ok(chunks.length > 1, "expected multiple chunks");

    for (const chunk of chunks) {
      assert.ok(
        chunk.content.length <= CHUNK_MAX_CHARS,
        `chunk ${chunk.index} was ${chunk.content.length} chars`
      );
    }
  });

  it("carries overlap context across chunk boundaries", () => {
    const paragraphs = Array.from(
      { length: 30 },
      (_, i) =>
        `Section ${i} of the report covers revenue, growth plans, ` +
        `risk factors and the operational outlook for the coming year.`
    );

    const chunks = chunkText(paragraphs.join("\n\n"));

    assert.ok(chunks.length > 1, "expected multiple chunks");

    const first = chunks[0].content;
    const second = chunks[1].content;

    assert.ok(first.length > CHUNK_OVERLAP_CHARS);

    // The overlap is a suffix of the previous chunk, so any
    // sufficiently late slice of chunk 0 appears in chunk 1.
    const lateSlice = first.slice(-80);

    assert.ok(
      second.includes(lateSlice),
      "expected chunk 1 to start with the tail of chunk 0"
    );
  });

  it("assigns sequential indexes starting at 0", () => {
    const paragraphs = Array.from(
      { length: 30 },
      (_, i) => `Paragraph number ${i}, padded with extra words ` +
        `so that the document grows past a single chunk boundary.`
    );

    const chunks = chunkText(paragraphs.join("\n\n"));

    chunks.forEach((chunk, i) => {
      assert.equal(chunk.index, i);
    });
  });

  it("bounds a single oversized paragraph via sentence/word splits", () => {
    const huge =
      "This is a very long sentence used for testing. ".repeat(200);

    const chunks = chunkText(huge);

    assert.ok(chunks.length > 1);

    for (const chunk of chunks) {
      assert.ok(chunk.content.length <= CHUNK_MAX_CHARS);
    }
  });
});
