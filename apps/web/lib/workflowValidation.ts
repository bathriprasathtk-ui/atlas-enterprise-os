/* =========================================================
   WORKFLOW VALIDATION (pure)

   Shared by the create form, the server runner and unit
   tests. Kept dependency-free so route handlers can import
   it without pulling in the browser Supabase client.
========================================================= */

/**
 * Pure validation of a workflow's kind + config. Shared by
 * the create form, the server runner, and unit tests.
 * Returns an error message or null.
 */
export function validateWorkflow(
  kind: string,
  config: Record<string, unknown>
): string | null {
  if (kind !== "task_reminder" && kind !== "document_digest") {
    return "Unknown workflow type.";
  }

  const days = config.days;

  if (days !== undefined) {
    if (
      typeof days !== "number" ||
      !Number.isInteger(days) ||
      days < 1 ||
      days > 90
    ) {
      return "The reminder window must be a whole number of days between 1 and 90.";
    }
  }

  return null;
}
