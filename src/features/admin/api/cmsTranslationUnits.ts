/**
 * Textliste des Arbeitsbereichs „Übersetzungen" (DB-first).
 *
 * Kanonische Gesamtmenge über ALLE redaktionellen Bestände:
 *  - `section_field`   → `cms_section_fields` (Bausteinfelder, inkl. Meta-,
 *                        Footer- und Breadcrumb-Texte, soweit sie dort liegen)
 *  - `page_title`      → `cms_pages.title_de/title_en/title_pl`
 *  - `nav_label`       → `cms_navigation_nodes.label_de/label_en/label_pl`
 *  - `nav_description` → `cms_navigation_nodes.description_*`
 *  - `asset_alt`       → `cms_assets.alt_de/alt_en/alt_pl` (kanonisch;
 *                        `alt_text_*` ist Altbestand und wird NICHT geschrieben)
 *
 * Lesen: `rpc_admin_list_translation_units` (read-only).
 * Schreiben: ausschließlich `rpc_admin_update_translation_unit`. Manuelles
 * Speichern markiert den Zieltext als „geprueft" — automatische Läufe
 * überschreiben ihn danach nie mehr.
 */

export const TRANSLATION_AREAS = [
  "section_field",
  "page_title",
  "nav_label",
  "nav_description",
  "asset_alt",
  "ui_string",
] as const;

export type TranslationArea = (typeof TRANSLATION_AREAS)[number];

export const AREA_LABEL: Record<string, string> = {
  section_field: "Baustein-Text",
  page_title: "Seitentitel",
  nav_label: "Navigation: Beschriftung",
  nav_description: "Navigation: Beschreibung",
  asset_alt: "Bild-Alternativtext",
  ui_string: "Bedienungstext (Oberfläche)",
};

export const AREA_SHORT: Record<string, string> = {
  section_field: "Baustein",
  page_title: "Titel",
  nav_label: "Navi-Label",
  nav_description: "Navi-Text",
  asset_alt: "Bild-Alt",
  ui_string: "Bedienung",
};

export type UnitStatusFilter =
  | "alle"
  | "fehlt"
  | "vorhanden"
  | "maschinell"
  | "veraltet"
  | "geprueft"
  | "offen"
  | "gesperrt";

export const STATUS_FILTER_LABEL: Record<UnitStatusFilter, string> = {
  alle: "Alle",
  fehlt: "Fehlt",
  vorhanden: "Vorhanden",
  veraltet: "Muss aktualisiert werden",
  maschinell: "Detail: maschinell übersetzt",
  geprueft: "Detail: von Hand geprüft",
  offen: "Detail: offen für Lauf",
  gesperrt: "Für diese Sprache noch nicht vorbereitet",
};


export interface TranslationUnit {
  area: TranslationArea | string;
  ref_id: string | null;
  ref_key: string;
  page_key: string;
  section_key: string;
  unit_key: string;
  label: string;
  source_text: string;
  source_hash: string;
  target_value: string | null;
  target_status: string | null;
  whitelisted: boolean;
  is_todo: boolean;
}

export interface TranslationUnitPage {
  target_locale: string;
  total: number;
  total_unfiltered: number;
  counts: Record<string, number>;
  by_area: Record<string, number>;
  limit: number;
  offset: number;
  items: TranslationUnit[];
}

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

type RpcClient = {
  rpc: (
    name: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** Stabile Anzeige-Kennung einer Texteinheit (Redaktion/Prompts). */
export function unitKeyId(unit: TranslationUnit): string {
  if (unit.area === "section_field") {
    return `${unit.page_key} / ${unit.section_key} / ${unit.unit_key}`;
  }
  if (unit.area === "page_title") return `${unit.page_key} / Titel`;
  if (unit.area === "ui_string") return `Bedienung / ${unit.section_key} / ${unit.unit_key}`;
  return `${AREA_SHORT[unit.area] ?? unit.area} / ${unit.ref_key.slice(0, 8)} / ${unit.unit_key}`;
}

export async function listTranslationUnits(args: {
  targetLocale: string;
  areas?: string[] | null;
  status?: UnitStatusFilter;
  pageKey?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<TranslationUnitPage> {
  const supabase = (await getClient()) as unknown as RpcClient;
  const { data, error } = await supabase.rpc("rpc_admin_list_translation_units", {
    p_target_locale: args.targetLocale,
    p_areas: args.areas && args.areas.length > 0 ? args.areas : null,
    p_status: args.status ?? "alle",
    p_page_key: args.pageKey ?? null,
    p_search: args.search ?? null,
    p_limit: args.limit ?? 50,
    p_offset: args.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as Partial<TranslationUnitPage> & { error?: string };
  if (payload.error) throw new Error(payload.error);
  return {
    target_locale: payload.target_locale ?? args.targetLocale,
    total: Number(payload.total ?? 0),
    total_unfiltered: Number(payload.total_unfiltered ?? 0),
    counts: payload.counts ?? {},
    by_area: payload.by_area ?? {},
    limit: Number(payload.limit ?? args.limit ?? 50),
    offset: Number(payload.offset ?? args.offset ?? 0),
    items: Array.isArray(payload.items) ? (payload.items as TranslationUnit[]) : [],
  };
}

export interface SaveUnitResult {
  success: boolean;
  updated: boolean;
  error: string | null;
}

/**
 * Speichert einen Zieltext von Hand. Danach gilt der Wert als „geprueft"
 * (geschützt gegen automatische Läufe). Deutsch ist Quelle und wird über
 * diesen Weg nicht geschrieben.
 */
export async function saveTranslationUnit(args: {
  area: string;
  refId: string | null;
  pageKey: string;
  sectionKey: string;
  unitKey: string;
  locale: string;
  value: string;
}): Promise<SaveUnitResult> {
  if (args.locale === "de") {
    return { success: false, updated: false, error: "locale_not_allowed" };
  }
  try {
    const supabase = (await getClient()) as unknown as RpcClient;
    const { data, error } = await supabase.rpc("rpc_admin_update_translation_unit", {
      p_area: args.area,
      p_ref_id: args.refId,
      p_page_key: args.pageKey,
      p_section_key: args.sectionKey,
      p_unit_key: args.unitKey,
      p_locale: args.locale,
      p_value: args.value,
    });
    if (error) return { success: false, updated: false, error: error.message };
    const payload = (data ?? {}) as { success?: boolean; updated?: boolean; error?: string };
    return {
      success: !!payload.success,
      updated: !!payload.updated,
      error: payload.error ?? null,
    };
  } catch (e) {
    return { success: false, updated: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/** Verständliche Meldung für die Redaktion. */
export function saveUnitErrorHint(code: string | null | undefined): string {
  const raw = (code ?? "").trim();
  if (!raw) return "Speichern fehlgeschlagen.";
  if (raw === "field_not_allowed" || raw === "field_not_editable") {
    return "Nicht gespeichert: Dieser Text ist für diese Sprache noch nicht vorbereitet (deutsche Quelle vorhanden, Zielsprachenfeld intern noch nicht aktiviert).";
  }
  if (raw === "locale_not_allowed") return "Nicht gespeichert: Diese Sprache ist nicht freigegeben.";

  if (raw === "locale_not_supported_for_area") {
    return "Diese Sprache ist für diesen Datenbereich noch nicht vorbereitet.";
  }
  if (raw === "section_no_longer_renderable") {
    return "Nicht gespeichert: Der Baustein wäre danach auf der Website unsichtbar.";
  }
  return `Speichern fehlgeschlagen (${raw}).`;
}

/** CSV-Ausgabe der aktuellen Liste (Semikolon, Excel-freundlich). */
export function unitsToCsv(locale: string, items: TranslationUnit[]): string {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = [
    "bereich",
    "kennung",
    "seite",
    "baustein",
    "feld",
    "deutsch",
    "zielsprache",
    "zieltext",
    "herkunft",
    "freigeschaltet",
  ].join(";");
  const lines = items.map((u) =>
    [
      esc(AREA_LABEL[u.area] ?? u.area),
      esc(unitKeyId(u)),
      esc(u.page_key),
      esc(u.section_key),
      esc(u.unit_key),
      esc(u.source_text),
      esc(locale),
      esc(u.target_value ?? ""),
      esc(u.target_status ?? "fehlt"),
      esc(u.whitelisted ? "ja" : "nein"),
    ].join(";"),
  );
  return [head, ...lines].join("\r\n");
}

/** Eine Sprache aus der Sprachliste der Datenbank (`cms_locales`). */
export interface TargetLocaleOption {
  locale: string;
  label_de: string;
  is_source: boolean;
  is_active: boolean;
}

/**
 * Zielsprachen für den Sprachumschalter im Inhalte-Bereich.
 * Quelle ist ausschließlich `cms_locales` (aktiv, ohne Quellsprache) —
 * keine feste Liste im Code.
 */
export async function readTargetLocales(): Promise<TargetLocaleOption[]> {
  const supabase = (await getClient()) as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: boolean,
        ) => {
          order: (c: string) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };
  const { data, error } = await supabase
    .from("cms_locales")
    .select("locale,label_de,is_source,is_active")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? (data as TargetLocaleOption[]) : [];
  return rows.filter((r) => !r.is_source);
}
