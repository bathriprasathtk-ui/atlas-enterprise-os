/* =========================================================
   TEXT CHUNKING (Organizational Memory)

   Splits extracted document text into overlapping chunks
   sized for the Gemini embedding model. Chunks stay far
   below the model's 8,192-token input limit (~1,600 chars
   is roughly 400-500 tokens).

   Pure functions only - unit tested via:
     node --test lib/__tests__/chunking.test.ts
========================================================= */

export type TextChunk = {
  index: number;
  content: string;
};

/** Target maximum characters per chunk. */
export const CHUNK_MAX_CHARS = 1600;

/** Characters carried over from the previous chunk for context. */
export const CHUNK_OVERLAP_CHARS = 200;

type ChunkOptions = {
  maxChars?: number;
  overlapChars?: number;
};

/**
 * Normalizes whitespace so chunk boundaries are predictable:
 * CRLF -> LF, trims lines, collapses 3+ newlines to 2.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits a long paragraph into sentence-ish pieces so that a
 * single huge paragraph still produces readable chunks.
 */
function splitIntoSentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s"')\]]*|[^.!?]+$/g);

  if (!sentences) {
    return [text];
  }

  return sentences.map((s) => s.trim()).filter(Boolean);
}

/**
 * Hard-splits an oversized piece at word boundaries.
 */
function hardSplit(text: string, maxChars: number): string[] {
  const pieces: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf(" ", maxChars);

    if (cut < maxChars * 0.5) {
      cut = maxChars;
    }

    pieces.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) {
    pieces.push(remaining);
  }

  return pieces;
}

/**
 * Ensures no single piece exceeds maxChars, splitting by
 * sentences first and words only as a last resort.
 */
function boundPieceSize(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const bounded: string[] = [];
  let buffer = "";

  for (const sentence of splitIntoSentences(text)) {
    if (sentence.length > maxChars) {
      if (buffer) {
        bounded.push(buffer.trim());
        buffer = "";
      }

      bounded.push(...hardSplit(sentence, maxChars));
      continue;
    }

    if (buffer.length + sentence.length + 1 > maxChars) {
      if (buffer) {
        bounded.push(buffer.trim());
      }

      buffer = sentence;
    } else {
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
  }

  if (buffer.trim()) {
    bounded.push(buffer.trim());
  }

  return bounded;
}

/**
 * Returns the last `overlapChars` characters of `text`, cut at
 * a word boundary so the overlap reads naturally.
 */
function overlapTail(text: string, overlapChars: number): string {
  if (text.length <= overlapChars) {
    return text;
  }

  const tail = text.slice(text.length - overlapChars);
  const cut = tail.indexOf(" ");

  return cut > 0 && cut < overlapChars * 0.5
    ? tail.slice(cut + 1)
    : tail;
}

/**
 * Splits normalized-or-raw text into overlapping chunks.
 *
 * - Paragraphs are packed greedily up to maxChars.
 * - Oversized paragraphs are split on sentence boundaries.
 * - Each chunk (after the first) is prefixed with the tail of
 *   the previous chunk so meaning spanning a boundary survives.
 * - Empty input returns [].
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const maxChars = Math.max(
    200,
    options.maxChars ?? CHUNK_MAX_CHARS
  );
  const overlapChars = Math.min(
    Math.max(0, options.overlapChars ?? CHUNK_OVERLAP_CHARS),
    Math.floor(maxChars / 4)
  );

  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split("\n\n")
    .flatMap((paragraph) =>
      boundPieceSize(paragraph, maxChars)
    )
    .filter(Boolean);

  const chunks: TextChunk[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const needsBreak =
      current.length > 0 &&
      current.length + paragraph.length + 2 > maxChars;

    if (needsBreak) {
      chunks.push({ index: chunks.length, content: current });

      /*
       * Carry the tail forward, trimmed to whatever room the
       * next piece leaves, so a chunk never exceeds maxChars.
       */
      const overlap = overlapTail(current, overlapChars);
      const room = maxChars - paragraph.length - 2;

      const fit =
        room > 0
          ? overlap.length > room
            ? overlap.slice(-room)
            : overlap
          : "";

      current = fit ? `${fit}\n\n${paragraph}` : paragraph;
    } else {
      current = current
        ? `${current}\n\n${paragraph}`
        : paragraph;
    }
  }

  if (current) {
    chunks.push({ index: chunks.length, content: current });
  }

  return chunks;
}
