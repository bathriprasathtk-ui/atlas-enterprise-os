import { supabase } from "./supabaseClient";

export async function uploadDocument(file: File) {
  const fileName = `${Date.now()}-${file.name}`;

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