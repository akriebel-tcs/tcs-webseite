/**
 * Erkennung, ob ein Produktdokument als PDF im Browser vorschaubar ist.
 * Quelle sind ausschließlich die vorhandenen Dokumentdaten (`file_type`,
 * URL-Endung) — keine hart codierten Dokumentlisten.
 */
import type { DocumentItem } from "./types";

export function isPdfDocument(doc: {
  readonly url?: string | null;
  readonly fileType?: string | null;
}): boolean {
  const type = (doc.fileType ?? "").trim().toLowerCase();
  if (type === "pdf" || type === "application/pdf") return true;
  const url = (doc.url ?? "").trim().toLowerCase();
  if (!url) return false;
  const withoutQuery = url.split("?")[0].split("#")[0];
  return withoutQuery.endsWith(".pdf");
}

export function canPreview(doc: DocumentItem): boolean {
  return Boolean(doc.url) && isPdfDocument(doc);
}
