/* =========================================================
   GEMINI EMBEDDINGS (server-side only)

   Uses Google's gemini-embedding-2 model via plain fetch
   (no extra SDK dependency). The API key MUST only ever be
   provided from a server context (route handlers / server
   components) - never from client code.

   References:
   - https://ai.google.dev/gemini-api/docs/embeddings
   - https://ai.google.dev/api/embeddings
========================================================= */

/**
 * Must match vector(768) in supabase/migrations/0002_embeddings.sql.
 * Changing this requires regenerating every stored embedding.
 */
export const EMBEDDING_DIMENSIONS = 768;

const EMBEDDING_MODEL = "gemini-embedding-2";

/**
 * gemini-embedding-2 accepts 8,192 tokens per input (~4 chars
 * per token). We keep a conservative character guard and rely
 * on chunking to stay far below it.
 */
export const EMBEDDING_MAX_INPUT_CHARS = 28000;

/**
 * Request size for batchEmbedContents. Kept small to stay well
 * inside per-project rate limits and request-size ceilings.
 */
const EMBEDDING_BATCH_SIZE = 20;

const EMBEDDING_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`;

export class EmbeddingError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "EmbeddingError";
    this.status = status;
  }
}

type EmbedRequest = {
  model: string;
  content: { parts: { text: string }[] };
  embedContentConfig: { outputDimensionality: number };
};

function buildRequest(text: string): EmbedRequest {
  return {
    model: `models/${EMBEDDING_MODEL}`,
    content: {
      parts: [
        {
          text: text.slice(0, EMBEDDING_MAX_INPUT_CHARS),
        },
      ],
    },
    embedContentConfig: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  };
}

/**
 * Embeds a batch of texts. Returns one vector per input, in
 * input order. Throws EmbeddingError on any API failure or a
 * malformed response (never silently returns wrong-shaped
 * vectors, which would corrupt retrieval quality).
 */
export async function embedTexts(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (!apiKey) {
    throw new EmbeddingError(
      "The embedding API key is not configured."
    );
  }

  const inputs = texts
    .map((text) => text.trim())
    .filter(Boolean);

  if (inputs.length === 0) {
    return [];
  }

  const vectors: number[][] = [];

  for (
    let offset = 0;
    offset < inputs.length;
    offset += EMBEDDING_BATCH_SIZE
  ) {
    const batch = inputs.slice(
      offset,
      offset + EMBEDDING_BATCH_SIZE
    );

    const response = await fetch(EMBEDDING_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        requests: batch.map(buildRequest),
      }),
    });

    if (!response.ok) {
      const detail = await response
        .text()
        .catch(() => "");

      throw new EmbeddingError(
        `Embedding request failed (${response.status}). ${detail.slice(0, 300)}`,
        response.status
      );
    }

    const data = (await response.json()) as {
      embeddings?: { values?: number[] }[];
    };

    const batchVectors = data.embeddings ?? [];

    if (batchVectors.length !== batch.length) {
      throw new EmbeddingError(
        "Embedding response did not include one vector per input."
      );
    }

    for (const embedding of batchVectors) {
      const values = embedding.values ?? [];

      if (values.length !== EMBEDDING_DIMENSIONS) {
        throw new EmbeddingError(
          `Embedding vector had ${values.length} dimensions, expected ${EMBEDDING_DIMENSIONS}.`
        );
      }

      vectors.push(values);
    }
  }

  return vectors;
}

/**
 * Convenience wrapper for a single input (e.g. a search query
 * or an AI question).
 */
export async function embedText(
  text: string,
  apiKey: string
): Promise<number[]> {
  const vectors = await embedTexts([text], apiKey);

  const vector = vectors[0];

  if (!vector) {
    throw new EmbeddingError(
      "Embedding request returned no vector."
    );
  }

  return vector;
}
