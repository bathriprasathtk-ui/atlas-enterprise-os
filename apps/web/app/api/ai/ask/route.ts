import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { extractPdfText } from "@/lib/pdf";
import {
  countUserChunks,
  findRelevantChunks,
} from "@/lib/rag";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-3.6-flash";

/** Characters of full-document text per PDF in legacy mode. */
const LEGACY_MAX_CHARS_PER_DOC = 12000;

/**
 * Ceiling for one generateContent call. Kept well below any
 * platform function budget so a hung request surfaces as a
 * clean 504 instead of a platform timeout.
 */
const GEMINI_TIMEOUT_MS = 30_000;

class GeminiApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
  }
}

function buildPrompt(
  question: string,
  context: string
): string {
  return `
You are Atlas AI, the intelligent knowledge assistant
inside Atlas Enterprise OS.

Answer the user's question using the uploaded document
content provided below.

IMPORTANT RULES:

1. Use the uploaded documents as the primary source.
2. Do not invent information that is not supported by
   the documents.
3. If the answer cannot be found in the documents,
   clearly say that the information was not found.
4. You may summarize and explain information from the
   documents.
5. Mention the relevant document name when useful.
6. Give a clear and useful answer.
7. Do not claim to have read documents that are not
   included below.

USER QUESTION:
${question}

UPLOADED DOCUMENTS:
${context}
  `.trim();
}

type GeminiResponse = {
  error?: { message?: string };
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
};

async function callGemini(
  apiKey: string,
  prompt: string
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",

              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],

          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
          },
        }),

        /*
         * A hung provider request must not hold the route open
         * until the platform kills it - fail with an
         * actionable status instead.
         */
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError")
    ) {
      throw new GeminiApiError(
        "Atlas AI took too long to respond. Please try again.",
        504
      );
    }

    throw error;
  }

  /* Provider may answer with a non-JSON body (proxy error page). */
  let data: GeminiResponse;

  try {
    data = (await response.json()) as GeminiResponse;
  } catch {
    throw new GeminiApiError(
      "Gemini returned an unreadable response.",
      502
    );
  }

  if (!response.ok) {
    console.error("Gemini API error:", data);

    throw new GeminiApiError(
      data?.error?.message || "Gemini API request failed.",
      response.status
    );
  }

  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();

  if (!answer) {
    throw new GeminiApiError(
      "Gemini returned an empty response.",
      500
    );
  }

  return answer;
}

export async function POST(request: Request) {
  try {
    /*
     * =========================================================
     * CREATE AUTHENTICATED SUPABASE CLIENT
     * =========================================================
     */

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },

          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(
                ({ name, value, options }) => {
                  cookieStore.set(name, value, options);
                }
              );
            } catch {
              /*
               * Server Components may not always allow
               * cookie mutation. Reading the session
               * is still sufficient for this route.
               */
            }
          },
        },
      }
    );

    /*
     * =========================================================
     * VERIFY USER
     * =========================================================
     */

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be logged in to use Atlas AI.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =========================================================
     * RESOLVE ORGANIZATION
     * =========================================================
     */

    const { data: orgIdData } = await supabase.rpc(
      "current_org_id"
    );

    if (!orgIdData) {
      return NextResponse.json(
        { error: "Join an organization first." },
        { status: 403 }
      );
    }

    const orgId = orgIdData as string;

    /*
     * =========================================================
     * READ QUESTION
     * =========================================================
     */

    /* Malformed JSON is a client mistake, not a server error. */
    let body: { question?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

    if (!question) {
      return NextResponse.json(
        {
          error: "Question is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =========================================================
     * CHECK GEMINI KEY
     * =========================================================
     */

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      /* Not a crash: the service is deliberately unconfigured.
         503 matches the documented contract in DEPLOYMENT.md. */
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured.",
        },
        {
          status: 503,
        }
      );
    }

    /*
     * =========================================================
     * GET USER DOCUMENTS (RLS + explicit scope)
     * =========================================================
     */

    const {
      data: documents,
      error: documentsError,
    } = await supabase
      .from("documents")
      .select(
        "id, title, file_name, mime_type, created_at"
      )
      /* The caller's organization documents (RLS + explicit scope). */
      .eq("organization_id", orgId)
      .order("created_at", {
        ascending: false,
      });

    if (documentsError) {
      console.error(
        "Documents query error:",
        documentsError
      );

      return NextResponse.json(
        {
          error: "Atlas could not access the document library.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================================
     * NO DOCUMENTS
     * =========================================================
     */

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        answer:
          "I don't have any uploaded documents to search yet. Please upload a document to the Knowledge Hub and try again.",
        sources: [],
      });
    }

    /*
     * =========================================================
     * SEMANTIC RETRIEVAL (Organizational Memory)
     *
     * When the user's documents are indexed (pgvector), pull
     * only the most relevant chunks instead of feeding whole
     * PDFs to the model.
     * =========================================================
     */

    let context: string | null = null;
    let sources: string[] = [];

    try {
      const chunkCount = await countUserChunks(supabase);

      if (chunkCount > 0) {
        const matches = await findRelevantChunks(
          supabase,
          question,
          apiKey
        );

        if (matches.length > 0) {
          context = matches
            .map(
              (match, index) =>
                `DOCUMENT ${index + 1}: ${match.title}\n(relevance ${match.similarity.toFixed(2)})\n\n${match.content}`
            )
            .join(
              "\n\n--------------------------------\n\n"
            );

          sources = [
            ...new Set(matches.map((m) => m.title)),
          ];
        } else {
          /*
           * Index exists but nothing cleared the similarity
           * floor - answer honestly instead of guessing.
           */
          return NextResponse.json({
            answer:
              "I searched your indexed documents but couldn't find content relevant to that question. Try rephrasing it, or upload documents covering this topic.",
            sources: [],
          });
        }
      }
    } catch (error) {
      /*
       * Embedding/API hiccup: fall back to the legacy
       * full-document mode so the assistant keeps working.
       */
      console.warn(
        "Semantic retrieval unavailable; using full-document fallback.",
        error
      );
    }

    /*
     * =========================================================
     * LEGACY FULL-DOCUMENT MODE (pre-indexing fallback)
     * =========================================================
     */

    if (context === null) {
      const documentContext: string[] = [];
      sources = [];

      for (const document of documents) {
        const isPdf =
          document.mime_type === "application/pdf" ||
          document.file_name
            ?.toLowerCase()
            .endsWith(".pdf");

        if (!isPdf) {
          continue;
        }

        try {
          /*
           * Generate a short-lived signed URL (the bucket is
           * private).
           */

          const {
            data: signedData,
            error: signError,
          } = await supabase.storage
            .from("documents")
            .createSignedUrl(document.file_name, 300);

          const signedUrl = signedData?.signedUrl;

          if (signError || !signedUrl) {
            console.warn(
              "Could not sign URL for document:",
              document.id
            );

            continue;
          }

          const fileResponse = await fetch(signedUrl);

          if (!fileResponse.ok) {
            console.warn(
              `Could not download document ${document.id}: ${fileResponse.status}`
            );

            continue;
          }

          const arrayBuffer =
            await fileResponse.arrayBuffer();

          const buffer = Buffer.from(arrayBuffer);

          const text = await extractPdfText(buffer);

          if (!text) {
            console.warn(
              "No readable text found in document:",
              document.id
            );

            continue;
          }

          const limitedText = text.slice(
            0,
            LEGACY_MAX_CHARS_PER_DOC
          );

          documentContext.push(
            `
DOCUMENT: ${document.title}

CONTENT:
${limitedText}
          `.trim()
          );

          sources.push(document.title);
        } catch (error) {
          console.error(
            `Failed to process document ${document.id}:`,
            error
          );
        }
      }

      if (documentContext.length === 0) {
        return NextResponse.json({
          answer:
            "I found your documents, but I couldn't extract readable text from the uploaded PDF files.",
          sources: [],
        });
      }

      context = documentContext.join(
        "\n\n--------------------------------\n\n"
      );
    }

    /*
     * =========================================================
     * CALL GEMINI
     * =========================================================
     */

    const answer = await callGemini(
      apiKey,
      buildPrompt(question, context)
    );

    return NextResponse.json({
      answer,
      sources,
    });
  } catch (error) {
    if (error instanceof GeminiApiError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: error.status,
        }
      );
    }

    /*
     * Keep the detail in server logs only: an unexpected Error
     * may carry SQL, connection strings or filesystem paths, and
     * none of that belongs in a response body.
     */
    console.error("Atlas AI error:", error);

    return NextResponse.json(
      {
        error: "Atlas AI failed to process the request.",
      },
      {
        status: 500,
      }
    );
  }
}
