import { supabase } from "./supabaseClient";

export type Document = {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
};

/* =========================================================
   GET DOCUMENTS
========================================================= */

export async function getDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
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
   GET STORAGE URL
========================================================= */

export function getDocumentUrl(fileName: string): string {
  if (!fileName) {
    throw new Error("File name is missing.");
  }

  const { data } = supabase.storage
    .from("documents")
    .getPublicUrl(fileName);

  if (!data?.publicUrl) {
    throw new Error("Could not generate document URL.");
  }

  return data.publicUrl;
}

/* =========================================================
   DOWNLOAD DOCUMENT FROM STORAGE
========================================================= */

export async function downloadDocument(fileName: string) {
  if (!fileName) {
    throw new Error("File name is missing.");
  }

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
  if (!id) {
    throw new Error("Document ID is missing.");
  }

  if (!fileName) {
    throw new Error("File name is missing.");
  }

  /* ---------- DELETE FROM STORAGE ---------- */

  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([fileName]);

  if (storageError) {
    console.error(
      "Storage delete error:",
      storageError
    );

    throw storageError;
  }

  /* ---------- DELETE DATABASE RECORD ---------- */

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (dbError) {
    console.error(
      "Database delete error:",
      dbError
    );

    throw dbError;
  }

  return true;
}