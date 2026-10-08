import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { extractPdfText } from "@/lib/pdf";

export const runtime = "nodejs";

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
                ({
                  name,
                  value,
                  options,
                }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                }
              );
            } catch {
              /*
               * Server Components may not always allow
               * cookie mutation. Reading the session is
               * still sufficient for this route.
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
          error:
            "You must be logged in to use Atlas AI.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =========================================================
     * READ QUESTION
     * =========================================================
     */

    const body = await request.json();

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

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================================
     * GET USER DOCUMENTS
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
          error:
            "Atlas could not access the document library.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "Atlas AI user:",
      user.id
    );

    console.log(
      "Atlas AI documents:",
      documents?.length ?? 0
    );

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
     * EXTRACT PDF TEXT
     * =========================================================
     */

    const documentContext: string[] = [];
    const sources: string[] = [];

    for (const document of documents) {
      const isPdf =
        document.mime_type ===
          "application/pdf" ||
        document.file_name
          ?.toLowerCase()
          .endsWith(".pdf");

      if (!isPdf) {
        continue;
      }

      try {
        /*
         * Generate Supabase Storage URL.
         */

        const { data: publicUrlData } =
          supabase.storage
            .from("documents")
            .getPublicUrl(
              document.file_name
            );

        const publicUrl =
          publicUrlData?.publicUrl;

        if (!publicUrl) {
          console.warn(
            "Could not generate URL for:",
            document.file_name
          );

          continue;
        }

        /*
         * Download PDF.
         */

        const fileResponse =
          await fetch(publicUrl);

        if (!fileResponse.ok) {
          console.warn(
            `Could not download ${document.file_name}: ${fileResponse.status}`
          );

          continue;
        }

        const arrayBuffer =
          await fileResponse.arrayBuffer();

        const buffer =
          Buffer.from(arrayBuffer);

        /*
         * Extract PDF text.
         */

        const text =
          await extractPdfText(buffer);

        if (!text) {
          console.warn(
            "No readable text found in:",
            document.file_name
          );

          continue;
        }

        /*
         * Limit document size for now.
         */

        const limitedText =
          text.slice(0, 12000);

        documentContext.push(
          `
DOCUMENT: ${document.title}
FILE: ${document.file_name}

CONTENT:
${limitedText}
          `.trim()
        );

        sources.push(
          document.title
        );
      } catch (error) {
        console.error(
          `Failed to process ${document.file_name}:`,
          error
        );
      }
    }

    /*
     * =========================================================
     * NO READABLE PDFS
     * =========================================================
     */

    if (documentContext.length === 0) {
      return NextResponse.json({
        answer:
          "I found your documents, but I couldn't extract readable text from the uploaded PDF files.",
        sources: [],
      });
    }

    /*
     * =========================================================
     * BUILD AI CONTEXT
     * =========================================================
     */

    const context =
      documentContext.join(
        "\n\n--------------------------------\n\n"
      );

    /*
     * =========================================================
     * GEMINI PROMPT
     * =========================================================
     */

    const prompt = `
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

    /*
     * =========================================================
     * CALL GEMINI
     * =========================================================
     */

    const response =
      await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
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
        }
      );

    const data =
      await response.json();

    /*
     * =========================================================
     * GEMINI ERROR
     * =========================================================
     */

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        data
      );

      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            "Gemini API request failed.",
        },
        {
          status: response.status,
        }
      );
    }

    /*
     * =========================================================
     * GET ANSWER
     * =========================================================
     */

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(
          (part: { text?: string }) =>
            part.text || ""
        )
        .join("")
        .trim();

    if (!answer) {
      return NextResponse.json(
        {
          error:
            "Gemini returned an empty response.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================================
     * RETURN ANSWER
     * =========================================================
     */

    return NextResponse.json({
      answer,
      sources,
    });
  } catch (error) {
    console.error(
      "Atlas AI error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Atlas AI failed to process the request.",
      },
      {
        status: 500,
      }
    );
  }
}