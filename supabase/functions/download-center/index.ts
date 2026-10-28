/**
 * Serverseitiger Lesezugriff auf die Download-Contract-Datenbank
 * (Projekt `ncvxzkwazdemivdolpzc`).
 *
 * Verwendete finale Contracts:
 * - Ergebnisliste:  `public.api_v1_download_center_public_contract`
 * - Struktur:       `public.api_v1_download_center_structure_contract`
 * - Facetten:       `public.api_v1_download_center_facets_v2(...)`
 * - QA (Diagnose):  `public.api_v1_download_center_quality_report`
 *
 * Diese Funktion liest ausschließlich (GET/RPC-Read). Es werden keine
 * Produktkatalog-Daten (`tkscpnwbkjmqopnddxle`) und keine CMS-Light-Daten
 * (`uvkubrrljyzfvbvejepl`) berührt.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOWNLOAD_DB_URL = "https://ncvxzkwazdemivdolpzc.supabase.co";
const PUBLIC_VIEW = "api_v1_download_center_public_contract";
const STRUCTURE_VIEW = "api_v1_download_center_structure_contract";
const FACETS_RPC = "api_v1_download_center_facets_v2";
const QUALITY_VIEW = "api_v1_download_center_quality_report";
const PAGE_SIZE = 1000;

interface Selection {
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
  search?: string | null;
  query?: string | null;
}

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function downloadDbRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const key =
    Deno.env.get("DOWNLOAD_SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("PRODUCT_SUPABASE_PUBLISHABLE_KEY");
  if (!key) throw new Error("download_database_not_configured");

  const response = await fetch(`${DOWNLOAD_DB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`download_database_${response.status}: ${details}`);
  }
  return response.json();
}

const searchTerm = (selection: Selection): string | null =>
  clean(selection.search) ?? clean(selection.query);

function addSelectionFilters(params: URLSearchParams, selection: Selection): void {
  const filters: Array<[string, string | null]> = [
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
  filters.forEach(([column, value]) => {
    if (value) params.set(column, `eq.${value}`);
  });
  if (typeof selection.fileAvailable === "boolean") {
    params.set("file_available", `eq.${selection.fileAvailable}`);
  }
  const search = searchTerm(selection);
  if (search) {
    // Volltextsuche über die Contract-Spalte `search_text` (enthält Titel,
    // Dateiname, Bereich und zugeordnete Artikel). Mehrere Wörter werden
    // UND-verknüpft, damit z. B. "PES Pro" auch bei anderer Wortstellung trifft.
    const tokens = search
      .replace(/[,()*]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 0)
      .slice(0, 6);
    if (tokens.length > 0) {
      params.set(
        "and",
        `(${tokens.map((token) => `search_text.ilike.*${token}*`).join(",")})`,
      );
    }
  }
}


const isTimeout = (error: unknown) => String(error).includes("57014");

/**
 * Liest Contract-Zeilen seitenweise. `ordered = false` verzichtet auf die
 * Sortierung in der Datenbank (die bei großen Zielgruppen ins Statement-Timeout
 * läuft) und sortiert stattdessen in der Funktion.
 */
async function readRows(
  selection: Selection,
  columns: string | null,
  ordered = true,
  pageSize = PAGE_SIZE,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  const maxPages = Math.ceil((PAGE_SIZE * 21) / pageSize);
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({
      select: columns ?? "*",
      offset: String(page * pageSize),
      limit: String(pageSize),
    });
    if (ordered) params.set("order", "sort_order.asc.nullslast,title.asc.nullslast");
    addSelectionFilters(params, selection);
    let batch: unknown;
    try {
      batch = await downloadDbRequest(`${PUBLIC_VIEW}?${params.toString()}`);
    } catch (error) {
      if (ordered && isTimeout(error)) {
        console.warn("[download-center] ordered read timed out, retrying unordered");
        return sortRows(
          (await readRows(selection, columns, false, 500)) as Array<Record<string, unknown>>,
        );
      }
      if (!ordered && pageSize > 200 && isTimeout(error)) {
        console.warn("[download-center] read timed out, retrying with smaller pages");
        return readRows(selection, columns, false, 200);
      }
      throw error;
    }
    if (!Array.isArray(batch)) throw new Error("download_database_invalid_rows");
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return ordered ? rows : sortRows(rows as Array<Record<string, unknown>>);
}

function sortRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return [...rows].sort((a, b) => {
    const sa = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const sb = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return String(a.title ?? "").localeCompare(String(b.title ?? ""), "de");
  });
}


async function readStructure(selection: Selection): Promise<unknown> {
  const params = new URLSearchParams({ select: "*" });
  const audience = clean(selection.audienceSlug);
  if (audience) params.set("audience_slug", `eq.${audience}`);
  const section = clean(selection.sectionSlug);
  if (section) params.set("section_slug", `eq.${section}`);
  params.set("limit", "2000");
  return downloadDbRequest(`${STRUCTURE_VIEW}?${params.toString()}`);
}

interface Facet {
  facet_key: string;
  option_key: string;
  option_label: string | null;
  item_count: number;
  sort_order: number | null;
}

/**
 * Facettenspalten der Ergebnis-Contract-View. Nur diese Spalten werden für den
 * Notfallpfad aggregiert — es gibt keine im Code gepflegten Wertelisten.
 */
const FACET_COLUMNS: Array<[string, string, string]> = [
  ["section", "section_slug", "section_label"],
  ["product_category", "product_category_slug", "product_category_label"],
  ["family_or_series", "family_or_series_key", "family_or_series_label"],
  ["system", "system_key", "system_label"],
  ["document_or_source_type", "document_type", "document_type_label"],
  ["asset_kind", "asset_kind", "asset_kind"],
  ["language", "language", "language"],
  ["curation_scope", "curation_scope", "curation_scope_label"],
];

/**
 * Zählt die Facettenoptionen aus denselben Contract-Zeilen, die auch die
 * Ergebnisliste liefert. Wird nur verwendet, wenn `api_v1_download_center_facets_v2`
 * in der Download-Datenbank in das Statement-Timeout läuft (bekannter
 * Performance-Punkt bei großen Zielgruppen). Fachlich bleibt die Datenbank die
 * einzige Wahrheit: gezählt werden ausschließlich vorhandene Contract-Werte,
 * Optionen ohne Treffer entstehen dadurch nicht.
 */
function deriveFacets(rows: Array<Record<string, unknown>>): Facet[] {
  const out: Facet[] = [];
  FACET_COLUMNS.forEach(([facetKey, valueColumn, labelColumn]) => {
    const counter = new Map<string, { label: string | null; ids: Set<string> }>();
    rows.forEach((row) => {
      const value = clean(row[valueColumn]);
      if (!value) return;
      const entry = counter.get(value) ?? {
        label: clean(row[labelColumn]) ?? value,
        ids: new Set<string>(),
      };
      entry.ids.add(String(row.asset_id ?? Math.random()));
      counter.set(value, entry);
    });
    Array.from(counter, ([option_key, entry]) => ({
      facet_key: facetKey,
      option_key,
      option_label: entry.label,
      item_count: entry.ids.size,
      sort_order: null,
    }))
      .sort((a, b) => (a.option_label ?? "").localeCompare(b.option_label ?? "", "de"))
      .forEach((facet) => out.push(facet));
  });
  return out;
}

async function readFacets(selection: Selection): Promise<unknown> {
  // Signatur von api_v1_download_center_facets_v2: p_access_level, p_asset_kind,
  // p_audience_slug, p_document_type, p_family_or_series_key, p_language,
  // p_product_category_slug, p_query, p_section_slug, p_system_key
  try {
    return await downloadDbRequest(`rpc/${FACETS_RPC}`, {
      method: "POST",
      body: JSON.stringify({
        p_audience_slug: clean(selection.audienceSlug),
        p_section_slug: clean(selection.sectionSlug),
        p_product_category_slug: clean(selection.productCategorySlug),
        p_family_or_series_key: clean(selection.familyOrSeriesKey),
        p_system_key: clean(selection.systemKey),
        p_asset_kind: clean(selection.assetKind),
        p_document_type: clean(selection.documentType),
        p_language: clean(selection.language),
        p_access_level: clean(selection.accessLevel),
        p_query: searchTerm(selection),
      }),
    });
  } catch (error) {
    // 57014 = statement timeout der Download-Datenbank
    if (!isTimeout(error)) throw error;
    console.warn("[download-center] facets_v2 timeout, aggregating contract rows");
    // Nur die Facettenspalten lesen (ohne Sortierung) — deutlich günstiger.
    const facetColumns = Array.from(
      new Set(["asset_id", ...FACET_COLUMNS.flatMap(([, value, label]) => [value, label])]),
    ).join(",");
    try {
      const rows = (await readRows(selection, facetColumns, false, 500)) as Array<
        Record<string, unknown>
      >;
      return deriveFacets(rows);
    } catch (fallbackError) {
      if (!isTimeout(fallbackError)) throw fallbackError;
      // Letzte Stufe: keine Facetten statt Fehlerseite.
      console.warn("[download-center] facet fallback timed out, returning empty facets");
      return [];
    }
  }
}




Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const body = await request.json();
    const action = body?.action;
    const selection = (body?.selection ?? {}) as Selection;

    if (action === "rows") {
      const columns = clean(body?.columns);
      if (columns && !/^[a-z0-9_,]+$/i.test(columns)) {
        return jsonResponse({ error: "invalid_columns" }, 400);
      }
      return jsonResponse({ rows: await readRows(selection, columns) });
    }
    if (action === "facets") {
      return jsonResponse({ facets: await readFacets(selection) });
    }
    if (action === "structure") {
      return jsonResponse({ structure: await readStructure(selection) });
    }
    if (action === "quality") {
      return jsonResponse({
        quality: await downloadDbRequest(`${QUALITY_VIEW}?select=*&limit=50`),
      });
    }
    return jsonResponse({ error: "invalid_action" }, 400);
  } catch (error) {
    console.error("[download-center]", error);
    return jsonResponse(
      { error: "download_database_request_failed", details: String(error) },
      502,
    );
  }
});
