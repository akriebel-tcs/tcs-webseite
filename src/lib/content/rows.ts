/**
 * Zeilenformat, auf das beide Inhalte-Quellen (CMS-Light-Tabellen und
 * Storyblok-Stories) abgebildet werden. `useCmsPageContent` baut daraus die
 * Lookup-API (`text`, `asset`, `sections`) fuer alle Renderer.
 */

export type Viewport = "mobile" | "tablet" | "desktop";

export interface FieldRow {
  section_key: string;
  field_key: string;
  locale: string;
  value: string | null;
  /** 'geprueft' | 'maschinell' | 'maschinell_veraltet' — veraltete Maschinenwerte werden nicht ausgespielt. */
  review_status?: string | null;
}

export interface AssetRow {
  section_key: string;
  field_key: string | null;
  public_url: string | null;
  alt_de: string | null;
  alt_en: string | null;
  alt_pl: string | null;
  viewport: Viewport | null;
  /** Alt-Texte je Sprache (fuehrend). */
  cms_asset_translations?: Array<{ locale: string | null; alt_text: string | null }> | null;
}

export interface RawSectionRow {
  id: string;
  section_key: string;
  section_type: string | null;
  sort_order: number;
  parent_section_id: string | null;
  /** Kurz-ID B-<nr> (Legacy), falls bekannt. */
  section_uid?: string | null;
  /** Storyblok `_editable`-Kommentar (nur Vorschau) fuer Klick-zu-Feld. */
  editable?: string | null;
}

export interface PageRows {
  fields: FieldRow[];
  assets: AssetRow[];
  sections: RawSectionRow[];
}
