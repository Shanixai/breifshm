import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
// @ts-expect-error - mammoth browser build has no types
import mammoth from "mammoth/mammoth.browser";

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_CHARS = 50_000;

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const pageCount = Math.min(pdf.numPages, 50);
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ");
    parts.push(text);
    if (parts.join("\n").length > MAX_CHARS) break;
  }
  return parts.join("\n\n").slice(0, MAX_CHARS);
}

export async function extractDocxText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value || "").slice(0, MAX_CHARS);
}

export async function readTextFile(file: File): Promise<string> {
  const text = await file.text();
  return text.slice(0, MAX_CHARS);
}
