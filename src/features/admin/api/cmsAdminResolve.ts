/**
 * Resolver-API für Kurz-IDs (N-…, P-…, B-…, A-…).
 *
 * Liest ausschließlich über die bestehenden, read-only SECURITY-DEFINER-RPCs:
 *   - rpc_admin_resolve_node_no(integer)     → N-…  (cms_navigation_nodes)
 *   - rpc_admin_resolve_page_no(integer)     → P-…  (cms_pages)
 *   - rpc_admin_resolve_section_uid(integer) → B-…  (cms_sections)
 *   - rpc_admin_resolve_asset_no(integer)    → A-…  (cms_assets)
 *
 * Kein Schreibzugriff. Kein direkter Tabellenzugriff. Wird vom Admin-UI
 * ("Gehe zu Kurz-ID"-Eingabe) benutzt, um eine ID schnell aufzulösen und
 * den passenden Knoten/Block/Asset im Editor zu öffnen.
 */

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

type RpcResult = { data: unknown; error: { message: string } | null };

async function callRpc(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const supabase = await getClient();
  const { data, error } = await (
    supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<RpcResult>
  )(fn, args);
  if (error) return { success: false, error: error.message };
  return (data ?? {}) as Record<string, unknown>;
}

export type ShortIdKind = "N" | "P" | "B" | "A";

export interface ParsedShortId {
  kind: ShortIdKind;
  value: number;
  /** Kanonische Schreibweise, z. B. „B-014". */
  formatted: string;
}

/**
 * Parst Eingaben wie „N-5", „n5", „p 012", „B-014", „A12".
 * Liefert null bei ungültiger Eingabe.
 */
export function parseShortId(input: string): ParsedShortId | null {
  if (!input) return null;
  const cleaned = input.trim().toUpperCase().replace(/[\s_]+/g, "");
  const m = cleaned.match(/^([NPBA])-?0*(\d+)$/);
  if (!m) return null;
  const kind = m[1] as ShortIdKind;
  const value = Number(m[2]);
  if (!Number.isFinite(value) || value < 0) return null;
  return { kind, value, formatted: `${kind}-${String(value).padStart(3, "0")}` };
}

export interface ResolveNodeResult {
  success: true;
  kind: "N";
  node_no: number;
  id: string;
  nav_area: string;
  node_key: string;
  page_key: string | null;
  label_de: string | null;
  label_en: string | null;
  is_active: boolean;
}

export interface ResolvePageResult {
  success: true;
  kind: "P";
  page_no: number;
  page_key: string;
  route_path: string | null;
  page_type: string | null;
  status: string | null;
  is_active: boolean;
}

export interface ResolveSectionResult {
  success: true;
  kind: "B";
  section_uid: number;
  id: string;
  page_key: string;
  section_key: string;
  section_type: string | null;
  section_no: number | null;
  sort_order: number | null;
  is_active: boolean;
}

export interface ResolveAssetResult {
  success: true;
  kind: "A";
  asset_no: number;
  id: string;
  page_key: string;
  section_key: string;
  field_key: string | null;
  asset_role: string | null;
  public_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  is_active: boolean;
}

export type ResolveSuccess =
  | ResolveNodeResult
  | ResolvePageResult
  | ResolveSectionResult
  | ResolveAssetResult;

export interface ResolveError {
  success: false;
  kind: ShortIdKind;
  error: string;
  /** Originale Eingabe für Anzeige. */
  input: string;
}

export type ResolveResult = ResolveSuccess | ResolveError;

const RPC_BY_KIND: Record<ShortIdKind, { fn: string; arg: string }> = {
  N: { fn: "rpc_admin_resolve_node_no", arg: "p_node_no" },
  P: { fn: "rpc_admin_resolve_page_no", arg: "p_page_no" },
  B: { fn: "rpc_admin_resolve_section_uid", arg: "p_section_uid" },
  A: { fn: "rpc_admin_resolve_asset_no", arg: "p_asset_no" },
};

// ---------------------------------------------------------------------------
// Auto-Vervollständigung (Suggest)
// ---------------------------------------------------------------------------
// Liefert Vorschläge aus allen vier Räumen (N/P/B/A) für die "Gehe zu Kurz-ID"
// Eingabezeile. Liest ausschließlich über die read-only RPC
// `rpc_admin_search_short_ids(p_query, p_limit)`.

export interface ShortIdSuggestion {
  kind: ShortIdKind;
  num: number;
  /** Kanonische Schreibweise, z. B. „B-014". */
  formatted: string;
  /** Hauptzeile (Knoten-Label, Seiten-Schlüssel, Block-Key, Datei). */
  label: string;
  /** Zweite Zeile mit Kontext (Seite, Bereich, Feld …). */
  sublabel: string;
  page_key: string | null;
  section_key: string | null;
  field_key: string | null;
  node_id: string | null;
}

interface RpcSuggestionRow {
  kind: string;
  num: number;
  formatted: string;
  label: string | null;
  sublabel: string | null;
  page_key: string | null;
  section_key: string | null;
  field_key: string | null;
  node_id: string | null;
}

export async function searchShortIds(
  query: string,
  limit = 8,
): Promise<ShortIdSuggestion[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await getClient();
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: RpcSuggestionRow[] | null; error: { message: string } | null }>
  )("rpc_admin_search_short_ids", { p_query: q, p_limit: limit });
  if (error || !Array.isArray(data)) return [];
  return data
    .filter((r) => r && (r.kind === "N" || r.kind === "P" || r.kind === "B" || r.kind === "A"))
    .map((r) => ({
      kind: r.kind as ShortIdKind,
      num: r.num,
      formatted: r.formatted,
      label: r.label ?? r.formatted,
      sublabel: r.sublabel ?? "",
      page_key: r.page_key,
      section_key: r.section_key,
      field_key: r.field_key,
      node_id: r.node_id,
    }));
}

/** Wandelt einen Vorschlag zurück in eine `ParsedShortId`-Form. */
export function suggestionToParsed(s: ShortIdSuggestion): ParsedShortId {
  return { kind: s.kind, value: s.num, formatted: s.formatted };
}

export async function resolveShortId(parsed: ParsedShortId): Promise<ResolveResult> {
  const cfg = RPC_BY_KIND[parsed.kind];
  const r = await callRpc(cfg.fn, { [cfg.arg]: parsed.value });
  if (!r.success) {
    return {
      success: false,
      kind: parsed.kind,
      input: parsed.formatted,
      error: String(r.error ?? "unbekannter Fehler"),
    };
  }
  return { ...(r as object), kind: parsed.kind } as ResolveSuccess;
}
