import { logAuditClient } from "./audit.ts";
import { supabase } from "./supabaseClient.ts";
import {
  assertVisibleDocument,
  createSignedDocumentUrl,
  removeStoredDocument,
} from "./storage.ts";
import {
  getCurrentOrg,
  getCurrentOrgId,
  requireOrgId,
} from "./orgContext.ts";

export type Document = {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  /** Preset category chosen at upload (migration 0004); null for legacy rows. */
  category: string | null;
};

/** Preset categories offered at upload time. */
export const DOCUMENT_CATEGORIES = [
  "General",
  "HR",
  "Projects",
  "Policies",
  "Archives",
] as const;

/* =========================================================
   AUTH HELPERS
========================================================= */

/**
 * Returns the current user's id, or null when signed out.
 */
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

/* =========================================================
   GET DOCUMENTS
========================================================= */

export async function getDocuments(): Promise<Document[]> {
  const orgId = await getCurrentOrgId();

  /* Signed out or no organization yet: empty list. */
  if (!orgId) {
    return [];
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    /* Explicit org scoping (defense in depth on top of RLS). */
    .eq("organization_id", orgId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Get documents error:", error);
    throw error;
  }

  return (data ?? []) as Document[];
}

/* =========================================================
   SIGNED URL (replaces the old public URL helper)
========================================================= */

export async function getDocumentSignedUrl(
  fileName: string
): Promise<string> {
  return createSignedDocumentUrl(fileName);
}

/* =========================================================
   DOWNLOAD DOCUMENT FROM STORAGE
========================================================= */

export async function downloadDocument(fileName: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be signed in to download documents.");
  }

  if (!fileName) {
    throw new Error("File name is missing.");
  }

  await assertVisibleDocument(fileName);

  const { data, error } = await supabase.storage
    .from("documents")
    .download(fileName);

  if (error) {
    console.error("Storage download error:", error);
    throw error;
  }

  return data;
}

/* =========================================================
   DELETE DOCUMENT
========================================================= */

export async function deleteDocument(
  id: string,
  fileName: string
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be signed in to delete documents.");
  }

  if (!id) {
    throw new Error("Document ID is missing.");
  }

  if (!fileName) {
    throw new Error("File name is missing.");
  }

  const orgId = await requireOrgId();

  await assertVisibleDocument(fileName);

  /*
   * Authorization pre-check against the real rules (uploader
   * or administrator). The storage object must be removed
   * while its document row still exists — storage delete RLS
   * keys off that row — so the permission decision has to
   * happen before any destructive step.
   */
  const { data: docRow, error: lookupError } = await supabase
    .from("documents")
    .select("uploaded_by")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const snapshot = await getCurrentOrg();
  const isAdmin =
    snapshot?.role === "owner" || snapshot?.role === "admin";

  if (
    !docRow ||
    (docRow.uploaded_by !== snapshot?.userId && !isAdmin)
  ) {
    throw new Error(
      "Only the uploader or an organization administrator can delete this document."
    );
  }

  /* ---------- DELETE FROM STORAGE ---------- */

  await removeStoredDocument(fileName);

  /* ---------- DELETE DATABASE RECORD ---------- */

  const { data: deleted, error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    /* Explicit org scoping (RLS enforces owner-or-admin). */
    .eq("organization_id", orgId)
    .select("id");

  if (dbError) {
    console.error(
      "Database delete error:",
      dbError
    );

    throw dbError;
  }

  /* Backstop: RLS agreed with the pre-check. */
  if (!deleted || deleted.length === 0) {
    throw new Error(
      "Only the uploader or an organization administrator can delete this document."
    );
  }

  await logAuditClient({
    action: "document.delete",
    entity: "document",
    entityId: id,
  });

  return true;
}
