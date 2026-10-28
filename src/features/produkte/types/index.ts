/**
 * Read-only Typen für die externe Supabase-Produkt-DB.
 *
 * Konservative Minimaltypen: Wir kennen die exakten Spalten der externen
 * Views/Tabellen in dieser Etappe nicht abschließend. Daher werden hier
 * **nur die fachlich gesicherten Felder** typisiert (vor allem `artikel_nr`
 * als fachlicher Schlüssel) und alle weiteren Felder als optional offen
 * gelassen (`unknown`-indexierbar). Das verhindert das Erfinden von Feldnamen.
 *
 * Wenn die exakten Spalten der externen DB feststehen, können diese Typen
 * in einer Folge-Etappe präzisiert (oder per `supabase gen types` generiert)
 * werden. DB-Views und DB-Felder bleiben führend.
 */

/** Gemeinsame Basisform für alle read-only Datensätze aus der externen DB. */
export interface SupabaseRecord {
  /** Erlaubt zusätzliche, hier (noch) nicht typisierte Spalten. */
  readonly [key: string]: unknown;
}

/**
 * Eintrag aus `products_public_view` – bevorzugte öffentliche Produkt-Lese-
 * schnittstelle.
 */
export interface PublicProduct extends SupabaseRecord {
  /** Fachlicher Schlüssel (z. B. PA-/PP-/PV-Präfix als reiner Kontext). */
  readonly artikel_nr?: string | null;
}

/** Eintrag aus `article_images`. */
export interface ArticleImage extends SupabaseRecord {
  readonly artikel_nr?: string | null;
}

/**
 * Eintrag aus `paket_komponenten`.
 *
 * Hinweis: Diese Tabelle wird in der API-Schicht **strikt mit
 * `status = 'active'`** gefiltert. Andere Status werden im Frontend
 * dieser Webseite nicht ausgewertet.
 */
export interface PackageComponent extends SupabaseRecord {
  readonly artikel_nr?: string | null;
  readonly status?: string | null;
}

/** Eintrag aus `paket_dokumente_resolved_view`. */
export interface PackageDocumentResolved extends SupabaseRecord {
  readonly artikel_nr?: string | null;
}

/** Eintrag aus `article_documents`. */
export interface ArticleDocument extends SupabaseRecord {
  readonly artikel_nr?: string | null;
}

/** Eintrag aus `document_artikel`. */
export interface DocumentArtikelLink extends SupabaseRecord {
  readonly artikel_nr?: string | null;
}
