/**
 * Geschützter Gesamt-Export CMS-Light (Datenpaket v3).
 *
 * - Alle Daten kommen ausschließlich aus der Edge Function
 *   `cms-snapshot-export`. Der Browser schickt nur eine Aktion und die
 *   kurzlebige Adminfreigabe (nur im Arbeitsspeicher, siehe `adminAuth.ts`).
 *   Kein Tabellenname, keine URL und kein SQL wird frei gewählt — der Server
 *   entscheidet über die erlaubte Liste.
 * - Bilder werden NICHT in den Browser geladen. Das ZIP enthält nur das
 *   Medieninventar plus einen wiederaufnehmbaren PowerShell-Downloader.
 * - Der Export ist dynamisch (nicht transaktional). Zählerstände und
 *   Aktualisierungsmarker werden vor und nach dem Lesen verglichen und im
 *   Manifest ehrlich ausgewiesen. Eine fehlende oder fehlerhafte Nachzählung
 *   gilt NIE als vollständig.
 * - Ein Abbruch ist sofort endgültig: kein Paket, kein Download.
 */

import JSZip from "jszip";
import { readAdminToken } from "./adminAuth";

export const EXPORT_FUNCTION = "cms-snapshot-export";
export const BUNDLE_VERSION = "v3";
export const MAX_BATCH = 1000;

/** Öffentliche Adresse des eigenen Medienspeichers (kein Geheimnis). */
export const MEDIA_URL_PREFIX =
  "https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/";

export type TableClass = "content" | "config" | "operations" | "cache";

export type TableCount = {
  table: string;
  key: string;
  single_row: boolean;
  classification: TableClass;
  restore_note: string;
  row_count: number | null;
  marker_column: string | null;
  marker_value: string | null;
  error: string | null;
};

export type ExcludedTable = { name: string; reason: string };

export type CountsResult = {
  tables: TableCount[];
  excluded: ExcludedTable[];
  taken_at: string;
};

export type MediaObject = {
  path: string;
  /** null = Speicher liefert keine gültige Größe (nie stillschweigend 0). */
  size: number | null;
  mime_type: string | null;
  etag: string | null;
  updated_at: string | null;
  public_url: string;
};

export type StorageInventory = {
  bucket: string;
  object_count: number;
  total_bytes: number;
  objects: MediaObject[];
  errors: string[];
  truncated: boolean;
  taken_at: string;
};

export type StorageSummary = {
  bucket: string;
  object_count: number;
  total_bytes: number;
  /** Letzte Änderung im Bucket (aus dem SQL-Aggregat). */
  max_updated_at?: string | null;
  /** Objekte im Bucket ohne gültige Größenangabe (nie stillschweigend 0). */
  invalid_size_count?: number;
  errors: string[];
  truncated: boolean;
  taken_at: string;
};


export type ExportProgress = {
  phase: string;
  detail?: string;
  done: number;
  total: number;
};

export class ExportAuthError extends Error {}
/** Abbruch durch die Bedienung — immer endgültig, niemals ein Teilpaket. */
export class ExportAbortError extends Error {
  constructor(message = "Export abgebrochen.") {
    super(message);
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ExportAbortError();
}

function isAbort(e: unknown): boolean {
  if (e instanceof ExportAbortError) return true;
  if (e instanceof DOMException && e.name === "AbortError") return true;
  return e instanceof Error && /abort|abgebrochen/i.test(e.message);
}

/* -------------------------------------------------------------------------- */
/*  Serverdienst                                                              */
/* -------------------------------------------------------------------------- */

async function callExport<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  const token = readAdminToken();
  if (!token) {
    throw new ExportAuthError("Die Freigabe fehlt oder ist abgelaufen. Bitte erneut entsperren.");
  }
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const cms = getCmsSupabaseClient();
  const { data, error } = await cms.functions.invoke(EXPORT_FUNCTION, {
    body: { ...body, admin_token: token },
    signal,
  });
  if (error) {
    if (isAbort(error) || signal?.aborted) throw new ExportAbortError();
    const { readFunctionError } = await import("./cmsTranslationRuns");
    const message = await readFunctionError(error);
    if (/admin_|freigabe|unlock/i.test(message)) throw new ExportAuthError(message);
    throw new Error(message);
  }
  throwIfAborted(signal);
  const payload = data as (T & { error?: string; message?: string }) | null;
  if (payload && typeof payload === "object" && "error" in payload && payload.error) {
    const message = payload.message ?? String(payload.error);
    if (String(payload.error).startsWith("admin_")) throw new ExportAuthError(message);
    throw new Error(message);
  }
  return payload as T;
}

export function fetchCounts(signal?: AbortSignal): Promise<CountsResult> {
  return callExport<CountsResult>({ action: "counts" }, signal);
}

export type InventoryPage = {
  bucket: string;
  objects: MediaObject[];
  returned: number;
  next_after: string | null;
  has_more: boolean;
  errors: string[];
  truncated: boolean;
  taken_at: string;
};

/**
 * Medieninventar per Keyset-Paging (Seiten von höchstens 1000 Objekten). Jede
 * Serveranfrage bleibt kurz; hier werden die Seiten gesammelt. Keine stille
 * Abschneidung: ein hängender oder doppelter Cursor sowie ein erschöpftes
 * Seitenlimit sind Fehler und setzen `truncated`.
 */
export async function fetchStorageInventory(
  signal?: AbortSignal,
  opts: {
    onPage?: (loaded: number) => void;
    maxPages?: number;
    retries?: number;
    call?: (body: Record<string, unknown>, signal?: AbortSignal) => Promise<InventoryPage>;
  } = {},
): Promise<StorageInventory> {
  const call =
    opts.call ?? ((body: Record<string, unknown>, signal2?: AbortSignal) => callExport<InventoryPage>(body, signal2));
  const maxPages = opts.maxPages ?? 5000;
  const retries = opts.retries ?? 2;
  const objects: MediaObject[] = [];
  const errors: string[] = [];
  const seenCursors = new Set<string>();
  let bucket = "cms-assets";
  let takenAt = new Date().toISOString();
  let truncated = false;
  let after: string | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    throwIfAborted(signal);
    let attempt = 0;
    let res: InventoryPage | null = null;
    for (;;) {
      try {
        res = await call({ action: "storage_inventory", after, limit: MAX_BATCH }, signal);
        break;
      } catch (e) {
        if (e instanceof ExportAuthError) throw e;
        if (isAbort(e)) throw new ExportAbortError();
        attempt += 1;
        if (attempt > retries) throw e;
        await sleep(400 * attempt, signal);
      }
    }
    const p = res as InventoryPage;
    if (!p || typeof p !== "object" || !Array.isArray(p.objects) || !Array.isArray(p.errors)) {
      throw new Error("Medieninventar: Antwort des Serverdienstes ist unplausibel.");
    }
    bucket = p.bucket || bucket;
    takenAt = p.taken_at || takenAt;
    objects.push(...p.objects);
    if (p.errors.length > 0) errors.push(...p.errors);
    if (p.truncated) truncated = true;
    opts.onPage?.(objects.length);
    if (!p.has_more) {
      return {
        bucket,
        object_count: objects.length,
        total_bytes: objects.reduce((sum, o) => sum + Number(o.size ?? 0), 0),
        objects,
        errors,
        truncated,
        taken_at: takenAt,
      };
    }
    if (!p.next_after || p.next_after === after || seenCursors.has(p.next_after)) {
      throw new Error("Paging des Medieninventars hängt (Cursor unverändert oder doppelt) — Inventar unvollständig.");
    }
    seenCursors.add(p.next_after);
    after = p.next_after;
  }
  throw new Error("Paging-Limit für das Medieninventar erreicht — Inventar unvollständig.");
}

/**
 * Zweite, schlanke Aufnahme (nur Zahlen) für den Vor/Nach-Vergleich. Nutzt das
 * echte SQL-Aggregat — ohne erneutes Durchlaufen der Objektliste.
 */
export function fetchStorageSummary(signal?: AbortSignal): Promise<StorageSummary> {
  return callExport<StorageSummary>({ action: "storage_inventory", summary_only: true }, signal);
}


export function fetchLiveSchema(signal?: AbortSignal): Promise<{ schema: unknown }> {
  return callExport<{ schema: unknown }>({ action: "schema" }, signal);
}

/* -------------------------------------------------------------------------- */
/*  Plausibilität der Serverantworten                                         */
/* -------------------------------------------------------------------------- */

export function validateCountsPayload(payload: unknown, label = "Zählerstände"): CountsResult {
  const p = payload as CountsResult | null;
  if (!p || typeof p !== "object" || !Array.isArray(p.tables) || p.tables.length === 0) {
    throw new Error(`${label}: Antwort des Serverdienstes ist leer oder unplausibel.`);
  }
  for (const t of p.tables) {
    if (!t || typeof t.table !== "string" || t.table === "" || typeof t.key !== "string" || t.key === "") {
      throw new Error(`${label}: Tabellenangabe unvollständig — Export abgebrochen.`);
    }
  }
  if (!Array.isArray(p.excluded)) {
    throw new Error(`${label}: Ausschlussliste fehlt — Export abgebrochen.`);
  }
  return p;
}

export function validateInventoryPayload(payload: unknown): StorageInventory {
  const p = payload as StorageInventory | null;
  if (!p || typeof p !== "object" || !Array.isArray(p.objects) || !Array.isArray(p.errors)) {
    throw new Error("Medieninventar: Antwort des Serverdienstes ist unplausibel.");
  }
  if (typeof p.object_count !== "number" || p.object_count !== p.objects.length) {
    throw new Error("Medieninventar: Objektzahl passt nicht zur Objektliste.");
  }
  return p;
}

export function validateSchemaPayload(schema: unknown): unknown {
  const s = schema as { objects?: unknown[] } | null;
  if (!s || typeof s !== "object" || !Array.isArray(s.objects) || s.objects.length === 0) {
    throw new Error("Strukturauskunft: Antwort ist leer oder unplausibel.");
  }
  return schema;
}

/**
 * Tabellen, die in der Live-Struktur auftauchen, aber weder exportiert noch
 * ausdrücklich ausgeschlossen sind. Sie werden im Manifest gemeldet.
 */
export function findUncoveredTables(
  schema: unknown,
  exported: string[],
  excluded: string[],
): string[] {
  const objects = (schema as { objects?: Array<{ name?: string; kind?: string }> } | null)?.objects ?? [];
  const known = new Set(exported);
  const skip = new Set(excluded.filter((n) => !n.includes("*") && !n.includes(".")));
  const out = new Set<string>();
  for (const o of objects) {
    const name = String(o?.name ?? "");
    if (!name || o?.kind !== "table") continue;
    if (known.has(name) || skip.has(name)) continue;
    out.add(name);
  }
  return Array.from(out).sort();
}

type RowsPage = {
  table: string;
  key: string;
  rows: Record<string, unknown>[];
  returned: number;
  next_after: string | null;
  has_more: boolean;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ExportAbortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new ExportAbortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Liest eine Tabelle vollständig per Keyset-Paging. Keine stille Abschneidung:
 * ein hängender Cursor oder ein erschöpftes Schleifenlimit ist ein Fehler.
 * Ein Abbruch ist sofort endgültig.
 */
export async function fetchTableRows(
  table: string,
  opts: {
    signal?: AbortSignal;
    onPage?: (loaded: number) => void;
    maxPages?: number;
    retries?: number;
    call?: (body: Record<string, unknown>, signal?: AbortSignal) => Promise<RowsPage>;
  } = {},
): Promise<{ rows: Record<string, unknown>[]; key: string }> {
  const call =
    opts.call ?? ((body: Record<string, unknown>, signal?: AbortSignal) => callExport<RowsPage>(body, signal));
  const maxPages = opts.maxPages ?? 5000;
  const retries = opts.retries ?? 2;
  const rows: Record<string, unknown>[] = [];
  let after: string | null = null;
  let key = "id";
  for (let page = 0; page < maxPages; page += 1) {
    throwIfAborted(opts.signal);
    let attempt = 0;
    let result: RowsPage | null = null;
    for (;;) {
      try {
        result = await call({ action: "rows", table, after, limit: MAX_BATCH }, opts.signal);
        break;
      } catch (e) {
        if (e instanceof ExportAuthError) throw e;
        if (isAbort(e)) throw new ExportAbortError();
        attempt += 1;
        if (attempt > retries) throw e;
        await sleep(400 * attempt, opts.signal);
      }
    }
    const res = result as RowsPage;
    key = res.key ?? key;
    rows.push(...(res.rows ?? []));
    opts.onPage?.(rows.length);
    if (!res.has_more) return { rows, key };
    if (!res.next_after || res.next_after === after) {
      throw new Error(`Paging für ${table} hängt (Cursor unverändert) — Export unvollständig.`);
    }
    after = res.next_after;
  }
  throw new Error(`Paging-Limit für ${table} erreicht — Export unvollständig.`);
}

/* -------------------------------------------------------------------------- */
/*  Prüfungen                                                                 */
/* -------------------------------------------------------------------------- */

export function findDuplicateKeys(rows: Record<string, unknown>[], key: string): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const r of rows) {
    const v = String(r?.[key] ?? "");
    if (seen.has(v)) dup.add(v);
    seen.add(v);
  }
  return Array.from(dup).slice(0, 50);
}

export type TableCheck = {
  table: string;
  expected: number | null;
  exported: number;
  duplicates: string[];
  count_matches: boolean;
  marker_changed: boolean;
  recount_known: boolean;
  severity: "ok" | "warning" | "error";
  note: string;
};

export function checkTable(
  before: TableCount,
  after: TableCount | undefined,
  rows: Record<string, unknown>[],
  key: string,
): TableCheck {
  const duplicates = findDuplicateKeys(rows, key);
  const expected = before.row_count;
  const countMatches = expected === null ? false : expected === rows.length;
  const recountKnown = Boolean(after && !after.error && after.row_count !== null);
  const markerChanged = Boolean(after && !after.error && after.marker_value !== before.marker_value);
  const afterCountDiffers = Boolean(recountKnown && after && after.row_count !== expected);
  let severity: TableCheck["severity"] = "ok";
  const notes: string[] = [];
  const raise = (level: "warning" | "error") => {
    if (level === "error") severity = "error";
    else if (severity === "ok") severity = "warning";
  };

  if (duplicates.length > 0) {
    raise("error");
    notes.push(`Doppelte Schlüsselwerte: ${duplicates.length}`);
  }
  if (!countMatches) {
    if (expected === null) {
      raise("error");
      notes.push("Zählerstand nicht lesbar.");
    } else if (markerChanged || afterCountDiffers) {
      raise("warning");
      notes.push("Datenbank hat sich während des Exports geändert (kein atomarer Snapshot).");
    } else {
      raise("error");
      notes.push(`Erwartet ${expected}, exportiert ${rows.length}.`);
    }
  }
  if (markerChanged) {
    raise("warning");
    notes.push("Aktualisierungsmarker hat sich während des Exports geändert.");
  }
  if (afterCountDiffers) {
    raise("warning");
    notes.push(`Nachzählung weicht ab (${after?.row_count} statt ${expected}).`);
  }
  if (!after) {
    raise("warning");
    notes.push("Nachzählung fehlt — Stand nicht bestätigt.");
  } else if (after.error) {
    raise("warning");
    notes.push(`Nachzählung fehlerhaft: ${after.error}`);
  } else if (after.row_count === null) {
    raise("warning");
    notes.push("Nachzählung nicht lesbar — Stand nicht bestätigt.");
  }

  return {
    table: before.table,
    expected,
    exported: rows.length,
    duplicates,
    count_matches: countMatches,
    marker_changed: markerChanged,
    recount_known: recountKnown,
    severity,
    note: notes.join(" ") || "Zählerstände stimmen überein.",
  };
}

export type FkRelation = {
  relation: string;
  child: string;
  childCols: string[];
  parent: string;
  parentCols: string[];
};

/**
 * Echte Fremdschlüssel im Exportumfang (aus pg_constraint abgelesen, Stand
 * 2026-09-14). Keine erfundenen Beziehungen.
 */
export const FK_RELATIONS: FkRelation[] = [
  { relation: "cms_sections.page_key → cms_pages.page_key", child: "cms_sections", childCols: ["page_key"], parent: "cms_pages", parentCols: ["page_key"] },
  { relation: "cms_sections.parent_section_id → cms_sections.id", child: "cms_sections", childCols: ["parent_section_id"], parent: "cms_sections", parentCols: ["id"] },
  { relation: "cms_section_fields.(page_key,section_key) → cms_sections.(page_key,section_key)", child: "cms_section_fields", childCols: ["page_key", "section_key"], parent: "cms_sections", parentCols: ["page_key", "section_key"] },
  { relation: "cms_navigation_nodes.parent_id → cms_navigation_nodes.id", child: "cms_navigation_nodes", childCols: ["parent_id"], parent: "cms_navigation_nodes", parentCols: ["id"] },
  { relation: "cms_asset_translations.asset_id → cms_assets.id", child: "cms_asset_translations", childCols: ["asset_id"], parent: "cms_assets", parentCols: ["id"] },
  { relation: "cms_asset_translations.locale → cms_locales.locale", child: "cms_asset_translations", childCols: ["locale"], parent: "cms_locales", parentCols: ["locale"] },
  { relation: "cms_navigation_node_translations.node_id → cms_navigation_nodes.id", child: "cms_navigation_node_translations", childCols: ["node_id"], parent: "cms_navigation_nodes", parentCols: ["id"] },
  { relation: "cms_navigation_node_translations.locale → cms_locales.locale", child: "cms_navigation_node_translations", childCols: ["locale"], parent: "cms_locales", parentCols: ["locale"] },
  { relation: "cms_page_translations.page_id → cms_pages.id", child: "cms_page_translations", childCols: ["page_id"], parent: "cms_pages", parentCols: ["id"] },
  { relation: "cms_page_translations.locale → cms_locales.locale", child: "cms_page_translations", childCols: ["locale"], parent: "cms_locales", parentCols: ["locale"] },
  { relation: "cms_ui_string_translations.ui_string_id → cms_ui_strings.id", child: "cms_ui_string_translations", childCols: ["ui_string_id"], parent: "cms_ui_strings", parentCols: ["id"] },
  { relation: "cms_ui_string_translations.locale → cms_locales.locale", child: "cms_ui_string_translations", childCols: ["locale"], parent: "cms_locales", parentCols: ["locale"] },
  { relation: "cms_locale_translation_config.locale → cms_locales.locale", child: "cms_locale_translation_config", childCols: ["locale"], parent: "cms_locales", parentCols: ["locale"] },
];

export type IntegrityFinding = {
  relation: string;
  missing: number;
  examples: string[];
  /** true = Prüfung war nicht möglich (Tabelle fehlt im Paket). */
  unchecked?: boolean;
  reason?: string;
};

/** Fehlende Eltern-Verweise (Vollständigkeitsprüfung ohne DB-Join). */
export function checkParentIntegrity(
  data: Record<string, Record<string, unknown>[]>,
  relations: FkRelation[] = FK_RELATIONS,
): IntegrityFinding[] {
  const out: IntegrityFinding[] = [];
  const compose = (row: Record<string, unknown>, cols: string[]): string | null => {
    const parts: string[] = [];
    for (const c of cols) {
      const v = row?.[c];
      if (v === null || v === undefined || v === "") return null;
      parts.push(String(v));
    }
    return parts.join("\u0001");
  };
  for (const r of relations) {
    const child = data[r.child];
    const parent = data[r.parent];
    if (!child || !parent) {
      out.push({
        relation: r.relation,
        missing: 0,
        examples: [],
        unchecked: true,
        reason: !child ? `${r.child} fehlt im Paket` : `${r.parent} fehlt im Paket`,
      });
      continue;
    }
    const keys = new Set<string>();
    for (const p of parent) {
      const k = compose(p, r.parentCols);
      if (k !== null) keys.add(k);
    }
    const missing: string[] = [];
    for (const c of child) {
      const k = compose(c, r.childCols);
      if (k === null) continue;
      if (!keys.has(k)) missing.push(k.replace(/\u0001/g, " | "));
    }
    if (missing.length > 0) {
      out.push({ relation: r.relation, missing: missing.length, examples: Array.from(new Set(missing)).slice(0, 10) });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Medienpaket (Manifest + PowerShell-Downloader)                            */
/* -------------------------------------------------------------------------- */

const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

/**
 * Macht aus einem Objektpfad einen sicheren, relativen Zielpfad.
 * Gibt `null` zurück, wenn der Pfad ausbrechen könnte oder unter Windows
 * nicht sicher anzulegen ist.
 */
export function sanitizeRelativePath(input: string): string | null {
  const raw = String(input ?? "");
  if (!raw || raw.length > 400) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  if (raw.includes("\\")) return null;
  if (raw.startsWith("/") || /^[a-zA-Z]:/.test(raw)) return null;
  if (/^\/\//.test(raw) || raw.startsWith("~")) return null;
  const parts = raw.split("/");
  const safe: string[] = [];
  for (const p of parts) {
    if (p === "" || p === "." || p === "..") return null;
    if (/[<>:"|?*]/.test(p)) return null;
    if (WINDOWS_DEVICE.test(p)) return null;
    if (/[. ]$/.test(p)) return null;
    safe.push(p);
  }
  const rel = safe.join("/");
  // Interne Protokoll-/Manifestnamen sind reserviert: ein echtes Medienobjekt
  // darf sie niemals überschreiben.
  if (RESERVED_MEDIA_FILES.has(rel.toLowerCase())) return null;
  return rel;
}

/** Dateinamen, die das Hilfspaket selbst im Zielordner benutzt. */
export const RESERVED_MEDIA_FILES = new Set([
  "download-protokoll.json",
  "download-protokoll.json.bak",
  "download-protokoll.json.new",
  "download-protokoll.csv",
  "media-manifest.json",
  "download-medien.ps1",
]);

/**
 * Prüft, ob eine Adresse exakt auf den eigenen, öffentlichen Medienspeicher
 * zeigt (Schema, Host, Bucket-Pfad) und im Pfad keinen — auch kodierten —
 * Ausbruch enthält.
 */
export function isAllowedMediaUrl(url: string, urlPrefix = MEDIA_URL_PREFIX): boolean {
  const raw = String(url ?? "");
  // eslint-disable-next-line no-control-regex
  if (!raw || /[\u0000-\u001f\u007f\s]/.test(raw)) return false;
  if (!raw.startsWith(urlPrefix)) return false;
  let parsed: URL;
  let base: URL;
  try {
    parsed = new URL(raw);
    base = new URL(urlPrefix);
  } catch {
    return false;
  }
  if (parsed.protocol !== base.protocol || parsed.host !== base.host) return false;
  if (parsed.search || parsed.hash || parsed.username || parsed.password) return false;
  if (!parsed.pathname.startsWith(base.pathname)) return false;
  const rest = parsed.pathname.slice(base.pathname.length);
  if (!rest) return false;
  if (rest.includes("//") || rest.startsWith("/")) return false;
  const lower = rest.toLowerCase();
  if (lower.includes("..") || lower.includes("%2e") || lower.includes("%2f") || lower.includes("%5c")) {
    return false;
  }
  return true;
}

const BOM = "\uFEFF";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : JSON.stringify(value);
  s = s.replace(/\r?\n/g, " ⏎ ").replace(/"/g, '""');
  return `"${s}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return (
    BOM +
    headers.map(csvEscape).join(";") +
    "\n" +
    rows.map((r) => r.map(csvEscape).join(";")).join("\n") +
    "\n"
  );
}

export type MediaManifestEntry = {
  path: string;
  target: string;
  url: string;
  size: number;
  mime_type: string | null;
  updated_at: string | null;
  referenced_in_db: boolean;
  skipped_reason: string | null;
};

export function buildMediaManifest(
  objects: MediaObject[],
  assets: Record<string, unknown>[],
  urlPrefix = MEDIA_URL_PREFIX,
): { entries: MediaManifestEntry[]; unsafe: Array<MediaObject & { reason: string }>; duplicateTargets: string[] } {
  const referenced = new Set(
    assets
      .map((a) => (a?.storage_path === null || a?.storage_path === undefined ? "" : String(a.storage_path)))
      .filter((p) => p.length > 0),
  );
  const entries: MediaManifestEntry[] = [];
  const unsafe: Array<MediaObject & { reason: string }> = [];
  const seen = new Map<string, string>();
  const duplicateTargets: string[] = [];
  for (const o of objects) {
    const target = sanitizeRelativePath(o.path);
    if (!target) {
      unsafe.push({ ...o, reason: "unsicherer Pfad" });
      continue;
    }
    const url = String(o.public_url ?? "");
    if (!isAllowedMediaUrl(url, urlPrefix)) {
      unsafe.push({ ...o, reason: "Adresse nicht im eigenen Medienspeicher" });
      continue;
    }
    const size = o.size;
    if (typeof size !== "number" || !Number.isFinite(size) || !Number.isInteger(size) || size < 0) {
      unsafe.push({ ...o, reason: "Groesse fehlt oder ist ungueltig" });
      continue;
    }
    const lower = target.toLowerCase();
    if (seen.has(lower)) {
      duplicateTargets.push(target);
      unsafe.push({ ...o, reason: `Zielpfad doppelt (Groß-/Kleinschreibung): ${seen.get(lower)}` });
      continue;
    }
    seen.set(lower, target);
    entries.push({
      path: o.path,
      target,
      url,
      size,
      mime_type: o.mime_type ?? null,
      updated_at: o.updated_at ?? null,
      referenced_in_db: referenced.has(o.path),
      skipped_reason: null,
    });
  }
  return { entries, unsafe, duplicateTargets };
}

/** Externe Medienquellen (nicht im eigenen Bucket, daher nicht gesichert). */
export function collectExternalMedia(
  assets: Record<string, unknown>[],
  bucket = "cms-assets",
): Array<{ page_key: string; section_key: string; field_key: string; url: string; host: string }> {
  const out: Array<{ page_key: string; section_key: string; field_key: string; url: string; host: string }> = [];
  for (const a of assets) {
    const url = a?.public_url ? String(a.public_url) : "";
    if (!/^https?:\/\//i.test(url)) continue;
    if (url.includes(`/storage/v1/object/public/${bucket}/`)) continue;
    let host = "";
    try {
      host = new URL(url).host;
    } catch {
      host = "unlesbar";
    }
    out.push({
      page_key: String(a?.page_key ?? ""),
      section_key: String(a?.section_key ?? ""),
      field_key: String(a?.field_key ?? ""),
      url,
      host,
    });
  }
  return out;
}

/**
 * PowerShell-Downloader für Windows. Ohne Schlüssel, ohne Token, ohne
 * Löschbefehle. Behandelt das Manifest als nicht vertrauenswürdig: Zielpfade
 * werden erneut geprüft, Adressen müssen exakt auf den eigenen, öffentlichen
 * Medienspeicher zeigen, Weiterleitungen sind verboten. Wiederaufnehmbar über
 * ein strukturiertes Protokoll (Größe UND SHA256).
 */
export function buildPowerShellDownloader(urlPrefix = MEDIA_URL_PREFIX): string {
  return `<#
  Medien-Sicherung CMS-Light (Windows PowerShell 5.1 oder PowerShell 7)

  Laedt ausschliesslich die im Manifest aufgefuehrten, bereits oeffentlichen
  Dateien des eigenen Medienspeichers herunter. Enthaelt keine Schluessel und
  keine Loeschbefehle (ausser der eigenen, selbst angelegten Zwischendatei).

  Wiederaufnehmbar: das Protokoll wird nach JEDER fertigen Datei und nach jedem
  Fehler atomar geschrieben (Schreiben in .new, Umbenennen, .bak als Sicherung).
  Ein Abbruch mit Strg+C verliert deshalb keine bereits geprueften Hashes.

  Aufruf:
    .\\Download-Medien.ps1 -Ziel .\\cms-assets-mirror
#>
[CmdletBinding()]
param(
  [string]$Manifest = "media-manifest.json",
  [string]$Ziel = "cms-assets-mirror",
  [int]$TimeoutSek = 120,
  [int]$Versuche = 3
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Nur dieser exakte Adressanfang ist erlaubt (eigener oeffentlicher Speicher).
$erlaubterPrefix = "${urlPrefix}"

$basis = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$manifestPfad = Join-Path $basis $Manifest
if (-not (Test-Path -LiteralPath $manifestPfad)) {
  Write-Error "Manifest nicht gefunden: $manifestPfad"
  exit 2
}

# Zielordner immer relativ zum Skriptordner, nie absolut aus Parameter.
if ([System.IO.Path]::IsPathRooted($Ziel) -or $Ziel -match '\\.\\.') {
  Write-Error "Zielordner muss ein einfacher Name unterhalb des Skriptordners sein."
  exit 2
}

function Ist-Reparse([string]$pfad) {
  if (-not (Test-Path -LiteralPath $pfad)) { return $false }
  $attr = (Get-Item -LiteralPath $pfad -Force).Attributes
  return (($attr -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
}

# Prueft die GESAMTE Vorfahrenkette (inklusive Zielwurzel) auf Verknuepfungen.
function Ist-KetteSauber([string]$pfad, [string]$wurzel) {
  $aktuell = $pfad
  while ($true) {
    if (Ist-Reparse $aktuell) { return $false }
    if ($aktuell -eq $wurzel) { return $true }
    $eltern = Split-Path -Parent $aktuell
    if ([string]::IsNullOrEmpty($eltern) -or $eltern -eq $aktuell) { return $false }
    $aktuell = $eltern
  }
}

# Prueft VOR jeder Verzeichniserstellung alle bereits vorhandenen Vorfahren
# bis zur Laufwerkswurzel. Fehlende Pfadteile werden dabei nur uebersprungen.
function Sind-ExistierendeVorfahrenSauber([string]$pfad) {
  $aktuell = [System.IO.Path]::GetFullPath($pfad)
  while (-not [string]::IsNullOrEmpty($aktuell)) {
    if (Test-Path -LiteralPath $aktuell) {
      if (Ist-Reparse $aktuell) { return $false }
    }
    $eltern = Split-Path -Parent $aktuell
    if ([string]::IsNullOrEmpty($eltern) -or $eltern -eq $aktuell) { break }
    $aktuell = $eltern
  }
  return $true
}

$zielWurzelPfad = [System.IO.Path]::GetFullPath((Join-Path $basis $Ziel))
if (-not (Sind-ExistierendeVorfahrenSauber $zielWurzelPfad)) {
  Write-Error "Zielpfad oder ein vorhandener Vorfahr ist eine Verknuepfung — Abbruch."
  exit 2
}
if (-not (Test-Path -LiteralPath $zielWurzelPfad)) {
  New-Item -ItemType Directory -Path $zielWurzelPfad | Out-Null
}
$zielWurzel = (Get-Item -LiteralPath $zielWurzelPfad -Force).FullName
if (-not (Sind-ExistierendeVorfahrenSauber $zielWurzel)) {
  Write-Error "Zielpfad oder ein vorhandener Vorfahr ist eine Verknuepfung — Abbruch."
  exit 2
}
$zielWurzelMitTrenner = $zielWurzel
if (-not $zielWurzelMitTrenner.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
  $zielWurzelMitTrenner = $zielWurzelMitTrenner + [System.IO.Path]::DirectorySeparatorChar
}

$protokollJson = Join-Path $zielWurzel "download-protokoll.json"
$protokollNeu  = Join-Path $zielWurzel "download-protokoll.json.new"
$protokollBak  = Join-Path $zielWurzel "download-protokoll.json.bak"
$protokollCsv  = Join-Path $zielWurzel "download-protokoll.csv"
$reservierte = @("download-protokoll.json","download-protokoll.json.new","download-protokoll.json.bak","download-protokoll.csv","media-manifest.json","download-medien.ps1")

foreach ($p in @($protokollJson, $protokollNeu, $protokollBak, $protokollCsv)) {
  if (Ist-Reparse $p) { Write-Error "Protokolldatei ist eine Verknuepfung: $p"; exit 2 }
}

function Lade-Protokoll {
  foreach ($kandidat in @($protokollJson, $protokollBak, $protokollNeu)) {
    if (-not (Test-Path -LiteralPath $kandidat)) { continue }
    if (Ist-Reparse $kandidat) { continue }
    try {
      $roh = Get-Content -LiteralPath $kandidat -Raw -Encoding UTF8
      if ([string]::IsNullOrWhiteSpace($roh)) { continue }
      $alt = $roh | ConvertFrom-Json
      $tabelle = @{}
      foreach ($e in $alt.PSObject.Properties) { $tabelle[$e.Name] = $e.Value }
      if ($kandidat -ne $protokollJson) { Write-Warning "Protokoll aus Sicherung wiederhergestellt: $kandidat" }
      return $tabelle
    } catch {
      Write-Warning "Protokolldatei unlesbar, naechste Sicherung wird versucht: $kandidat"
    }
  }
  return @{}
}

$protokoll = Lade-Protokoll

# Atomares Schreiben: .new -> Sicherung -> Umbenennen. Wird nach JEDER Datei
# und nach jedem Fehler aufgerufen, damit ein Abbruch nichts verliert.
function Schreibe-Protokoll {
  try {
    if (-not (Sind-ExistierendeVorfahrenSauber $protokollNeu) -or
        -not (Sind-ExistierendeVorfahrenSauber $protokollBak) -or
        -not (Sind-ExistierendeVorfahrenSauber $protokollJson)) {
      throw "Protokollpfad oder ein vorhandener Vorfahr ist eine Verknuepfung."
    }
    ($protokoll | ConvertTo-Json -Depth 5) | Set-Content -LiteralPath $protokollNeu -Encoding UTF8
    if (Test-Path -LiteralPath $protokollJson) {
      Copy-Item -LiteralPath $protokollJson -Destination $protokollBak -Force
    }
    Move-Item -LiteralPath $protokollNeu -Destination $protokollJson -Force
  } catch {
    throw "Protokoll konnte nicht geschrieben werden: $($_.Exception.Message)"
  }
}

function Schreibe-ProtokollCsv {
  try {
    if (-not (Sind-ExistierendeVorfahrenSauber $protokollCsv)) {
      throw "CSV-Protokollpfad oder ein vorhandener Vorfahr ist eine Verknuepfung."
    }
    $protokoll.GetEnumerator() |
      ForEach-Object {
        [pscustomobject]@{
          pfad    = $_.Key
          status  = $_.Value.status
          bytes   = $_.Value.bytes
          sha256  = $_.Value.sha256
          url     = $_.Value.url
          meldung = $_.Value.meldung
        }
      } |
      Sort-Object pfad |
      Export-Csv -LiteralPath $protokollCsv -NoTypeInformation -Encoding UTF8
  } catch {
    throw "CSV-Protokoll konnte nicht geschrieben werden: $($_.Exception.Message)"
  }
}

function Merke([string]$pfad, [string]$status, [int64]$bytes, [string]$sha, [string]$url, [string]$meldung) {
  $protokoll[$pfad] = @{ status = $status; bytes = $bytes; sha256 = $sha; url = $url; meldung = $meldung }
  Schreibe-Protokoll
}

function Ist-SichererZielpfad([string]$rel) {
  if ([string]::IsNullOrWhiteSpace($rel)) { return $false }
  if ($rel.Length -gt 400) { return $false }
  if ($rel.Contains("\\") -or $rel.Contains("..") -or $rel.Contains(":")) { return $false }
  if ($rel.StartsWith("/") -or $rel.StartsWith("~")) { return $false }
  foreach ($zeichen in $rel.ToCharArray()) {
    if ([int]$zeichen -lt 32 -or [int]$zeichen -eq 127) { return $false }
  }
  foreach ($teil in $rel.Split("/")) {
    if ([string]::IsNullOrEmpty($teil)) { return $false }
    if ($teil -eq "." -or $teil -eq "..") { return $false }
    if ($teil -match '[<>:"|?*]') { return $false }
    if ($teil -match '^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\\.|$)') { return $false }
    if ($teil -match '[\\. ]$') { return $false }
  }
  if ($reservierte -contains $rel.ToLowerInvariant()) { return $false }
  return $true
}

# Adresse muss exakt auf den eigenen Speicher zeigen, ohne Ausbruch im Pfad.
function Ist-ErlaubteAdresse([string]$url) {
  if ([string]::IsNullOrWhiteSpace($url)) { return $false }
  if (-not $url.StartsWith($erlaubterPrefix, [System.StringComparison]::Ordinal)) { return $false }
  $rest = $url.Substring($erlaubterPrefix.Length)
  if ([string]::IsNullOrEmpty($rest)) { return $false }
  if ($rest.StartsWith("/") -or $rest.Contains("//")) { return $false }
  $klein = $rest.ToLowerInvariant()
  foreach ($muster in @("..", "%2e", "%2f", "%5c", "?", "#", "@")) {
    if ($klein.Contains($muster)) { return $false }
  }
  foreach ($zeichen in $rest.ToCharArray()) {
    if ([int]$zeichen -le 32 -or [int]$zeichen -eq 127) { return $false }
  }
  return $true
}

# Garantiert NEUE Zwischendatei im geprueften Ordner. Vorhandene Dateien oder
# Verknuepfungen werden nie ueberschrieben.
function Neue-Zwischendatei([string]$ordner) {
  for ($i = 0; $i -lt 20; $i++) {
    $name = "tmp-" + [System.Guid]::NewGuid().ToString("N") + ".part"
    $kandidat = Join-Path $ordner $name
    try {
      $strom = [System.IO.File]::Open($kandidat, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
      $strom.Close()
      return $kandidat
    } catch {
      continue
    }
  }
  return $null
}

$rohManifest = $null
try {
  $rohManifest = Get-Content -LiteralPath $manifestPfad -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
  Write-Error "Manifest ist kein gueltiges JSON."
  exit 2
}
$eintraege = @()
if ($rohManifest -and $rohManifest.PSObject.Properties.Name -contains "entries" -and $rohManifest.entries) {
  $eintraege = @($rohManifest.entries)
}
if ($eintraege.Count -eq 0) {
  Write-Error "Manifest enthaelt keine Eintraege — die Sicherung ist UNVOLLSTAENDIG."
  exit 2
}

$inventarProblem = $false
if ($rohManifest.PSObject.Properties.Name -contains "inventory_errors" -and @($rohManifest.inventory_errors).Count -gt 0) { $inventarProblem = $true }
if ($rohManifest.PSObject.Properties.Name -contains "unsafe_paths" -and @($rohManifest.unsafe_paths).Count -gt 0) { $inventarProblem = $true }
if ($rohManifest.PSObject.Properties.Name -contains "inventory_truncated" -and $rohManifest.inventory_truncated) { $inventarProblem = $true }

# --- Windows-Pfadlaenge VOR dem ersten Download pruefen -----------------------
# Windows PowerShell 5.1 kann Pfade ueber MAX_PATH (260) nicht anlegen oder
# umbenennen ("Ein Teil des Pfades konnte nicht gefunden werden"). PowerShell 7
# kann es. Es wird NICHTS an der Registry oder am System geaendert — bei zu
# langen Pfaden bricht das Skript hier ab, bevor eine Datei geladen wird.
$langePfadeMoeglich = ($PSVersionTable.PSVersion.Major -ge 6)
$maxDateipfad = 259   # 260 inklusive Abschlusszeichen
$maxOrdnerpfad = 247

function Ganze-Pfadlaenge([string]$rel) {
  return $zielWurzelMitTrenner.Length + $rel.Replace("/", "\\").Length
}

if (-not $langePfadeMoeglich) {
  $zuLang = @()
  $laengste = 0
  $beispiel = ""
  foreach ($e in $eintraege) {
    $relPruef = [string]$e.target
    if ([string]::IsNullOrWhiteSpace($relPruef)) { continue }
    $laenge = Ganze-Pfadlaenge $relPruef
    $ordnerLaenge = $zielWurzelMitTrenner.Length + ([string](Split-Path -Parent $relPruef.Replace("/", "\\"))).Length
    if ($laenge -gt $maxDateipfad -or $ordnerLaenge -gt $maxOrdnerpfad) {
      $zuLang += $relPruef
      if ($laenge -gt $laengste) { $laengste = $laenge; $beispiel = $relPruef }
    }
  }
  if ($zuLang.Count -gt 0) {
    $ueberschuss = $laengste - $maxDateipfad
    Write-Host ""
    Write-Warning "Abbruch VOR dem ersten Download: $($zuLang.Count) von $($eintraege.Count) Zielpfaden sind fuer Windows PowerShell 5.1 zu lang (Grenze $maxDateipfad Zeichen)."
    Write-Host "Laengster Pfad: $laengste Zeichen"
    Write-Host "Beispiel: $beispiel"
    Write-Host ""
    Write-Host "Zwei Wege — beide ohne Aenderung am System:"
    Write-Host "  1. PowerShell 7 benutzen (kann lange Pfade):"
    Write-Host "     pwsh -File .\\Download-Medien.ps1 -Ziel .\\cms-assets-mirror"
    Write-Host "  2. Kuerzeren Zielpfad benutzen, also das Paket z. B. nach C:\\tcs entpacken"
    Write-Host "     und dort starten: .\\Download-Medien.ps1 -Ziel m"
    Write-Host "     Der Pfad zum Skriptordner muss dafuer um mindestens $ueberschuss Zeichen kuerzer werden."
    Write-Host ""
    Write-Host "Es wurde nichts geladen, nichts geaendert und nichts geloescht."
    exit 2
  }
}

$ok = 0; $skip = 0; $fehler = 0
$gesehen = @{}
$abgebrochen = $true

try {
foreach ($e in $eintraege) {
  $pfad = [string]$e.path
  $rel  = [string]$e.target
  $url  = [string]$e.url

  $sollGroesse = -1
  $groesseGueltig = $false
  if ($e.PSObject.Properties.Name -contains "size" -and $e.size -ne $null) {
    $rohGroesse = $e.size
    if (-not ($rohGroesse -is [bool]) -and -not ($rohGroesse -is [string])) {
      try {
        $dezimalGroesse = [decimal]$rohGroesse
        if ($dezimalGroesse -ge 0 -and
            $dezimalGroesse -eq [decimal]::Truncate($dezimalGroesse) -and
            $dezimalGroesse -le [decimal][int64]::MaxValue) {
          $sollGroesse = [int64]$dezimalGroesse
          $groesseGueltig = $true
        }
      } catch { $groesseGueltig = $false }
    }
  }
  if (-not $groesseGueltig) {
    Merke $pfad "fehler" 0 "" $url "Groesse fehlt oder ist ungueltig"
    $fehler++; continue
  }

  if (-not (Ist-SichererZielpfad $rel)) {
    Merke $pfad "fehler" 0 "" $url "unsicherer oder reservierter Zielpfad"
    $fehler++; continue
  }
  if (-not (Ist-ErlaubteAdresse $url)) {
    Merke $pfad "fehler" 0 "" $url "Adresse nicht erlaubt"
    $fehler++; continue
  }
  $relKlein = $rel.ToLowerInvariant()
  if ($gesehen.ContainsKey($relKlein)) {
    Merke $pfad "fehler" 0 "" $url "Zielpfad doppelt"
    $fehler++; continue
  }
  $gesehen[$relKlein] = $rel

  $vollstaendig = [System.IO.Path]::GetFullPath((Join-Path $zielWurzel $rel))
  if (-not $vollstaendig.StartsWith($zielWurzelMitTrenner, [System.StringComparison]::OrdinalIgnoreCase)) {
    Merke $pfad "fehler" 0 "" $url "Pfad ausserhalb des Zielordners"
    $fehler++; continue
  }

  # Wiederaufnahme: nur wenn Objektpfad UND Adresse UND Groesse UND SHA256
  # aus dem Protokoll zur vorhandenen Datei passen.
  if (Test-Path -LiteralPath $vollstaendig) {
    if (-not (Ist-KetteSauber $vollstaendig $zielWurzel)) {
      Merke $pfad "fehler" 0 "" $url "Zielpfad oder ein Ordner darueber ist eine Verknuepfung"
      $fehler++; continue
    }
    $vorhanden = (Get-Item -LiteralPath $vollstaendig -Force).Length
    $frueher = $null
    if ($protokoll.ContainsKey($pfad)) { $frueher = $protokoll[$pfad] }
    $passt = $false
    if ($frueher -and $frueher.status -eq "ok" -and $frueher.sha256) {
      $frueherUrl = ""
      try { if ($frueher.url) { $frueherUrl = [string]$frueher.url } } catch { $frueherUrl = "" }
      if ($frueherUrl -eq $url -and [int64]$frueher.bytes -eq $vorhanden -and $sollGroesse -eq $vorhanden) {
        $jetzt = (Get-FileHash -LiteralPath $vollstaendig -Algorithm SHA256).Hash
        if ($jetzt -eq $frueher.sha256) { $passt = $true }
      }
    }
    if ($passt) { $skip++; continue }
    Merke $pfad "fehler" $vorhanden "" $url "Datei vorhanden, aber ohne passenden frueheren Nachweis — nicht ueberschrieben"
    $fehler++; continue
  }

  $ordner = Split-Path -Parent $vollstaendig
  if (-not (Sind-ExistierendeVorfahrenSauber $ordner)) {
    Merke $pfad "fehler" 0 "" $url "Zielordner oder ein vorhandener Vorfahr ist eine Verknuepfung"
    $fehler++; continue
  }
  if (-not (Test-Path -LiteralPath $ordner)) { New-Item -ItemType Directory -Path $ordner | Out-Null }
  if (-not (Ist-KetteSauber $ordner $zielWurzel)) {
    Merke $pfad "fehler" 0 "" $url "Zielordner oder ein Ordner darueber ist eine Verknuepfung"
    $fehler++; continue
  }

  $teilweise = Neue-Zwischendatei $ordner
  if (-not $teilweise) {
    Merke $pfad "fehler" 0 "" $url "Zwischendatei konnte nicht angelegt werden"
    $fehler++; continue
  }

  $geladen = $false
  $letzterFehler = ""
  try {
    for ($v = 1; $v -le $Versuche -and -not $geladen; $v++) {
      try {
        Invoke-WebRequest -Uri $url -OutFile $teilweise -UseBasicParsing -MaximumRedirection 0 -TimeoutSec $TimeoutSek
        $geladen = $true
      } catch {
        $letzterFehler = $_.Exception.Message
        Start-Sleep -Seconds ($v * 2)
      }
    }
    if (-not $geladen) {
      Merke $pfad "fehler" 0 "" $url $letzterFehler
      $fehler++; continue
    }

    $bytes = (Get-Item -LiteralPath $teilweise -Force).Length
    if ($bytes -ne $sollGroesse) {
      Merke $pfad "fehler" $bytes "" $url "Groesse weicht vom Manifest ab ($bytes statt $sollGroesse)"
      $fehler++; continue
    }
    $hash = (Get-FileHash -LiteralPath $teilweise -Algorithm SHA256).Hash
    if (Test-Path -LiteralPath $vollstaendig) {
      Merke $pfad "fehler" $bytes "" $url "Zieldatei ist zwischenzeitlich entstanden — nicht ueberschrieben"
      $fehler++; continue
    }
    # Ohne -Force: eine vorhandene Datei oder Verknuepfung wird nie ersetzt.
    Move-Item -LiteralPath $teilweise -Destination $vollstaendig
    $teilweise = $null
    Merke $pfad "ok" $bytes $hash $url ""
    $ok++
  } finally {
    # Nur die eigene, selbst angelegte Zwischendatei wird entfernt.
    if ($teilweise -and (Test-Path -LiteralPath $teilweise) -and -not (Ist-Reparse $teilweise)) {
      Remove-Item -LiteralPath $teilweise -Force -ErrorAction SilentlyContinue
    }
  }
}
$abgebrochen = $false
} finally {
  Schreibe-Protokoll
  Schreibe-ProtokollCsv
  Write-Host "Geladen: $ok, uebersprungen: $skip, Fehler: $fehler"
  Write-Host "Protokoll: $protokollJson"
  if ($abgebrochen) {
    Write-Warning "Abbruch: Der Stand ist im Protokoll gesichert — einfach erneut starten."
  }
}

if ($fehler -gt 0 -or $inventarProblem) {
  Write-Warning "Die Sicherung ist UNVOLLSTAENDIG (Fehler: $fehler, Inventarhinweise: $inventarProblem)."
  exit 2
}
`;
}

/* -------------------------------------------------------------------------- */
/*  ZIP-Bau                                                                   */
/* -------------------------------------------------------------------------- */

export async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type ExportStatus = "complete" | "changed" | "incomplete";

export type FullExportResult = {
  blob: Blob;
  fileName: string;
  status: ExportStatus;
  manifest: Record<string, unknown>;
};

export type StatusInput = {
  errors: Record<string, string>;
  checks: TableCheck[];
  integrity: IntegrityFinding[];
  inventory: StorageInventory | null;
  unsafeCount: number;
  duplicateTargets: string[];
  uncoveredTables: string[];
  mediaRecountMatches: boolean | null;
  mediaRecountErrors: string[];
  mediaRecountTruncated: boolean;
  missingTables: string[];
  /** Fehler der Vorzählung (nur Medienpaket liest sie). */
  mediaBeforeErrors?: string[];
  /** Abschneidung der Vorzählung. */
  mediaBeforeTruncated?: boolean;
  /** Vor-/Nachvergleich der Mediensumme (null = nicht beurteilbar). */
  mediaSummaryMatches?: boolean | null;
};

/** Ein Paket ist nur „vollstaendig", wenn nichts unklar geblieben ist. */
export function computeStatus(input: StatusInput): { status: ExportStatus; reasons: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  for (const [k, v] of Object.entries(input.errors)) hard.push(`${k}: ${v}`);
  if (input.missingTables.length > 0) hard.push(`Tabellen nicht gelesen: ${input.missingTables.join(", ")}`);
  for (const c of input.checks) {
    if (c.severity === "error") hard.push(`${c.table}: ${c.note}`);
    else if (c.severity === "warning") soft.push(`${c.table}: ${c.note}`);
  }
  for (const i of input.integrity) {
    if (i.unchecked) soft.push(`${i.relation}: nicht geprüft (${i.reason})`);
    else hard.push(`${i.relation}: ${i.missing} fehlende Eltern`);
  }
  if (!input.inventory) hard.push("Medieninventar fehlt.");
  else {
    if (input.inventory.errors.length > 0) hard.push(`Medieninventar-Fehler: ${input.inventory.errors.length}`);
    if (input.inventory.truncated) hard.push("Medieninventar abgeschnitten.");
  }
  if (input.unsafeCount > 0) hard.push(`Unsichere Medienpfade: ${input.unsafeCount}`);
  if (input.duplicateTargets.length > 0) hard.push(`Doppelte Medien-Zielpfade: ${input.duplicateTargets.length}`);
  if (input.uncoveredTables.length > 0) {
    soft.push(`Nicht abgedeckte cms-Tabellen: ${input.uncoveredTables.join(", ")}`);
  }
  if (input.mediaRecountMatches === null) soft.push("Medieninventar: Nachzählung unklar.");
  else if (input.mediaRecountMatches === false) soft.push("Medieninventar hat sich während des Exports geändert.");
  if (input.mediaRecountErrors.length > 0) hard.push(`Medien-Nachzählungsfehler: ${input.mediaRecountErrors.length}`);
  if (input.mediaRecountTruncated) hard.push("Medien-Nachzählung abgeschnitten.");
  if ((input.mediaBeforeErrors ?? []).length > 0) {
    hard.push(`Medien-Vorzählungsfehler: ${(input.mediaBeforeErrors ?? []).length}`);
  }
  if (input.mediaBeforeTruncated === true) hard.push("Medien-Vorzählung abgeschnitten.");
  if (input.mediaSummaryMatches === false) {
    soft.push("Medienspeicher hat sich zwischen Vor- und Nachzählung geändert.");
  }

  if (hard.length > 0) return { status: "incomplete", reasons: [...hard, ...soft] };
  if (soft.length > 0) return { status: "changed", reasons: soft };
  return { status: "complete", reasons: [] };
}

const STATUS_LABEL: Record<ExportStatus, string> = {
  complete: "vollstaendig",
  changed: "VOLLSTAENDIG GELESEN, ABER GEAENDERT/MIT HINWEISEN",
  incomplete: "UNVOLLSTAENDIG",
};

const STATUS_SUFFIX: Record<ExportStatus, string> = {
  complete: "",
  changed: "-MIT-HINWEISEN",
  incomplete: "-UNVOLLSTAENDIG",
};

const README = (status: string, stamp: string) => `CMS-Light Gesamt-Export ${BUNDLE_VERSION}
=======================================

Erstellt: ${stamp}
Status:   ${status}

Was das ist
-----------
Ein umfassender LOGISCHER Export der CMS-Light-Inhalte, Sprachen, Navigation,
Medienzuordnungen, Whitelists und Konfigurationen — inklusive nicht
veroeffentlichter und inaktiver Zeilen.

Was das NICHT ist
-----------------
- KEIN pg_dump und kein physisches Datenbank-Backup.
- KEIN atomarer Snapshot: die Datenbank kann sich waehrend des Exports
  aendern. Zaehlerstaende und Aktualisierungsmarker werden vor und nach dem
  Lesen verglichen (siehe manifest.json -> checks). Eine fehlende oder
  fehlerhafte Nachzaehlung wird NIE als vollstaendig gemeldet.
- KEINE geprüfte Wiederherstellung. Es gibt keine Restore-Abnahme.
- KEINE Bilddateien im Paket. Medien werden ueber media/Download-Medien.ps1
  separat und wiederaufnehmbar gesichert.
- KEINE Zugangsdaten, keine Schluessel, keine Konten (siehe Ausschlussliste).

Statuswerte
-----------
- vollstaendig            alle Pruefungen ohne Befund
- MIT-HINWEISEN           gelesen, aber Aenderungen/unklare Nachzaehlung
- UNVOLLSTAENDIG          Fehler, fehlende Eltern oder Medienprobleme

Inhalt
------
- tables/*.json          Volltabellen (JSON), Klassifikation im Manifest
- csv/*.csv              Excel-freundliche Uebersichten
- schema/live-schema.json Aktuelle Struktur aus der laufenden Datenbank
- media/                 Objektinventar, Manifest, PowerShell-Downloader
- contract/              Section-Typen-Vertrag, Klassifikation
- migrations/*.sql       Migrationsdateien aus dem Build (Historie, kein Live-DDL)
- manifest.json          Umfang, Counts, Pruefungen, SHA256 je Datei
- RESTORE_LIMITS.md      Grenzen und Reihenfolge beim Zurueckspielen
`;

const RESTORE_LIMITS = `# Grenzen beim Zurueckspielen

## Wichtig
- Betriebs-, Warteschlangen- und Zwischenspeicher-Tabellen (Klassifikation
  \`operations\` / \`cache\`) duerfen beim Restore NIEMALS automatisch aktiviert
  oder abgearbeitet werden. Insbesondere:
  \`cms_translation_autopilot\`, \`cms_translation_runs\`,
  \`cms_translation_jobs\`, \`cms_translation_coverage_cache\`,
  \`cms_translation_coverage_locale_cache\`.
  Zwischenspeicher-Tabellen am besten leer lassen.
- Reihenfolge: cms_locales -> cms_pages -> cms_sections -> cms_section_fields
  -> cms_assets (+ Uebersetzungen) -> cms_navigation_nodes (+ Uebersetzungen)
  -> cms_ui_strings (+ Uebersetzungen) -> cms_admin_editable_fields.
- Schreiben nur ueber die vorgesehenen \`rpc_admin_*\`-Wege oder eine
  kontrollierte Serverroutine — nicht aus dem Frontend.

## Nicht enthalten (bewusst)
- Anbieter-Zugangsdaten und deren Protokoll, Tresor/Geheimnisse,
  Auth-Konten/Passwoerter, Rollenzuordnungen.
- Bilddateien (separat ueber das Medienpaket).
- Produktdatenbank (fremdes Projekt, nur lesend genutzt).

## Keine Abnahme
Eine Wiederherstellung wurde NICHT getestet. Das Paket ist ein Sicherungs-
und Uebergabestand, keine erprobte Restore-Prozedur.
`;

export async function buildFullExportZip(opts: {
  signal?: AbortSignal;
  onProgress?: (p: ExportProgress) => void;
} = {}): Promise<FullExportResult> {
  const report = (phase: string, done: number, total: number, detail?: string) =>
    opts.onProgress?.({ phase, done, total, detail });
  const signal = opts.signal;

  const generatedAt = new Date().toISOString();
  const errors: Record<string, string> = {};
  const zip = new JSZip();

  throwIfAborted(signal);
  report("Zählerstände lesen", 0, 1);
  const before = validateCountsPayload(await fetchCounts(signal), "Zählerstände (vorher)");
  const total = before.tables.length + 5;
  let done = 1;

  const data: Record<string, Record<string, unknown>[]> = {};
  const keys: Record<string, string> = {};
  const tablesFolder = zip.folder("tables");

  for (const t of before.tables) {
    throwIfAborted(signal);
    report("Tabelle lesen", done, total, t.table);
    if (t.error) {
      errors[t.table] = t.error;
      done += 1;
      continue;
    }
    try {
      const { rows, key } = await fetchTableRows(t.table, {
        signal,
        onPage: (loaded) => report("Tabelle lesen", done, total, `${t.table} (${loaded})`),
      });
      data[t.table] = rows;
      keys[t.table] = key;
      tablesFolder?.file(`${t.table}.json`, JSON.stringify(rows, null, 2));
    } catch (e) {
      if (e instanceof ExportAuthError) throw e;
      if (isAbort(e)) throw new ExportAbortError();
      errors[t.table] = e instanceof Error ? e.message : "unbekannt";
    }
    done += 1;
  }

  throwIfAborted(signal);
  report("Struktur lesen", done, total);
  let liveSchema: unknown = null;
  try {
    liveSchema = validateSchemaPayload((await fetchLiveSchema(signal)).schema);
    zip.folder("schema")?.file("live-schema.json", JSON.stringify(liveSchema, null, 2));
  } catch (e) {
    if (e instanceof ExportAuthError) throw e;
    if (isAbort(e)) throw new ExportAbortError();
    errors["schema"] = e instanceof Error ? e.message : "unbekannt";
  }
  done += 1;

  throwIfAborted(signal);
  report("Medieninventar lesen", done, total);
  let inventory: StorageInventory | null = null;
  try {
    inventory = validateInventoryPayload(await fetchStorageInventory(signal));
  } catch (e) {
    if (e instanceof ExportAuthError) throw e;
    if (isAbort(e)) throw new ExportAbortError();
    errors["storage_inventory"] = e instanceof Error ? e.message : "unbekannt";
  }
  done += 1;

  throwIfAborted(signal);
  report("Medieninventar erneut prüfen", done, total);
  let mediaAfter: StorageSummary | null = null;
  try {
    mediaAfter = await fetchStorageSummary(signal);
    if (mediaAfter.errors.length > 0) {
      errors["storage_recount"] = `Nachzählung meldet ${mediaAfter.errors.length} Fehler.`;
    }
    if (mediaAfter.truncated) {
      errors["storage_recount_truncated"] = "Nachzählung des Medieninventars wurde abgeschnitten.";
    }
  } catch (e) {
    if (e instanceof ExportAuthError) throw e;
    if (isAbort(e)) throw new ExportAbortError();
    errors["storage_recount"] = e instanceof Error ? e.message : "unbekannt";
    mediaAfter = null;
  }
  done += 1;

  throwIfAborted(signal);
  report("Zählerstände erneut prüfen", done, total);
  let after: CountsResult | null = null;
  try {
    after = validateCountsPayload(await fetchCounts(signal), "Zählerstände (nachher)");
  } catch (e) {
    if (e instanceof ExportAuthError) throw e;
    if (isAbort(e)) throw new ExportAbortError();
    errors["counts_after"] = e instanceof Error ? e.message : "unbekannt";
  }

  // Prüfungen
  const afterMap = new Map((after?.tables ?? []).map((t) => [t.table, t]));
  const checks: TableCheck[] = before.tables
    .filter((t) => data[t.table] !== undefined)
    .map((t) => checkTable(t, afterMap.get(t.table), data[t.table], keys[t.table] ?? t.key));
  const missingTables = before.tables.filter((t) => data[t.table] === undefined).map((t) => t.table);
  const integrity = checkParentIntegrity(data);
  const uncoveredTables = liveSchema
    ? findUncoveredTables(
        liveSchema,
        before.tables.map((t) => t.table),
        before.excluded.map((e) => e.name),
      )
    : [];

  // Medienpaket
  const assets = data["cms_assets"] ?? [];
  const media = writeMediaFolder(zip, { inventory, assets, mediaAfter });
  const { entries, unsafe, duplicateTargets, external, recountMatches: mediaRecountMatches } = media;


  // CSV-Übersichten (aus dem vorhandenen Snapshot-Bau)
  try {
    const { buildCsvFiles } = await import("./cmsSnapshotExport");
    const csvFolder = zip.folder("csv");
    const csvFiles = buildCsvFiles({
      pages: data["cms_pages"] ?? [],
      sections: data["cms_sections"] ?? [],
      fields: data["cms_section_fields"] ?? [],
      assets,
      nav: data["cms_navigation_nodes"] ?? [],
    });
    for (const [name, content] of Object.entries(csvFiles)) csvFolder?.file(name, content);
  } catch (e) {
    errors["csv"] = e instanceof Error ? e.message : "unbekannt";
  }

  // Contract + Migrationen (Historie)
  try {
    const [{ SECTION_TYPE_CONTRACTS }, snap] = await Promise.all([
      import("@/features/cms/contract/sectionTypes"),
      import("./cmsSnapshotExport"),
    ]);
    zip.folder("contract")?.file("sectionTypes.json", JSON.stringify(SECTION_TYPE_CONTRACTS, null, 2));
    const migFolder = zip.folder("migrations");
    for (const m of snap.loadMigrationFiles()) migFolder?.file(m.name, m.content);
    migFolder?.file(
      "LIESMICH.md",
      "Diese Dateien sind Migrations-HISTORIE aus dem Build. Der aktuelle Live-Stand\nder Struktur steht in `schema/live-schema.json`.\n",
    );
  } catch (e) {
    errors["contract"] = e instanceof Error ? e.message : "unbekannt";
  }

  const { status, reasons } = computeStatus({
    errors,
    checks,
    integrity,
    inventory,
    unsafeCount: unsafe.length,
    duplicateTargets,
    uncoveredTables,
    mediaRecountMatches,
    mediaRecountErrors: mediaAfter?.errors ?? [],
    mediaRecountTruncated: mediaAfter?.truncated ?? false,
    missingTables,
  });

  throwIfAborted(signal);

  // Manifest v3 inkl. SHA256 je Datei
  const files: Array<{ path: string; bytes: number; sha256: string }> = [];
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  for (const name of names) {
    throwIfAborted(signal);
    const buf = await zip.files[name].async("arraybuffer");
    files.push({ path: name, bytes: buf.byteLength, sha256: await sha256Hex(buf) });
  }

  const manifest = {
    bundle: "CMS-Light Gesamt-Export",
    bundle_version: BUNDLE_VERSION,
    status,
    status_reasons: reasons,
    generated_at: generatedAt,
    finished_at: new Date().toISOString(),
    export_kind: "logischer Export ueber geschuetzte Edge Function (service_role, serverseitig)",
    atomic: false,
    atomic_note:
      "Nicht transaktional. Zaehlerstaende und Aktualisierungsmarker wurden vor und nach dem Lesen verglichen.",
    is_pg_dump: false,
    restore_verified: false,
    includes_unpublished_rows: true,
    counts_before: before.tables,
    counts_after: after?.tables ?? null,
    checks,
    tables_not_read: missingTables,
    integrity_missing_parents: integrity.filter((i) => !i.unchecked),
    integrity_unchecked: integrity.filter((i) => i.unchecked),
    integrity_relations_checked: FK_RELATIONS.map((r) => r.relation),
    uncovered_tables: uncoveredTables,
    uncovered_tables_note:
      "cms-Tabellen der laufenden Datenbank, die weder in der Exportliste noch in der Ausschlussliste stehen.",
    excluded_tables: before.excluded,
    media: {
      bucket: inventory?.bucket ?? null,
      object_count: inventory?.object_count ?? 0,
      total_bytes: inventory?.total_bytes ?? 0,
      inventory_truncated: inventory?.truncated ?? true,
      unsafe_paths: unsafe.map((u) => ({ path: u.path, reason: u.reason })),
      duplicate_targets: duplicateTargets,
      recount: mediaAfter
        ? {
            object_count: mediaAfter.object_count,
            total_bytes: mediaAfter.total_bytes,
            matches: mediaRecountMatches,
            errors: mediaAfter.errors,
            truncated: mediaAfter.truncated,
          }
        : null,
      recount_note:
        mediaAfter === null
          ? "Nachzaehlung des Medieninventars war nicht moeglich — Stand unklar."
          : "Objektzahl und Gesamtgroesse wurden nach dem Lesen erneut erhoben.",
      external_references: external.length,
      external_secured: false,
      binaries_in_bundle: false,
    },
    errors,
    files,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("README.txt", README(STATUS_LABEL[status], generatedAt));
  zip.file("RESTORE_LIMITS.md", RESTORE_LIMITS);

  throwIfAborted(signal);
  report("Paket schreiben", total, total);
  const blob = await zip.generateAsync({ type: "blob" });
  throwIfAborted(signal);
  const stamp = generatedAt.replace(/[:.]/g, "-");
  return {
    blob,
    fileName: `cms-light-full-export-${BUNDLE_VERSION}-${stamp}${STATUS_SUFFIX[status]}.zip`,
    status,
    manifest,
  };
}

/* -------------------------------------------------------------------------- */
/*  Medienordner (gemeinsam für Datenpaket und Medienpaket)                    */
/* -------------------------------------------------------------------------- */

export type MediaFolderParts = {
  entries: MediaManifestEntry[];
  unsafe: Array<MediaObject & { reason: string }>;
  duplicateTargets: string[];
  external: ReturnType<typeof collectExternalMedia>;
  recountMatches: boolean | null;
  /** Vor-/Nachvergleich der Mediensumme (null = nicht beurteilbar). */
  summaryMatches: boolean | null;
};

/**
 * Schreibt Inventar, Manifest, CSVs, Downloader und Kurzanleitung in den Ordner
 * `media/`. Wird vom Gesamt-Export UND vom eigenständigen Medienpaket benutzt,
 * damit es nur eine Wahrheit für das Medienmanifest gibt.
 */
export function writeMediaFolder(
  zip: JSZip,
  opts: {
    inventory: StorageInventory | null;
    assets: Record<string, unknown>[];
    mediaAfter: StorageSummary | null;
    /** Optionale Vorzählung (Medienpaket liest sie vor dem Inventar). */
    mediaBefore?: StorageSummary | null;
    folderName?: string;
  },
): MediaFolderParts {
  const { inventory, assets, mediaAfter, mediaBefore = null } = opts;
  const folder = zip.folder(opts.folderName ?? "media");
  const { entries, unsafe, duplicateTargets } = buildMediaManifest(inventory?.objects ?? [], assets);
  const external = collectExternalMedia(assets, inventory?.bucket ?? "cms-assets");
  // Letzte Änderung im Inventar selbst — dient dem Vergleich mit der Nachzählung,
  // auch wenn keine Vorzählung vorliegt (Gesamt-Export).
  const inventoryMaxUpdated = (inventory?.objects ?? [])
    .map((o) => (o.updated_at ? String(o.updated_at) : ""))
    .filter((v) => v.length > 0)
    .reduce((a, b) => (a > b ? a : b), "");
  const zeitVergleich = (a?: string | null, b?: string | null): boolean | null => {
    if (!a || !b) return null;
    return new Date(a).getTime() === new Date(b).getTime();
  };
  const maxUpdatedMatches = zeitVergleich(
    inventoryMaxUpdated.length > 0 ? inventoryMaxUpdated : null,
    mediaAfter?.max_updated_at ?? null,
  );
  const recountMatches =
    inventory && mediaAfter
      ? mediaAfter.object_count === inventory.object_count &&
        mediaAfter.total_bytes === inventory.total_bytes &&
        maxUpdatedMatches !== false
      : null;
  // Vorzählung gegen Nachzählung: Anzahl, Bytes UND letzte Änderung.
  const summaryMatches =
    mediaBefore && mediaAfter
      ? mediaBefore.object_count === mediaAfter.object_count &&
        mediaBefore.total_bytes === mediaAfter.total_bytes &&
        zeitVergleich(mediaBefore.max_updated_at ?? null, mediaAfter.max_updated_at ?? null) !== false
      : null;
  const recount = mediaAfter
    ? {
        object_count: mediaAfter.object_count,
        total_bytes: mediaAfter.total_bytes,
        max_updated_at: mediaAfter.max_updated_at ?? null,
        invalid_size_count: mediaAfter.invalid_size_count ?? null,
        matches: recountMatches,
        max_updated_at_matches: maxUpdatedMatches,
        errors: mediaAfter.errors,
        truncated: mediaAfter.truncated,
      }
    : null;
  const summaryBefore = mediaBefore
    ? {
        object_count: mediaBefore.object_count,
        total_bytes: mediaBefore.total_bytes,
        max_updated_at: mediaBefore.max_updated_at ?? null,
        invalid_size_count: mediaBefore.invalid_size_count ?? null,
        errors: mediaBefore.errors,
        truncated: mediaBefore.truncated,
      }
    : null;

  folder?.file(
    "media-manifest.json",
    JSON.stringify(
      {
        bucket: inventory?.bucket ?? "cms-assets",
        url_prefix: MEDIA_URL_PREFIX,
        taken_at: inventory?.taken_at ?? null,
        object_count: inventory?.object_count ?? 0,
        total_bytes: inventory?.total_bytes ?? 0,
        inventory_truncated: inventory?.truncated ?? true,
        unsafe_paths: unsafe.map((u) => ({ path: u.path, reason: u.reason })),
        duplicate_targets: duplicateTargets,
        inventory_errors: inventory?.errors ?? ["Inventar nicht gelesen"],
        inventory_max_updated_at: inventoryMaxUpdated.length > 0 ? inventoryMaxUpdated : null,
        summary_before: summaryBefore,
        summary_matches: summaryMatches,
        recount,
        entries,
      },
      null,
      2,
    ),
  );
  folder?.file(
    "media-objekte.csv",
    toCsv(
      ["pfad", "zielpfad", "bytes", "mime", "aktualisiert", "in_db_referenziert", "url"],
      entries.map((e) => [e.path, e.target, e.size, e.mime_type ?? "", e.updated_at ?? "", e.referenced_in_db, e.url]),
    ),
  );
  folder?.file(
    "externe-medien.csv",
    toCsv(
      ["page_key", "section_key", "field_key", "host", "url", "gesichert"],
      external.map((e) => [e.page_key, e.section_key, e.field_key, e.host, e.url, "NEIN"]),
    ),
  );
  folder?.file("Download-Medien.ps1", buildPowerShellDownloader());
  folder?.file(
    "LIESMICH.md",
    `# Medien sichern (Windows)\n\n1. Diesen Ordner entpacken — am besten kurz, z. B. \`C:\\tcs\`.\n2. **PowerShell 7** im Ordner öffnen (\`pwsh\`).\n3. \`.\\Download-Medien.ps1 -Ziel .\\cms-assets-mirror\`\n\n**Lange Dateinamen:** Einige Bildnamen sind sehr lang. Windows PowerShell 5.1\nkann Pfade über 260 Zeichen nicht anlegen; PowerShell 7 kann es. Das Skript\nprüft alle Zielpfade VOR dem ersten Download und bricht mit einem Hinweis ab,\nwenn sie in 5.1 zu lang wären — es ändert nichts am System.\n\nDer Lauf ist wiederaufnehmbar: bereits geladene Dateien werden nur\nübersprungen, wenn Größe UND SHA256 im Protokoll nachweisbar passen.\nDas Protokoll liegt als \`download-protokoll.json\` und \`download-protokoll.csv\`\nim Zielordner. Fremde vorhandene Dateien werden nie überschrieben.\nHeruntergeladen wird ausschließlich vom eigenen, öffentlichen Medienspeicher;\nWeiterleitungen sind verboten.\n\nInsgesamt ${entries.length} Objekte, ${(inventory?.total_bytes ?? 0).toLocaleString("de-DE")} Bytes.\nExterne Medienquellen (${external.length}) stehen in \`externe-medien.csv\` und\nsind mit diesem Paket NICHT gesichert.\n`,
  );

  return { entries, unsafe, duplicateTargets, external, recountMatches, summaryMatches };
}

/* -------------------------------------------------------------------------- */
/*  Nur-Medienpaket (Ergänzung zu einem bereits geladenen Datenpaket)          */
/* -------------------------------------------------------------------------- */

const MEDIA_ONLY_README = (status: string, stamp: string) => `CMS-Light Medienpaket ${BUNDLE_VERSION}
=====================================

Erstellt: ${stamp}
Status:   ${status}

Was das ist
-----------
Die ERGAENZUNG zu einem bereits heruntergeladenen Datenpaket: vollstaendiges
Objektinventar des eigenen Medienspeichers (Bucket cms-assets), Vor/Nach-
Summenvergleich, SHA256 je Paketdatei, der wiederaufnehmbare Windows-Downloader
und die Liste externer Medienquellen.

Was das NICHT ist
-----------------
- KEINE Bilddateien im Paket (die laedt media/Download-Medien.ps1 herunter).
- KEINE Tabellen, keine Struktur, kein Ersatz fuer das Datenpaket.
- KEINE Zugangsdaten, keine Schluessel, keine Konten.
- KEIN atomarer Snapshot: der Speicher kann sich waehrend des Lesens aendern;
  darum werden Anzahl und Gesamtgroesse vor und nach dem Lesen verglichen.

Zusammenspiel
-------------
Ein bereits geladenes Datenpaket bleibt unveraendert gueltig. Dieses Paket
ergaenzt nur den Medienteil. In \`manifest.json\` steht, welche Zeilen der
Tabelle cms_assets fuer die Zuordnung gelesen wurden.
`;

/**
 * Eigenständiger, geschützter Weg „Nur Medienpaket": liest ausschließlich das
 * Medieninventar (per Keyset-Paging) plus `cms_assets` für die Zuordnung —
 * nicht alle 23 Tabellen. Damit lässt sich ein unvollständiges Datenpaket ohne
 * kompletten Neulauf ergänzen.
 */
export async function buildMediaOnlyZip(opts: {
  signal?: AbortSignal;
  onProgress?: (p: ExportProgress) => void;
} = {}): Promise<FullExportResult> {
  const signal = opts.signal;
  const report = (phase: string, done: number, total: number, detail?: string) =>
    opts.onProgress?.({ phase, done, total, detail });
  const generatedAt = new Date().toISOString();
  const errors: Record<string, string> = {};
  const zip = new JSZip();
  const total = 5;

  throwIfAborted(signal);
  report("Mediensumme vorher", 0, total);
  let mediaBefore: StorageSummary | null = null;
  try {
    mediaBefore = await fetchStorageSummary(signal);
    if (mediaBefore.errors.length > 0) {
      errors["storage_summary_before"] = `Vorzählung meldet ${mediaBefore.errors.length} Fehler.`;
    }
    if (mediaBefore.truncated) {
      errors["storage_summary_before_truncated"] = "Vorzählung des Medieninventars wurde abgeschnitten.";
    }
  } catch (e) {
    if (e instanceof ExportAuthError) throw e;
    if (isAbort(e)) throw new ExportAbortError();
    errors["storage_summary_before"] = e instanceof Error ? e.message : "unbekannt";
  }

  throwIfAborted(signal);
  report("Medieninventar lesen", 1, total);
  let inventory: StorageInventory | null = null;
  try {
    inventory = validateInventoryPayload(
      await fetchStorageInventory(signal, {
        onPage: (loaded) => report("Medieninventar lesen", 1, total, `${loaded} Objekte`),
      }),
    );
  } catch (e) {
    if (e instanceof ExportAuthError) throw e;
    if (isAbort(e)) throw new ExportAbortError();
    errors["storage_inventory"] = e instanceof Error ? e.message : "unbekannt";
  }

  throwIfAborted(signal);
  report("Bildzuordnungen lesen", 2, total);
  let assets: Record<string, unknown>[] = [];
  try {
    assets = (await fetchTableRows("cms_assets", { signal })).rows;
  } catch (e) {
    if (e instanceof ExportAuthError) throw e;
    if (isAbort(e)) throw new ExportAbortError();
    errors["cms_assets"] = e instanceof Error ? e.message : "unbekannt";
  }

  throwIfAborted(signal);
  report("Mediensumme nachher", 3, total);
  let mediaAfter: StorageSummary | null = null;
  try {
    mediaAfter = await fetchStorageSummary(signal);
    if (mediaAfter.errors.length > 0) {
      errors["storage_recount"] = `Nachzählung meldet ${mediaAfter.errors.length} Fehler.`;
    }
    if (mediaAfter.truncated) {
      errors["storage_recount_truncated"] = "Nachzählung des Medieninventars wurde abgeschnitten.";
    }
  } catch (e) {
    if (e instanceof ExportAuthError) throw e;
    if (isAbort(e)) throw new ExportAbortError();
    errors["storage_recount"] = e instanceof Error ? e.message : "unbekannt";
    mediaAfter = null;
  }

  const { entries, unsafe, duplicateTargets, external, recountMatches, summaryMatches } = writeMediaFolder(
    zip,
    { inventory, assets, mediaAfter, mediaBefore },
  );

  const { status, reasons } = computeStatus({
    errors,
    checks: [],
    integrity: [],
    inventory,
    unsafeCount: unsafe.length,
    duplicateTargets,
    uncoveredTables: [],
    mediaRecountMatches: recountMatches,
    mediaRecountErrors: mediaAfter?.errors ?? [],
    mediaRecountTruncated: mediaAfter?.truncated ?? false,
    missingTables: [],
    mediaBeforeErrors: mediaBefore?.errors ?? [],
    mediaBeforeTruncated: mediaBefore?.truncated ?? false,
    mediaSummaryMatches: summaryMatches,
  });

  throwIfAborted(signal);
  report("Paket schreiben", 4, total);

  const files: Array<{ path: string; bytes: number; sha256: string }> = [];
  for (const name of Object.keys(zip.files).filter((n) => !zip.files[n].dir)) {
    throwIfAborted(signal);
    const buf = await zip.files[name].async("arraybuffer");
    files.push({ path: name, bytes: buf.byteLength, sha256: await sha256Hex(buf) });
  }

  const manifest = {
    bundle: "CMS-Light Medienpaket",
    bundle_version: BUNDLE_VERSION,
    supplement_to: "cms-light-full-export (Datenpaket) — ergänzt nur den Medienteil",
    status,
    status_reasons: reasons,
    generated_at: generatedAt,
    finished_at: new Date().toISOString(),
    export_kind: "Medieninventar über geschützte Edge Function (service_role, serverseitig)",
    atomic: false,
    is_pg_dump: false,
    restore_verified: false,
    binaries_in_bundle: false,
    tables_read: ["cms_assets"],
    media: {
      bucket: inventory?.bucket ?? null,
      object_count: inventory?.object_count ?? 0,
      total_bytes: inventory?.total_bytes ?? 0,
      inventory_truncated: inventory?.truncated ?? true,
      inventory_errors: inventory?.errors ?? ["Inventar nicht gelesen"],
      manifest_entries: entries.length,
      unsafe_paths: unsafe.map((u) => ({ path: u.path, reason: u.reason })),
      duplicate_targets: duplicateTargets,
      summary_before: mediaBefore,
      summary_matches: summaryMatches,
      recount: mediaAfter
        ? {
            object_count: mediaAfter.object_count,
            total_bytes: mediaAfter.total_bytes,
            max_updated_at: mediaAfter.max_updated_at ?? null,
            invalid_size_count: mediaAfter.invalid_size_count ?? null,
            matches: recountMatches,
            errors: mediaAfter.errors,
            truncated: mediaAfter.truncated,
          }
        : null,
      external_references: external.length,
      external_secured: false,
    },
    errors,
    files,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("README.txt", MEDIA_ONLY_README(STATUS_LABEL[status], generatedAt));

  throwIfAborted(signal);
  const blob = await zip.generateAsync({ type: "blob" });
  throwIfAborted(signal);
  const stamp = generatedAt.replace(/[:.]/g, "-");
  return {
    blob,
    fileName: `cms-light-media-only-${BUNDLE_VERSION}-${stamp}${STATUS_SUFFIX[status]}.zip`,
    status,
    manifest,
  };
}
