/**
 * Read-only Typen für die offizielle Katalog-Auslieferungsschicht der externen
 * Supabase-DB (TCS-Datenbankprojekt).
 *
 * Konservative Minimaltypen: Die exakten Spalten der Views/RPCs werden hier
 * **nicht erfunden**. Wir typisieren ausschließlich das, was fachlich gesichert
 * ist (insbesondere `artikel_nr` als fachlicher Schlüssel) und lassen alle
 * weiteren Felder offen. Die Quelle der Wahrheit bleiben die DB-Views und
 * `product_column_definitions` aus der externen DB.
 */

/** Gemeinsame Basisform für read-only Datensätze aus der externen DB. */
export interface SupabaseRecord {
  readonly [key: string]: unknown;
}

/**
 * Eintrag aus `product_catalog_view` – führende öffentliche Produktliste
 * für den Online-Produktkatalog.
 *
 * Es werden hier bewusst keine zusätzlichen Spalten typisiert, um keine
 * Frontend-Annahmen über das Schema zu treffen. Die Komponente liest
 * dynamisch über `record[key]`.
 */
export interface CatalogProduct extends SupabaseRecord {
  readonly artikel_nr?: string | null;
}

/**
 * Rückgabe von `rpc_get_catalog_context()` – Kontextobjekt der externen
 * Katalog-Auslieferungsschicht. Form ist DB-seitig definiert; im Frontend
 * wird das Ergebnis nicht interpretiert, sondern nur als „erfolgreich
 * geladen" verbucht und (optional) für spätere Etappen gehalten.
 */
export type CatalogContext = SupabaseRecord | SupabaseRecord[] | null;

/**
 * Roh-Eintrag aus `product_column_definitions` (DB-führend).
 * Form bleibt offen; gelesen werden nur Felder mit bekannter Semantik.
 */
export interface ColumnDefinitionRow extends SupabaseRecord {}

/** Roh-Eintrag aus `column_presets` (DB-führend). */
export interface ColumnPresetRow extends SupabaseRecord {}

/** Roh-Eintrag aus `column_preset_columns` (DB-führend). */
export interface ColumnPresetColumnRow extends SupabaseRecord {}

/** Roh-Eintrag aus `product_filter_options_view` (DB-führend). */
export interface FilterOptionRow extends SupabaseRecord {}

/**
 * Vom Frontend genutztes Spaltenmodell – ausschließlich aus DB-Werten
 * abgeleitet (Preset + Definitions). Keine erfundenen Felder.
 */
export interface CatalogColumn {
  /** Stabiler Feldschlüssel in `product_catalog_view`. */
  readonly key: string;
  /** Anzeige-Label aus `product_column_definitions`, fällt auf `key` zurück. */
  readonly label: string;
  /** Sichtbarkeit (default true). */
  readonly visible: boolean;
  /** Anzeige-Reihenfolge (kleinere Werte zuerst). */
  readonly sortOrder: number;
  /** Optionaler Datentyp-Hinweis aus den Definitions (frei, nicht erzwungen). */
  readonly dataType?: string | null;
  /** Optionale fachliche Rolle (z. B. „image", „title") – nur falls DB liefert. */
  readonly role?: string | null;
}

/**
 * Vom Frontend genutzte Filter-Option – ausschließlich aus
 * `product_filter_options_view` abgeleitet.
 */
export interface CatalogFilterGroup {
  /** Feldschlüssel im Produktdatensatz. */
  readonly field: string;
  /** Anzeige-Label (DB-Wert oder `field` als Fallback). */
  readonly label: string;
  /** Mögliche Werte für diesen Filter, wie aus der View geliefert. */
  readonly options: readonly CatalogFilterOption[];
}

export interface CatalogFilterOption {
  readonly value: string;
  readonly label: string;
  /** Anzahl Treffer (aus `product_filter_options_view.anzahl`), wenn vorhanden. */
  readonly count?: number | null;
  /** Reihenfolge innerhalb der Gruppe (aus `sort_order`), wenn vorhanden. */
  readonly sortOrder?: number | null;
  /**
   * Optionale Option, die zwar in der DB-Domäne existiert, aber für die
   * aktuelle Auswahl 0 Treffer hat. Wird in der UI deaktiviert dargestellt
   * (kein Klick, kein Hover). Quelle: facetten-View aus der Produkt-DB
   * (z. B. `api_v1_filter_facets_by_serie.ip_gateway_counts`).
   */
  readonly disabled?: boolean;
  /**
   * Optionaler Farbwert (`hex_code`) aus der Produktdatenbank
   * (`api_v1_product_colors` / `api_v1_product_color_facets`). Nur für die
   * Swatch-Darstellung des Farbfilters; keine Ableitung im Frontend.
   */
  readonly swatchHex?: string | null;

}

/** Aktiver Filterzustand: pro Feld ein einzelner Wert oder leer. */
export type CatalogFilterState = Record<string, string | undefined>;
