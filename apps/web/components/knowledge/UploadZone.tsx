"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadDocument } from "@/lib/storage";
import { supabase } from "@/lib/supabaseClient";

export default function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    try {
      setUploading(true);

      // Upload to Storage
      const { fileName, fileUrl } =
        await uploadDocument(file);

      // Current user
      const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

console.log("USER:", user);
console.log("AUTH ERROR:", authError);

      // Save metadata
      const { error } = await supabase
        .from("documents")
        .insert({
          title: file.name,
          file_name: fileName,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        });

      if (error) {
  console.error(error);
  throw error;
} 
window.location.reload();

      alert("✅ Document uploaded successfully!");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-3xl border-2 border-dashed border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 p-14 text-center">

      <UploadCloud
        className="mx-auto text-cyan-400"
        size={60}
      />

      <h2 className="mt-6 text-2xl font-bold text-white">
        Drag & Drop Documents
      </h2>

      <p className="mt-2 text-slate-400">
        PDF • DOCX • PPT • Images
      </p>

      <input
        ref={inputRef}
        hidden
        type="file"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-8 rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Browse Files"}
      </button>

    </div>
  );
}