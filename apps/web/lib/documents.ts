import { logAuditClient } from "./audit.ts";
import { supabase } from "./supabaseClient.ts";
import {
  createSignedDocumentUrl,
  removeStoredDocument,
} from "./storage.ts";

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

/**
 * Explicit ownership guard used by every storage operation.
 * Storage paths are user-scoped: `{userId}/{timestamp}-{filename}`.
 */
function assertOwnedPath(path: string, userId: string) {
  if (!path || !path.startsWith(`${userId}/`)) {
    throw new Error("You do not have access to this document.");
  }
}

/* =========================================================
   GET DOCUMENTS
========================================================= */

export async function getDocuments(): Promise<Document[]> {
  const userId = await getCurrentUserId();

  /* Signed out: return an empty list instead of erroring. */
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    /* Explicit per-user scoping (defense in depth on top of RLS). */
    .eq("uploaded_by", userId)
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

  assertOwnedPath(fileName, userId);

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

  assertOwnedPath(fileName, userId);

  /* ---------- DELETE FROM STORAGE ---------- */

  await removeStoredDocument(fileName);

  /* ---------- DELETE DATABASE RECORD ---------- */

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    /* Explicit per-user scoping (defense in depth on top of RLS). */
    .eq("uploaded_by", userId);

  if (dbError) {
    console.error(
      "Database delete error:",
      dbError
    );

    throw dbError;
  }

  await logAuditClient({
    action: "document.delete",
    entity: "document",
    entityId: id,
  });

  return true;
}
