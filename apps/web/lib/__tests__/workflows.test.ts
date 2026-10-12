/* =========================================================
   UNIT TESTS — workflow validation (pure module)

   workflowValidation.ts is dependency-free, so it is
   imported directly — no env stubs or network needed.
   Run: npm test
========================================================= */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateWorkflow } from "../workflowValidation.ts";

describe("validateWorkflow", () => {
  it("rejects an unknown workflow kind", () => {
    assert.ok(validateWorkflow("email_blaster", {}));
  });

  it("accepts task_reminder with no config", () => {
    assert.equal(validateWorkflow("task_reminder", {}), null);
  });

  it("accepts document_digest with no config", () => {
    assert.equal(validateWorkflow("document_digest", {}), null);
  });

  it("accepts the window boundaries 1 and 90", () => {
    assert.equal(
      validateWorkflow("task_reminder", { days: 1 }),
      null
    );
    assert.equal(
      validateWorkflow("task_reminder", { days: 90 }),
      null
    );
  });

  it("rejects a window below 1 or above 90", () => {
    assert.ok(
      validateWorkflow("task_reminder", { days: 0 })
    );
    assert.ok(
      validateWorkflow("task_reminder", { days: 91 })
    );
  });

  it("rejects non-integer and non-number windows", () => {
    assert.ok(
      validateWorkflow("task_reminder", { days: 1.5 })
    );
    assert.ok(
      validateWorkflow("task_reminder", { days: "7" })
    );
    assert.ok(
      validateWorkflow("task_reminder", { days: null })
    );
  });
});
