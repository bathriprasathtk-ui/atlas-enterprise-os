"use client";

import {
  Calendar,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  deleteDocument,
  downloadDocument,
  getDocumentSignedUrl,
  type Document,
} from "@/lib/documents";

import { supabase } from "@/lib/supabaseClient";

type DocumentCardProps = {
  document: Document;
  onDeleted?: (id: string) => void;
};

export default function DocumentCard({
  document,
  onDeleted,
}: DocumentCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /* =========================================================
     GET FILE PATH
  ========================================================= */

  const getFilePath = () => {
    if (!document.file_name) {
      throw new Error("File name is missing.");
    }

    return document.file_name;
  };

  /* =========================================================
     AI INDEX STATE (real — from document_chunks)
  ========================================================= */

  const isPdfDocument =
    document.mime_type === "application/pdf";

  const [indexed, setIndexed] =
    useState<boolean | null>(null);
  const [reprocessing, setReprocessing] =
    useState(false);
  const [indexedNote, setIndexedNote] =
    useState<string | null>(null);

  useEffect(() => {
    if (!isPdfDocument) {
      return;
    }

    let active = true;

    const checkIndex = async () => {
      const { count, error } = await supabase
        .from("document_chunks")
        .select("id", { head: true, count: "exact" })
        .eq("document_id", document.id);

      if (!active) {
        return;
      }

      if (error) {
        // Unknown beats a wrong claim.
        setIndexed(null);
        return;
      }

      setIndexed((count ?? 0) > 0);
    };

    void checkIndex();

    return () => {
      active = false;
    };
  }, [document.id, isPdfDocument]);

  /* =========================================================
     RE-INDEX (extract → chunk → embed)
  ========================================================= */

  const handleReprocess = async () => {
    if (!isPdfDocument || reprocessing) {
      return;
    }

    setReprocessing(true);
    setActionError(null);
    setIndexedNote(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setActionError(
          "Your session has expired. Please sign in again."
        );
        return;
      }

      const response = await fetch(
        `/api/documents/ingest?documentId=${document.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const payload = (await response.json().catch(
        () => ({}) as { message?: string; error?: string }
      )) as { message?: string; error?: string };

      if (!response.ok) {
        setActionError(
          payload.error ?? "Could not re-index this document."
        );
        return;
      }

      setIndexed(true);
      setIndexedNote(
        payload.message ?? "Document indexed."
      );
    } catch {
      setActionError(
        "Network error while re-indexing. Please try again."
      );
    } finally {
      setReprocessing(false);
    }
  };

  /* =========================================================
     VIEW DOCUMENT
  ========================================================= */

  const handleView = async () => {
    try {
      setActionError(null);
      setViewing(true);

      const filePath = getFilePath();

      /*
       * The storage bucket is private, so previewing
       * requires a short-lived signed URL.
       */

      const signedUrl = await getDocumentSignedUrl(filePath);

      /*
       * PDF / images / text files can open directly.
       *
       * DOCX / DOC / XLSX / PPTX need an online viewer.
       */

      const mimeType =
        document.mime_type?.toLowerCase() || "";

      const isOfficeFile =
        mimeType.includes("word") ||
        mimeType.includes("document") ||
        mimeType.includes("excel") ||
        mimeType.includes("spreadsheet") ||
        mimeType.includes("powerpoint") ||
        mimeType.includes("presentation") ||
        filePath.toLowerCase().endsWith(".doc") ||
        filePath.toLowerCase().endsWith(".docx") ||
        filePath.toLowerCase().endsWith(".xls") ||
        filePath.toLowerCase().endsWith(".xlsx") ||
        filePath.toLowerCase().endsWith(".ppt") ||
        filePath.toLowerCase().endsWith(".pptx");

      if (isOfficeFile) {
        /*
         * Microsoft Office Online Viewer.
         *
         * The bucket is private, so the signed URL
         * carries temporary access for the viewer.
         */

        const officeViewerUrl =
          `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
            signedUrl
          )}`;

        window.open(
          officeViewerUrl,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        /*
         * PDF, images, txt etc.
         */

        window.open(
          signedUrl,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch (error) {
      console.error(
        "View document error:",
        error
      );

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to open this document."
      );
    } finally {
      setViewing(false);
    }
  };

  /* =========================================================
     DOWNLOAD DOCUMENT
  ========================================================= */

  const handleDownload = async () => {
    try {
      setActionError(null);
      setDownloading(true);

      const filePath = getFilePath();

      const blob = await downloadDocument(filePath);

      const url =
        window.URL.createObjectURL(blob);

      const link =
        window.document.createElement("a");

      link.href = url;

      link.download =
        document.file_name ||
        document.title ||
        "document";

      window.document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Download document error:",
        error
      );

      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to download this document."
      );
    } finally {
      setDownloading(false);
    }
  };

  /* =========================================================
     DELETE DOCUMENT
  ========================================================= */

  const handleDelete = async () => {
    setActionError(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      await deleteDocument(
        document.id,
        document.file_name
      );

      console.log(
        "Document deleted:",
        document.id
      );

      /*
       * Tell parent to remove the card
       * from the UI immediately.
       */

      onDeleted?.(document.id);
    } catch (error) {
      console.error(
        "Delete document error:",
        error
      );

      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to delete the document."
      );
    } finally {
      setDeleting(false);
    }
  };

  /* =========================================================
     FILE SIZE
  ========================================================= */

  const formatFileSize = (
    bytes: number
  ) => {
    if (!bytes || bytes <= 0) {
      return "0 KB";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }

    return `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
  };

  /* =========================================================
     DATE
  ========================================================= */

  const formattedDate =
    document.created_at
      ? new Date(
          document.created_at
        ).toLocaleDateString()
      : "Unknown date";

  /* =========================================================
     FILE TYPE
  ========================================================= */

  const fileType =
    document.mime_type
      ?.split("/")[1]
      ?.replace("vnd.openxmlformats-officedocument.", "")
      ?.replace("application.", "")
      ?.toUpperCase() ||
    document.file_name
      ?.split(".")
      .pop()
      ?.toUpperCase() ||
    "FILE";

  /* =========================================================
     UI
  ========================================================= */

  return (
    <article
      className="
        group
        relative
        flex
        min-h-[360px]
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.08]
        bg-white/[0.025]
        p-5
        backdrop-blur-xl
        transition-all
        duration-200
        hover:-translate-y-1
        hover:border-cyan-400/20
        hover:bg-white/[0.04]
      "
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-5 flex items-start justify-between">
        {/* FILE ICON */}

        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            border
            border-cyan-400/10
            bg-cyan-400/[0.06]
          "
        >
          <FileText
            size={22}
            strokeWidth={1.7}
            className="text-cyan-400"
          />
        </div>

        {/* FILE TYPE */}

        <span
          className="
            max-w-[170px]
            truncate
            rounded-full
            border
            border-cyan-400/10
            bg-cyan-400/[0.06]
            px-2.5
            py-1
            text-[10px]
            font-semibold
            uppercase
            tracking-wide
            text-cyan-400
          "
        >
          {fileType}
        </span>
      </div>

      {/* =====================================================
          TITLE
      ===================================================== */}

      <div className="min-w-0">
        <h3
          title={document.title}
          className="
            line-clamp-2
            text-base
            font-semibold
            leading-6
            text-white
          "
        >
          {document.title}
        </h3>

        <p
          title={document.file_name}
          className="
            mt-2
            truncate
            text-xs
            text-slate-500
          "
        >
          {document.file_name}
        </p>
      </div>

      {/* =====================================================
          FILE INFO
      ===================================================== */}

      <div className="mt-5 space-y-2">
        {/* SIZE */}

        <div
          className="
            flex
            items-center
            gap-2
            text-xs
            text-slate-500
          "
        >
          <span
            className="
              h-1.5
              w-1.5
              rounded-full
              bg-cyan-400
            "
          />

          {formatFileSize(
            document.file_size
          )}
        </div>

        {/* DATE */}

        <div
          className="
            flex
            items-center
            gap-2
            text-xs
            text-slate-500
          "
        >
          <Calendar
            size={13}
            strokeWidth={1.7}
          />

          {formattedDate}
        </div>

        {/* AI INDEXED — real state, RLS-scoped */}

        {isPdfDocument && indexed !== null && (
          <div
            className={`
              flex
              items-center
              gap-2
              text-xs
              ${
                indexed
                  ? "text-cyan-400"
                  : "text-slate-500"
              }
            `}
          >
            <span
              className={`
                h-1.5
                w-1.5
                rounded-full
                ${
                  indexed
                    ? "bg-cyan-400"
                    : "bg-slate-600"
                }
              `}
            />

            {indexed
              ? "AI Indexed"
              : "Not indexed"}
          </div>
        )}
      </div>

      {/* =====================================================
          SPACER
      ===================================================== */}

      <div className="flex-1" />

      {actionError && (
        <p
          role="alert"
          className="mt-4 text-xs leading-5 text-red-300"
        >
          {actionError}
        </p>
      )}

      {indexedNote && (
        <p
          role="status"
          className="mt-4 text-xs leading-5 text-emerald-300"
        >
          {indexedNote}
        </p>
      )}

      {/* =====================================================
          ACTION BUTTONS
      ===================================================== */}

      <div
        className="
          relative
          z-20
          mt-6
          flex
          items-center
          gap-2
        "
      >
        {/* =================================================
            VIEW
        ================================================= */}

        <button
          type="button"
          onClick={handleView}
          disabled={viewing}
          className="
            relative
            z-30
            flex
            h-11
            flex-1
            cursor-pointer
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-cyan-400
            px-4
            text-sm
            font-semibold
            text-slate-950
            transition-all
            duration-200
            hover:bg-cyan-300
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <Eye
            size={16}
            strokeWidth={2}
          />

          {viewing
            ? "Opening..."
            : "View"}
        </button>

        {/* =================================================
            DOWNLOAD
        ================================================= */}

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          title="Download"
          className="
            relative
            z-30
            flex
            h-11
            w-11
            shrink-0
            cursor-pointer
            items-center
            justify-center
            rounded-xl
            border
            border-white/[0.08]
            bg-white/[0.035]
            text-slate-400
            transition-all
            duration-200
            hover:border-cyan-400/20
            hover:bg-cyan-400/[0.06]
            hover:text-cyan-400
            active:scale-[0.95]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <Download
            size={17}
            strokeWidth={1.8}
            className={
              downloading
                ? "animate-pulse"
                : ""
            }
          />
        </button>

        {/* =================================================
            RE-INDEX (PDF only)
        ================================================= */}

        {isPdfDocument && (
          <button
            type="button"
            onClick={() => {
              void handleReprocess();
            }}
            disabled={reprocessing}
            title="Re-index for AI"
            className="
              relative
              z-30
              flex
              h-11
              w-11
              shrink-0
              cursor-pointer
              items-center
              justify-center
              rounded-xl
              border
              border-white/[0.08]
              bg-white/[0.035]
              text-slate-400
              transition-all
              duration-200
              hover:border-cyan-400/20
              hover:bg-cyan-400/[0.06]
              hover:text-cyan-400
              active:scale-[0.95]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <RefreshCw
              size={17}
              strokeWidth={1.8}
              className={
                reprocessing
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        )}

        {/* =================================================
            DELETE
        ================================================= */}

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete"
          className="
            relative
            z-30
            flex
            h-11
            w-11
            shrink-0
            cursor-pointer
            items-center
            justify-center
            rounded-xl
            border
            border-red-400/10
            bg-red-400/[0.04]
            text-red-400
            transition-all
            duration-200
            hover:border-red-400/25
            hover:bg-red-400/[0.08]
            active:scale-[0.95]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <Trash2
            size={17}
            strokeWidth={1.8}
            className={
              deleting
                ? "animate-pulse"
                : ""
            }
          />
        </button>
      </div>
    </article>
  );
}