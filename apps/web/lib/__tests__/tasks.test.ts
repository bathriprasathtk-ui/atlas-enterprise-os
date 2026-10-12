/* =========================================================
   UNIT TESTS — task validation + stats

   The tasks module pulls in the Supabase browser client, so
   stub env before the dynamic import (no network is made).
   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import type { Task, TaskStats } from "../tasks.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL ??=
  "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??=
  "test-key";

let validateTaskInput: (input: {
  title: string;
  due_date?: string | null;
}) => string | null;

let computeTaskStats: (tasks: Task[]) => TaskStats;

/** Local YYYY-MM-DD for today + offset (matches how the app
 *  parses due dates: <date>T00:00:00 in local time). */
function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function task(
  status: Task["status"],
  due_date: string | null = null
): Task {
  return {
    id: `00000000-0000-0000-0000-${String(
      task.counter++
    ).padStart(12, "0")}`,
    title: "Sample task",
    description: null,
    project_id: null,
    assigned_to: null,
    priority: "medium",
    status,
    due_date,
    created_by: "user",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
task.counter = 1;

before(async () => {
  const mod = await import("../tasks.ts");
  validateTaskInput = mod.validateTaskInput;
  computeTaskStats = mod.computeTaskStats;
});

describe("validateTaskInput", () => {
  it("rejects an empty title", () => {
    assert.ok(validateTaskInput({ title: "" }));
  });

  it("rejects a whitespace-only title", () => {
    assert.ok(validateTaskInput({ title: "   " }));
  });

  it("rejects a title over 200 characters", () => {
    assert.ok(validateTaskInput({ title: "a".repeat(201) }));
  });

  it("accepts a 200-character title", () => {
    assert.equal(
      validateTaskInput({ title: "a".repeat(200) }),
      null
    );
  });

  it("rejects an unparseable due date", () => {
    assert.ok(
      validateTaskInput({ title: "Ship", due_date: "soon" })
    );
  });

  it("accepts a valid due date", () => {
    assert.equal(
      validateTaskInput({
        title: "Ship",
        due_date: "2026-12-01",
      }),
      null
    );
  });

  it("accepts a null due date", () => {
    assert.equal(
      validateTaskInput({ title: "Ship", due_date: null }),
      null
    );
  });

  it("trims before validating", () => {
    assert.equal(
      validateTaskInput({ title: "  Ship it  " }),
      null
    );
  });
});

describe("computeTaskStats", () => {
  it("returns zeroes for no tasks", () => {
    assert.deepEqual(computeTaskStats([]), {
      total: 0,
      todo: 0,
      inProgress: 0,
      done: 0,
      dueSoon: 0,
    });
  });

  it("counts each status", () => {
    const stats = computeTaskStats([
      task("todo"),
      task("todo"),
      task("in_progress"),
      task("done"),
    ]);

    assert.equal(stats.total, 4);
    assert.equal(stats.todo, 2);
    assert.equal(stats.inProgress, 1);
    assert.equal(stats.done, 1);
    assert.equal(stats.dueSoon, 0);
  });

  it("counts open tasks due within 3 days as due soon", () => {
    const stats = computeTaskStats([
      task("todo", localDate(0)),
      task("in_progress", localDate(3)),
      task("todo", localDate(10)),
      task("todo", null),
    ]);

    assert.equal(stats.dueSoon, 2);
  });

  it("never counts done tasks as due soon", () => {
    const stats = computeTaskStats([
      task("done", localDate(1)),
    ]);

    assert.equal(stats.dueSoon, 0);
  });

  it("does not count overdue tasks as due soon", () => {
    const stats = computeTaskStats([
      task("todo", localDate(-1)),
    ]);

    assert.equal(stats.dueSoon, 0);
  });
});
