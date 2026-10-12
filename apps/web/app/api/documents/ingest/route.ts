/* =========================================================
   DOCUMENT INGESTION API

   POST /api/documents/ingest
   Body: { documentId?: string }

   - With documentId: (re)ingest that one document.
   - Without: ingest up to 10 of the user's recent PDF
     documents that have no indexed chunks yet (backfill
     for documents uploaded before semantic indexing).

   Everything is scoped to the authenticated user:
   document lookups filter uploaded_by, storage access uses
   signed URLs for their own objects, chunk writes are
   owner-checked (RLS + explicit uploaded_by).
========================================================= */

import { NextResponse } from "next/server";

import { chunkText } from "@/lib/chunking";
import { embedTexts } from "@/lib/embeddings";
import { extractPdfText } from "@/lib/pdf";
import { logAudit } from "@/lib/auditServer";
import { getRouteAuth } from "@/lib/routeAuth";

export const runtime = "nodejs";

/*
 * Ingesting a large PDF involves one embedding call per 20
 * chunks; allow the platform's maximum useful duration.
 * (On Vercel this requires a plan supporting it - adjust if
 * your deployment caps this lower.)
 */
export const maxDuration = 300;

/** Backfill batch size when no documentId is given. */
const MAX_BACKFILL_DOCS = 10;

const PDF_MIME = "application/pdf";

type IngestTarget = {
  id: string;
  title: string | null;
  file_name: string | null;
  mime_type: string | null;
};

function isPdf(doc: IngestTarget): boolean {
  return (
    doc.mime_type === PDF_MIME ||
    !!doc.file_name?.toLowerCase().endsWith(".pdf")
  );
}

export async function POST(request: Request) {
  /* ---------- AUTHENTICATION ---------- */

  const { supabase, user } = await getRouteAuth();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to index documents." },
      { status: 401 }
    );
  }

  /* ---------- CONFIG ---------- */

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  /* ---------- TARGET DOCUMENTS ---------- */

  let documentId: unknown;

  try {
    const body = await request.json();
    documentId = body?.documentId;
  } catch {
    /* empty body is fine - means backfill mode */
  }

  const targets: IngestTarget[] = [];

  if (typeof documentId === "string" && documentId) {
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, title, file_name, mime_type")
      .eq("id", documentId)
      /* explicit owner scope (defense in depth on RLS) */
      .eq("uploaded_by", user.id)
      .maybeSingle();

    if (error) {
      console.error("Ingest document lookup error:", error);

      return NextResponse.json(
        { error: "Could not look up the document." },
        { status: 500 }
      );
    }

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    if (!isPdf(doc)) {
      return NextResponse.json(
        {
          error:
            "Only PDF documents can be indexed for semantic search right now.",
        },
        { status: 400 }
      );
    }

    targets.push(doc);
  } else {
    /* Backfill: recent PDFs without any indexed chunks. */

    const { data: pdfDocs, error: docsError } = await supabase
      .from("documents")
      .select("id, title, file_name, mime_type")
      .eq("uploaded_by", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (docsError) {
      console.error("Ingest backfill lookup error:", docsError);

      return NextResponse.json(
        { error: "Could not list documents." },
        { status: 500 }
      );
    }

    const { data: chunked, error: chunksError } = await supabase
      .from("document_chunks")
      .select("document_id");

    if (chunksError) {
      console.error("Ingest chunk lookup error:", chunksError);

      return NextResponse.json(
        { error: "Could not inspect the index." },
        { status: 500 }
      );
    }

    const alreadyIndexed = new Set(
      (chunked ?? []).map((row) => row.document_id)
    );

    for (const doc of pdfDocs ?? []) {
      if (isPdf(doc) && !alreadyIndexed.has(doc.id)) {
        targets.push(doc);

        if (targets.length >= MAX_BACKFILL_DOCS) {
          break;
        }
      }
    }

    if (targets.length === 0) {
      return NextResponse.json({
        processed: 0,
        failed: 0,
        results: [],
        message:
          "All PDF documents are already indexed for semantic search.",
      });
    }
  }

  /* ---------- INGEST EACH DOCUMENT ---------- */

  const results: unknown[] = [];
  let processed = 0;
  let failed = 0;

  for (const doc of targets) {
    try {
      /* 1. Signed URL to the user's own private object. */
      const { data: signedData, error: signError } =
        await supabase.storage
          .from("documents")
          .createSignedUrl(doc.file_name ?? "", 300);

      if (signError || !signedData?.signedUrl) {
        throw new Error("Could not access the stored file.");
      }

      /* 2. Download + extract text. */
      const fileResponse = await fetch(signedData.signedUrl);

      if (!fileResponse.ok) {
        throw new Error(
          `Stored file download failed (${fileResponse.status}).`
        );
      }

      const buffer = Buffer.from(
        await fileResponse.arrayBuffer()
      );

      const text = await extractPdfText(buffer);

      if (!text) {
        results.push({
          documentId: doc.id,
          chunks: 0,
          note: "No readable text in this PDF.",
        });
        continue;
      }

      /* 3. Chunk + embed. */
      const chunks = chunkText(text);

      if (chunks.length === 0) {
        results.push({
          documentId: doc.id,
          chunks: 0,
          note: "No readable text in this PDF.",
        });
        continue;
      }

      const vectors = await embedTexts(
        chunks.map((chunk) => chunk.content),
        apiKey
      );

      /* 4. Replace any previous index for this document. */
      const { error: deleteError } = await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", doc.id)
        .eq("uploaded_by", user.id);

      if (deleteError) {
        throw deleteError;
      }

      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(
          chunks.map((chunk, i) => ({
            document_id: doc.id,
            uploaded_by: user.id,
            chunk_index: chunk.index,
            content: chunk.content,
            /*
             * JSON string form casts cleanly to vector(768)
             * through PostgREST.
             */
            embedding: JSON.stringify(vectors[i]),
          }))
        );

      if (insertError) {
        throw insertError;
      }

      await logAudit(supabase, {
        action: "document.ingest",
        entity: "document",
        entityId: doc.id,
        metadata: { chunks: chunks.length },
      });

      processed += 1;
      results.push({ documentId: doc.id, chunks: chunks.length });
    } catch (error) {
      failed += 1;

      /* Error objects only - no user content or IDs logged. */
      console.error("Document ingestion error:", error);

      results.push({
        documentId: doc.id,
        error:
          error instanceof Error
            ? error.message
            : "Indexing failed.",
      });
    }
  }

  return NextResponse.json({ processed, failed, results });
}
