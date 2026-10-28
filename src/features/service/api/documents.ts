/**
 * Read-only API-Schicht für Dokumentdaten aus der externen Supabase-DB.
 *
 * **Strikt read-only.** Nur `.select(...)`-Abfragen. Keine `insert` /
 * `update` / `delete` / `upsert`. Diese Datei kapselt direkte
 * Dokument-/Artikelverknüpfungen, die nicht über die bevorzugte
 * `paket_dokumente_resolved_view` (siehe `features/produkte/api/products.ts`)
 * abgedeckt sind.
 *
 * Quellen (lesend):
 * - `article_documents`  – direkte Dokumente an einem Artikel
 * - `document_artikel`   – Verknüpfungstabelle Dokument ↔ Artikel
 *
 * Diese API ist vorbereitend; sie wird in dieser Etappe noch von keinem
 * UI-Konsumenten verwendet (kein Download-Bereich-UI in dieser Etappe).
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  ArticleDocument,
  DocumentArtikelLink,
} from "@/features/produkte/types";

const TABLES = {
  articleDocuments: "article_documents",
  documentArtikel: "document_artikel",
} as const;

/**
 * Liefert direkte Dokumenteinträge zu einer `artikel_nr` aus
 * `article_documents`. Read-only.
 */
export async function getArticleDocuments(
  artikelNr: string,
): Promise<ArticleDocument[]> {
  if (!artikelNr) return [];
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from(TABLES.articleDocuments)
    .select("*")
    .eq("artikel_nr", artikelNr);

  if (error) {
    throw error;
  }
  return (data ?? []) as ArticleDocument[];
}

/**
 * Liefert die Dokument↔Artikel-Verknüpfungen aus `document_artikel`
 * für eine `artikel_nr`. Read-only.
 */
export async function getDocumentArtikelLinks(
  artikelNr: string,
): Promise<DocumentArtikelLink[]> {
  if (!artikelNr) return [];
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from(TABLES.documentArtikel)
    .select("*")
    .eq("artikel_nr", artikelNr);

  if (error) {
    throw error;
  }
  return (data ?? []) as DocumentArtikelLink[];
}
