/**
 * Datenzugriff für das öffentliche Download-Center.
 *
 * Einzige fachliche Wahrheit ist die Download-Contract-Datenbank
 * (Projekt `ncvxzkwazdemivdolpzc`), gelesen über die Edge Function
 * `download-center` oder — falls konfiguriert — über den Direktpfad
 * (`VITE_DOWNLOAD_SUPABASE_*`).
 *
 * Verwendete Contracts:
 * - Ergebnisliste: `public.api_v1_download_center_public_contract`
 * - Struktur:      `public.api_v1_download_center_structure_contract`
 * - Facetten:      `public.api_v1_download_center_facets_v2(...)`
 *
 * Es gibt hier keine Frontend-Taxonomie: keine Zielgruppen-, Bereichs-,
 * Kategorie- oder Filterlisten, keine Datei-URLs, keine Produktzuordnungen.
 * CMS-Light liefert ausschließlich Beschriftungen und Seitenhülle.
 */

import {
  downloadCenterSupabase,
  isDownloadCenterConfigured,
} from "./client";
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";

export const DOWNLOAD_CENTER_VIEW = "api_v1_download_center_public_contract";
export const DOWNLOAD_CENTER_STRUCTURE_VIEW =
  "api_v1_download_center_structure_contract";
export const DOWNLOAD_CENTER_FACETS_RPC = "api_v1_download_center_facets_v2";

/** Eine Zeile der Ergebnis-Contract-View. */
export interface DownloadCenterRow {
  asset_id: string;
  asset_source: string | null;
  source_asset_id: string | null;
  asset_kind: string | null;
  audience_slug: string | null;
  audience_label: string | null;
  section_slug: string | null;
  section_label: string | null;
  section_intro_title: string | null;
  section_intro_body: string | null;
  group_slug: string | null;
  group_label: string | null;
  group_intro_title: string | null;
  group_intro_body: string | null;
  display_group_slug: string | null;
  display_group_label: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  download_url: string | null;
  file_name: string | null;
  file_ext: string | null;
  file_size: number | null;
  file_available: boolean | null;
  version_label: string | null;
  issue_date: string | null;
  language: string | null;
  product_category_slug: string | null;
  product_category_label: string | null;
  family_or_series_key: string | null;
  family_or_series_label: string | null;
  system_key: string | null;
  system_label: string | null;
  document_type: string | null;
  document_type_label: string | null;
  source_type: string | null;
  source_type_label: string | null;
  curation_scope: string | null;
  curation_scope_label: string | null;
  access_level: string | null;
  requires_login: boolean | null;
  assigned_articles_text: string | null;
  sort_order: number | null;
  is_public: boolean | null;
  is_primary: boolean | null;
  created_at: string | null;
}

/** Eine Zeile der Struktur-Contract-View (Zielgruppe → Bereich). */
export interface DownloadCenterStructureRow {
  audience_slug: string;
  audience_label: string | null;
  audience_sort_order: number | null;
  section_slug: string;
  section_label: string | null;
  section_sort_order: number | null;
  intro_title: string | null;
  intro_body: string | null;
  curation_scope: string | null;
  default_access_level: string | null;
  legacy_expected_file_count: number | null;
  current_file_count: number | null;
  additional_file_count: number | null;
  structure_status: string | null;
}

/** Eine Facettenoption aus `api_v1_download_center_facets_v2`. */
export interface DownloadCenterFacet {
  facet_key: string;
  option_key: string;
  option_label: string | null;
  item_count: number | null;
  sort_order: number | null;
}

/** Aktuelle Filterauswahl (nur Slugs/Keys aus dem Contract). */
export interface DownloadCenterSelection {
  audienceSlug?: string | null;
  sectionSlug?: string | null;
  productCategorySlug?: string | null;
  familyOrSeriesKey?: string | null;
  systemKey?: string | null;
  assetKind?: string | null;
  documentType?: string | null;
  language?: string | null;
  accessLevel?: string | null;
  fileAvailable?: boolean | null;
  /** Suchbegriff (wird serverseitig gegen den Contract gesucht). */
  search?: string | null;
}

const PAGE_SIZE = 1000;

const clean = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t ? t : null;
};

async function invokeDownloadCenter<T>(
  action: "rows" | "facets" | "structure",
  selection: DownloadCenterSelection,
): Promise<T> {
  // Lazy initialisieren: Der automatisch erzeugte CMS-Client wirft in einem
  // veröffentlichten Build ohne eingebettete VITE_* Variablen bereits beim
  // Modul-Import.
  const cmsSupabase = getCmsSupabaseClient();
  const { data, error } = await cmsSupabase.functions.invoke("download-center", {
    body: { action, selection },
  });
  if (error) {
    const details = "context" in error && error.context
      ? await error.context.text()
      : error.message;
    throw new Error(`download_center_function_failed: ${details}`);
  }
  return data as T;
}

/** Struktur (Zielgruppen und ihre Bereiche) aus dem Struktur-Contract. */
export async function fetchDownloadCenterStructure(
  selection: DownloadCenterSelection = {},
): Promise<DownloadCenterStructureRow[]> {
  if (!isDownloadCenterConfigured()) {
    const data = await invokeDownloadCenter<{
      structure?: DownloadCenterStructureRow[];
    }>("structure", selection);
    return data.structure ?? [];
  }

  let q = downloadCenterSupabase
    .from(DOWNLOAD_CENTER_STRUCTURE_VIEW)
    .select("*")
    .limit(2000);
  const audience = clean(selection.audienceSlug);
  if (audience) q = q.eq("audience_slug", audience);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DownloadCenterStructureRow[];
}

/**
 * Ergebnisliste, serverseitig gefiltert (read-only, paginiert).
 *
 * `maxRows` begrenzt die Anzahl geladener und gerenderter Einträge. Ohne
 * Begrenzung kann eine sehr allgemeine Suche mehrere Tausend Einträge auf
 * einmal laden und die Seite blockieren.
 */
export async function fetchDownloadCenterRows(
  selection: DownloadCenterSelection = {},
  maxRows?: number,
): Promise<DownloadCenterRow[]> {
  const cap = maxRows && maxRows > 0 ? maxRows : null;
  if (!isDownloadCenterConfigured()) {
    const data = await invokeDownloadCenter<{ rows?: DownloadCenterRow[] }>(
      "rows",
      selection,
    );
    const all = data.rows ?? [];
    return cap ? all.slice(0, cap) : all;
  }

  const search = clean(selection.search);
  const rows: DownloadCenterRow[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * PAGE_SIZE;
    let q = downloadCenterSupabase.from(DOWNLOAD_CENTER_VIEW).select("*");

    const eqMap: Array<[string, string | null]> = [
      ["audience_slug", clean(selection.audienceSlug)],
      ["section_slug", clean(selection.sectionSlug)],
      ["product_category_slug", clean(selection.productCategorySlug)],
      ["family_or_series_key", clean(selection.familyOrSeriesKey)],
      ["system_key", clean(selection.systemKey)],
      ["asset_kind", clean(selection.assetKind)],
      ["document_type", clean(selection.documentType)],
      ["language", clean(selection.language)],
      ["access_level", clean(selection.accessLevel)],
    ];
    eqMap.forEach(([col, value]) => {
      if (value) q = q.eq(col, value);
    });
    if (typeof selection.fileAvailable === "boolean") {
      q = q.eq("file_available", selection.fileAvailable);
    }
    if (search) {
      // Volltextsuche über die Contract-Spalte `search_text`; mehrere Wörter
      // werden UND-verknüpft.
      search
        .replace(/[,()*]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6)
        .forEach((token) => {
          q = q.ilike("search_text", `%${token}%`);
        });
    }

    const { data, error } = await q
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const batch = (data ?? []) as unknown as DownloadCenterRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    if (cap && rows.length >= cap) break;
    if (page > 20) break; // Sicherheitsnetz gegen Endlosschleifen
  }
  return cap ? rows.slice(0, cap) : rows;
}

/**
 * Kaskadierende Filteroptionen. Optionen ohne Treffer liefert die Datenbank
 * nicht; zusätzlich wird hier auf `item_count > 0` gefiltert.
 */
export async function fetchDownloadCenterFacets(
  selection: DownloadCenterSelection = {},
): Promise<DownloadCenterFacet[]> {
  if (!isDownloadCenterConfigured()) {
    const data = await invokeDownloadCenter<
      { facets?: DownloadCenterFacet[] } | DownloadCenterFacet[]
    >("facets", selection);
    const facets = Array.isArray(data) ? data : (data.facets ?? []);
    return facets.filter((facet) => (facet.item_count ?? 0) > 0);
  }

  const { data, error } = await downloadCenterSupabase.rpc(
    DOWNLOAD_CENTER_FACETS_RPC,
    {
      p_audience_slug: clean(selection.audienceSlug),
      p_section_slug: clean(selection.sectionSlug),
      p_product_category_slug: clean(selection.productCategorySlug),
      p_family_or_series_key: clean(selection.familyOrSeriesKey),
      p_system_key: clean(selection.systemKey),
      p_asset_kind: clean(selection.assetKind),
      p_document_type: clean(selection.documentType),
      p_language: clean(selection.language),
      p_access_level: clean(selection.accessLevel),
      p_query: clean(selection.search),
    },
  );

  if (error) throw error;
  return ((data ?? []) as unknown as DownloadCenterFacet[]).filter(
    (f) => (f.item_count ?? 0) > 0,
  );
}
