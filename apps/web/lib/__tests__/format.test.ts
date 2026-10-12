/* =========================================================
   UNIT TESTS — shared formatting helpers

   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatBytes, timeAgo } from "../format.ts";

describe("timeAgo", () => {
  it("returns 'just now' for a fresh timestamp", () => {
    assert.equal(timeAgo(new Date().toISOString()), "just now");
  });

  it("clamps future timestamps to 'just now'", () => {
    const future = new Date(Date.now() + 60_000).toISOString();

    assert.equal(timeAgo(future), "just now");
  });

  it("counts minutes", () => {
    const past = new Date(Date.now() - 5 * 60_000).toISOString();

    assert.equal(timeAgo(past), "5 mins ago");
  });

  it("counts singular minutes as '1 min ago'", () => {
    const past = new Date(Date.now() - 60_000).toISOString();

    assert.equal(timeAgo(past), "1 min ago");
  });

  it("counts hours", () => {
    const past = new Date(Date.now() - 3 * 3_600_000).toISOString();

    assert.equal(timeAgo(past), "3 hours ago");
  });

  it("counts days within a week", () => {
    const past = new Date(Date.now() - 2 * 86_400_000).toISOString();

    assert.equal(timeAgo(past), "2 days ago");
  });

  it("falls back to a date string for older timestamps", () => {
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const result = timeAgo(old);

    assert.notEqual(result, "");
    assert.equal(result.includes("ago"), false);
  });

  it("returns 'unknown' for invalid input", () => {
    assert.equal(timeAgo("not-a-date"), "unknown");
  });
});

describe("formatBytes", () => {
  it("handles zero and negative input", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(-5), "0 B");
  });

  it("formats bytes", () => {
    assert.equal(formatBytes(500), "500 B");
    assert.equal(formatBytes(1023), "1023 B");
  });

  it("formats kilobytes with one decimal below 10", () => {
    assert.equal(formatBytes(1536), "1.5 KB");
  });

  it("rounds kilobytes at 10 KB and above", () => {
    assert.equal(formatBytes(10 * 1024), "10 KB");
    assert.equal(formatBytes(15 * 1024), "15 KB");
  });

  it("formats megabytes and gigabytes", () => {
    assert.equal(formatBytes(1024 * 1024), "1.0 MB");
    assert.equal(formatBytes(1024 ** 3), "1.0 GB");
  });

  it("caps at gigabytes (largest supported unit)", () => {
    assert.equal(formatBytes(1024 ** 4), "1024 GB");
  });
});
