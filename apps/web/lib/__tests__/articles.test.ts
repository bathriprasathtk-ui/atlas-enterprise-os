/* =========================================================
   UNIT TESTS — article validation

   The articles module pulls in the Supabase browser client,
   so stub env before the dynamic import (no network is made).
   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL ??=
  "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??=
  "test-key";

let validateArticleTitle: (title: string) => string | null;
let validateArticleContent: (
  content: string
) => string | null;
let validateArticleInput: (input: {
  title: string;
  content: string;
}) => string | null;
let ARTICLE_CATEGORIES: readonly string[];
let MAX_ARTICLE_TITLE_LENGTH: number;
let MAX_ARTICLE_CONTENT_LENGTH: number;

before(async () => {
  const mod = await import("../articles.ts");

  validateArticleTitle = mod.validateArticleTitle;
  validateArticleContent = mod.validateArticleContent;
  validateArticleInput = mod.validateArticleInput;
  ARTICLE_CATEGORIES = mod.ARTICLE_CATEGORIES;
  MAX_ARTICLE_TITLE_LENGTH = mod.MAX_ARTICLE_TITLE_LENGTH;
  MAX_ARTICLE_CONTENT_LENGTH =
    mod.MAX_ARTICLE_CONTENT_LENGTH;
});

describe("validateArticleTitle", () => {
  it("accepts a normal title", () => {
    assert.equal(validateArticleTitle("Handbook"), null);
  });

  it("trims before checking", () => {
    assert.equal(validateArticleTitle("  Handbook  "), null);
  });

  it("rejects an empty title", () => {
    assert.notEqual(validateArticleTitle("   "), null);
  });

  it("rejects a title over the maximum", () => {
    assert.notEqual(
      validateArticleTitle(
        "x".repeat(MAX_ARTICLE_TITLE_LENGTH + 1)
      ),
      null
    );
  });

  it("accepts a title at exactly the maximum", () => {
    assert.equal(
      validateArticleTitle(
        "x".repeat(MAX_ARTICLE_TITLE_LENGTH)
      ),
      null
    );
  });
});

describe("validateArticleContent", () => {
  it("accepts empty content", () => {
    assert.equal(validateArticleContent(""), null);
  });

  it("accepts content within the maximum", () => {
    assert.equal(
      validateArticleContent(
        "y".repeat(MAX_ARTICLE_CONTENT_LENGTH)
      ),
      null
    );
  });

  it("rejects content over the maximum", () => {
    assert.notEqual(
      validateArticleContent(
        "y".repeat(MAX_ARTICLE_CONTENT_LENGTH + 1)
      ),
      null
    );
  });
});

describe("validateArticleInput", () => {
  it("reports title problems first", () => {
    assert.match(
      validateArticleInput({ title: "", content: "" }) ?? "",
      /title/i
    );
  });

  it("reports content problems when the title is fine", () => {
    assert.match(
      validateArticleInput({
        title: "Ok",
        content: "y".repeat(MAX_ARTICLE_CONTENT_LENGTH + 1),
      }) ?? "",
      /content/i
    );
  });

  it("accepts a valid article", () => {
    assert.equal(
      validateArticleInput({
        title: "Ok",
        content: "body",
      }),
      null
    );
  });
});

describe("article constants", () => {
  it("categories are unique and non-empty", () => {
    assert.ok(ARTICLE_CATEGORIES.length > 0);
    assert.equal(
      new Set(ARTICLE_CATEGORIES).size,
      ARTICLE_CATEGORIES.length
    );
  });
});
