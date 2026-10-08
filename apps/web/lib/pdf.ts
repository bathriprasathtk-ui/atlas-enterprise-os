import { PDFParse } from "pdf-parse";

export async function extractPdfText(
  buffer: Buffer
): Promise<string> {
  const parser = new PDFParse({
    data: buffer,
  });

  const result = await parser.getText();

  await parser.destroy();

  return result.text.trim();
}