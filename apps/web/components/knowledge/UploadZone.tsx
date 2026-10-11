"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  UploadCloud,
} from "lucide-react";

import { uploadDocument, validateUploadFile } from "@/lib/storage";
import { supabase } from "@/lib/supabaseClient";

type UploadZoneProps = {
  /** Called after a document was stored, so the parent page can refresh its list. */
  onUploaded?: () => void;
};

export default function UploadZone({ onUploaded }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function isPdf(file: File) {
    return (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  }

  async function handleFile(file: File) {
    setError(null);
    setSuccess(null);
    setNote(null);

    /* ---------- VALIDATION ---------- */

    const validationError = validateUploadFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    /* ---------- AUTHENTICATION ---------- */

    try {
      setUploading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("You must be signed in to upload documents.");
        return;
      }

      /* ---------- UPLOAD TO STORAGE ---------- */

      const { fileName } = await uploadDocument(file);

      /* ---------- SAVE METADATA ---------- */

      const { data: inserted, error: insertError } =
        await supabase
          .from("documents")
          .insert({
            title: file.name,
            file_name: fileName,
            file_url: "",
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          })
          .select("id")
          .single();

      if (insertError) {
        console.error("Document insert error:", insertError);

        /* Best-effort cleanup so the private object does not orphan. */
        try {
          await supabase.storage.from("documents").remove([fileName]);
        } catch (cleanupError) {
          console.error("Upload cleanup failed:", cleanupError);
        }

        setError(
          "The file was uploaded but could not be saved to your document library. Please try again."
        );
        return;
      }

      setSuccess(`"${file.name}" uploaded successfully.`);

      /* Refresh the document list through the existing page state. */
      onUploaded?.();

      /* ---------- AI INDEXING (PDFs only, non-fatal) ---------- */

      const documentId = inserted?.id as string | undefined;

      if (documentId && isPdf(file)) {
        try {
          const ingestResponse = await fetch(
            "/api/documents/ingest",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ documentId }),
            }
          );

          if (!ingestResponse.ok) {
            throw new Error(
              `Indexing failed (${ingestResponse.status})`
            );
          }

          setSuccess(
            `"${file.name}" uploaded and indexed for AI search.`
          );
        } catch (indexError) {
          console.error("AI indexing error:", indexError);

          setNote(
            "The file was saved, but AI indexing failed. Use the document's Reprocess action to retry."
          );
        }
      }
    } catch (err) {
      console.error("Upload error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "The upload failed. Please try again."
      );
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
        accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];

          if (file) {
            handleFile(file);
          }

          /* Allow re-selecting the same file after a failure. */
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-8 rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Browse Files"}
      </button>

      {/* ---------- STATUS ---------- */}

      {error && (
        <p
          role="alert"
          className="mx-auto mt-5 flex max-w-md items-start gap-2 text-left text-sm leading-5 text-red-300"
        >
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0"
          />
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mx-auto mt-5 flex max-w-md items-start gap-2 text-left text-sm leading-5 text-emerald-300"
        >
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0"
          />
          {success}
        </p>
      )}

      {note && (
        <p
          role="status"
          className="mx-auto mt-3 flex max-w-md items-start gap-2 text-left text-sm leading-5 text-amber-300"
        >
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0"
          />
          {note}
        </p>
      )}

    </div>
  );
}
