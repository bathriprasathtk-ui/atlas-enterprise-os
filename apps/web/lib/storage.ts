import { supabase } from "./supabaseClient";

/* =========================================================
   UPLOAD CONSTRAINTS
   (mirrored by the storage bucket policy in
   supabase/migrations/0001_init.sql)
========================================================= */

export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

/**
 * Returns an error message when the file is not allowed,
 * or null when the file is valid.
 */
export function validateUploadFile(file: File): string | null {
  if (!file || file.size === 0) {
    return "The selected file is empty.";
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const maxMb = Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024));
    return `File is too large. Maximum allowed size is ${maxMb} MB.`;
  }

  const mimeType = (file.type || "").toLowerCase();

  if (!mimeType || !ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType)) {
    return "Unsupported file type. Allowed: PDF, Word, PowerPoint, and image files.";
  }

  return null;
}

/* =========================================================
   AUTH HELPERS
========================================================= */

async function requireAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to manage documents.");
  }

  return user;
}

/**
 * Storage paths are user-scoped: `{userId}/{timestamp}-{filename}`.
 * Verifies that a path belongs to the given user before any
 * storage operation (defense in depth on top of RLS policies).
 */
function assertOwnedPath(path: string, userId: string) {
  if (!path || !path.startsWith(`${userId}/`)) {
    throw new Error("You do not have access to this document.");
  }
}

/**
 * Removes path separators from an uploaded file name so the
 * final storage path always keeps the `{userId}/...` shape.
 */
function sanitizeFileName(name: string) {
  return name.replace(/[/\\]/g, "_").trim() || "file";
}

/* =========================================================
   UPLOAD
========================================================= */

export async function uploadDocument(file: File) {
  const user = await requireAuthUser();

  const validationError = validateUploadFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const fileName = `${user.id}/${Date.now()}-${sanitizeFileName(
    file.name
  )}`;

  const { error } = await supabase.storage
    .from("documents")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  return {
    fileName,
    fileUrl: "",
  };
}

/* =========================================================
   SIGNED URLs (private bucket — no public URLs)
========================================================= */

export async function createSignedDocumentUrl(
  fileName: string,
  expiresInSeconds = 3600
): Promise<string> {
  const user = await requireAuthUser();

  if (!fileName) {
    throw new Error("File name is missing.");
  }

  assertOwnedPath(fileName, user.id);

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(fileName, expiresInSeconds);

  if (error) {
    console.error("Signed URL error:", error);
    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error("Could not generate a signed document URL.");
  }

  return data.signedUrl;
}

/* =========================================================
   DELETE (storage object)
========================================================= */

export async function removeStoredDocument(fileName: string) {
  const user = await requireAuthUser();

  if (!fileName) {
    throw new Error("File name is missing.");
  }

  assertOwnedPath(fileName, user.id);

  const { error } = await supabase.storage
    .from("documents")
    .remove([fileName]);

  if (error) {
    console.error("Storage delete error:", error);
    throw error;
  }
}
