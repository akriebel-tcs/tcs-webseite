/**
 * cms-snapshot-export — geschützter, rein lesender CMS-Export.
 *
 * Grundsätze (bewusst eng):
 * - Auf JEDER Anfrage wird serverseitig die vorhandene Adminfreigabe geprüft.
 *   Es gibt KEINE zweite Auth-Wahrheit: die Prüfung geht an die bestehende
 *   Aktion `admin_session` von `cms-translation-run`. Timeout/Fehler = Abweisung
 *   (fail closed). Kein Clientflag entsperrt irgendetwas.
 * - Kein beliebiges SQL, kein Tabellenname und keine Ziel-URL vom Client:
 *   nur Namen aus der festen Liste `EXPORT_TABLES`.
 * - Zugangsdaten-/Auth-Tabellen sind fest ausgeschlossen (`EXCLUDED_TABLES`).
 * - service_role und Geheimnisse bleiben ausschließlich auf dem Server.
 * - Nur Lesen: kein insert/update/delete, kein Scheduler, kein Job-Anstoß.
 */

// Genau gepinnt auf die im Projekt gesperrte Version (package-lock: 2.105.4).
import { createClient } from "npm:@supabase/supabase-js@2.105.4";

const PROJECT_ID = "244ceaa8-da87-42eb-90d8-045b23513c76";
const PROJECT_SLUG = "tcs-webseite-db-cms";

const ALLOWED_ORIGIN_EXACT = new Set([
  `https://${PROJECT_SLUG}.lovable.app`,
  `https://preview--${PROJECT_SLUG}.lovable.app`,
  `https://id-preview--${PROJECT_SLUG}.lovable.app`,
  `https://${PROJECT_SLUG}.lovableproject.com`,
  `https://id-preview--${PROJECT_ID}.lovable.app`,
  `https://preview--${PROJECT_ID}.lovable.app`,
  `https://${PROJECT_ID}.lovableproject.com`,
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
]);

const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  new RegExp(`^https://[a-z0-9-]*${PROJECT_ID}\\.lovable\\.app$`, "i"),
  new RegExp(`^https://[a-z0-9-]*${PROJECT_ID}\\.lovableproject\\.com$`, "i"),
];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MEDIA_BUCKET = "cms-assets";
const MAX_BATCH = 1000;
const AUTH_TIMEOUT_MS = 8000;

type TableClass = "content" | "config" | "operations" | "cache";

type ExportTable = {
  name: string;
  /** Eindeutiger, stabiler Sortier-/Seitenschlüssel (Keyset-Paging). */
  key: string;
  /** true = Tabelle enthält höchstens eine Zeile (kein Keyset nötig). */
  singleRow?: boolean;
  klass: TableClass;
  /** Hinweis für die Wiederherstellung. */
  restore: string;
};

/**
 * Vollständige, ausdrückliche Exportliste. Diese Liste darf NICHT pauschal auf
 * beliebige public-Tabellen erweitert werden.
 */
const EXPORT_TABLES: ExportTable[] = [
  { name: "cms_pages", key: "id", klass: "content", restore: "Inhalt — zuerst einspielen." },
  { name: "cms_sections", key: "id", klass: "content", restore: "Inhalt — nach cms_pages." },
  { name: "cms_section_fields", key: "id", klass: "content", restore: "Inhalt — nach cms_sections." },
  { name: "cms_admin_editable_fields", key: "id", klass: "config", restore: "Whitelist — zuletzt einspielen." },
  { name: "cms_assets", key: "id", klass: "content", restore: "Bild-Slots; Dateien separat (Medienpaket)." },
  { name: "cms_asset_translations", key: "id", klass: "content", restore: "Nach cms_assets." },
  { name: "cms_navigation_nodes", key: "id", klass: "content", restore: "Nach cms_pages (Parent-Reihenfolge beachten)." },
  { name: "cms_navigation_node_translations", key: "id", klass: "content", restore: "Nach cms_navigation_nodes." },
  { name: "cms_page_translations", key: "id", klass: "content", restore: "Nach cms_pages." },
  { name: "cms_page_completion", key: "id", klass: "config", restore: "Redaktioneller Fortschritt." },
  { name: "cms_locales", key: "locale", klass: "config", restore: "Sprachregistry — vor Inhalten." },
  { name: "cms_locale_translation_config", key: "locale", klass: "config", restore: "Anbieter/Modell je Sprache (ohne Schlüssel)." },
  { name: "cms_ui_strings", key: "id", klass: "content", restore: "Bedienungstexte." },
  { name: "cms_ui_string_translations", key: "id", klass: "content", restore: "Nach cms_ui_strings." },
  { name: "cms_translation_unit_state", key: "id", klass: "content", restore: "Prüfstatus je Texteinheit." },
  { name: "cms_translation_memory", key: "id", klass: "operations", restore: "Optional — Übersetzungsgedächtnis." },
  { name: "cms_translation_provider_rates", key: "id", klass: "config", restore: "Kostensätze/Modelle (ohne Schlüssel)." },
  { name: "cms_translation_autopilot", key: "singleton", singleRow: true, klass: "operations", restore: "NICHT automatisch aktivieren." },
  { name: "cms_translation_runs", key: "id", klass: "operations", restore: "Historie — NIEMALS automatisch fortsetzen." },
  { name: "cms_translation_jobs", key: "id", klass: "operations", restore: "Warteschlange — NIEMALS automatisch abarbeiten." },
  { name: "cms_locale_visibility_audit", key: "id", klass: "operations", restore: "Protokoll — nur informativ." },
  { name: "cms_translation_coverage_cache", key: "cache_key", klass: "cache", restore: "Zwischenspeicher — beim Restore weglassen." },
  { name: "cms_translation_coverage_locale_cache", key: "locale", klass: "cache", restore: "Zwischenspeicher — beim Restore weglassen." },
];

/** Fest ausgeschlossen — nie exportieren. */
const EXCLUDED_TABLES = [
  { name: "cms_provider_credentials", reason: "Anbieter-Zugangsdaten (Tresorverweise)." },
  { name: "cms_provider_credential_audit", reason: "Protokoll der Schlüsselaktionen." },
  { name: "user_roles", reason: "Rollenzuordnung von Konten." },
  { name: "vault.secrets", reason: "Verschlüsselte Geheimnisse." },
  { name: "auth.*", reason: "Konten, E-Mails, Passwort-Hashes." },
  { name: "storage.*", reason: "Storage-Metadaten (Inventar wird separat gelesen)." },
];

const TABLE_MAP = new Map(EXPORT_TABLES.map((t) => [t.name, t]));

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGIN_EXACT.has(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function corsFor(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? (origin as string) : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function readCookie(req: Request, name: string): string {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

/**
 * Freigabe prüfen — ausschließlich über den bestehenden Mechanismus von
 * `cms-translation-run` (Aktion `admin_session`). Kein eigener Schlüssel, keine
 * eigene Sitzungsausgabe. Jeder Fehler und jedes Zeitüberschreiten führt zur
 * Abweisung.
 */
async function requireAdmin(
  req: Request,
  body: { admin_token?: string },
): Promise<{ ok: true; expiresAt: string | null } | { ok: false; status: number; error: string; message: string }> {
  const token = String(body.admin_token ?? "").trim() || readCookie(req, "cms_admin_session");
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "admin_unlock_required",
      message: "Bitte den Export zuerst mit dem Adminpasswort entsperren.",
    };
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { ok: false, status: 503, error: "server_not_configured", message: "Serverdienst nicht eingerichtet." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/cms-translation-run`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({ action: "admin_session", admin_token: token }),
    });
    const out = (await res.json().catch(() => null)) as
      | { unlocked?: boolean; expires_at?: string; reason?: string; message?: string }
      | null;
    if (!res.ok || !out || out.unlocked !== true) {
      const reason = out?.reason ?? "admin_session_invalid";
      return {
        ok: false,
        status: 401,
        error: reason,
        message:
          out?.message ??
          (reason === "admin_session_expired"
            ? "Die Freigabe ist abgelaufen. Bitte erneut entsperren."
            : "Die Freigabe ist ungültig. Bitte erneut entsperren."),
      };
    }
    return { ok: true, expiresAt: out.expires_at ?? null };
  } catch {
    // Timeout / Netzfehler → fail closed.
    return {
      ok: false,
      status: 503,
      error: "admin_check_unavailable",
      message: "Die Freigabe konnte nicht geprüft werden. Der Export wird abgebrochen.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

async function markerFor(table: string): Promise<{ column: string | null; value: string | null }> {
  const client = db();
  for (const col of ["updated_at", "created_at"]) {
    const { data, error } = await client
      .from(table)
      .select(col)
      .order(col, { ascending: false })
      .limit(1);
    if (!error) {
      const row = (data ?? [])[0] as Record<string, unknown> | undefined;
      return { column: col, value: row ? String(row[col] ?? "") || null : null };
    }
  }
  return { column: null, value: null };
}

async function handleCounts() {
  const client = db();
  const tables: unknown[] = [];
  for (const t of EXPORT_TABLES) {
    const { count, error } = await client.from(t.name).select("*", { count: "exact", head: true });
    const marker = error ? { column: null, value: null } : await markerFor(t.name);
    tables.push({
      table: t.name,
      key: t.key,
      single_row: Boolean(t.singleRow),
      classification: t.klass,
      restore_note: t.restore,
      row_count: error ? null : (count ?? 0),
      marker_column: marker.column,
      marker_value: marker.value,
      error: error ? error.message : null,
    });
  }
  return { tables, excluded: EXCLUDED_TABLES, taken_at: new Date().toISOString() };
}

async function handleRows(body: { table?: string; after?: string | null; limit?: number }) {
  const name = String(body.table ?? "");
  const spec = TABLE_MAP.get(name);
  if (!spec) {
    return { status: 400, payload: { error: "table_not_allowed", message: `Tabelle „${name}" ist nicht Teil des Exports.` } };
  }
  const limit = Math.min(Math.max(Number(body.limit ?? MAX_BATCH) || MAX_BATCH, 1), MAX_BATCH);
  const client = db();
  let query = client.from(name).select("*").order(spec.key, { ascending: true }).limit(limit);
  if (!spec.singleRow && body.after !== null && body.after !== undefined && String(body.after) !== "") {
    query = query.gt(spec.key, String(body.after));
  }
  const { data, error } = await query;
  if (error) return { status: 500, payload: { error: "read_failed", message: error.message, table: name } };
  const rows = (data ?? []) as Record<string, unknown>[];
  const last = rows.length > 0 ? rows[rows.length - 1][spec.key] : null;
  return {
    status: 200,
    payload: {
      table: name,
      key: spec.key,
      rows,
      returned: rows.length,
      next_after: spec.singleRow || rows.length < limit ? null : (last === null ? null : String(last)),
      has_more: !spec.singleRow && rows.length === limit,
    },
  };
}

/**
 * Storage-Inventar des festen Buckets — inklusive unreferenzierter Objekte.
 *
 * Kein rekursiver Ordner-Walk mehr (das lief in das 150s-Zeitfenster der Edge
 * Function). Gelesen wird ausschließlich über die rein lesenden, nur für
 * service_role ausführbaren Funktionen
 * `rpc_internal_storage_inventory_page` (Keyset-Seite, höchstens 1000) und
 * `rpc_internal_storage_inventory_summary` (echtes SQL-Aggregat). Jede Anfrage
 * bleibt dadurch kurz; der Client sammelt die Seiten.
 *
 * Der Client kann KEINEN Bucket und KEINEN Pfad wählen: Bucket und Umfang sind
 * serverseitig in den Funktionen festgelegt. Jeder Fehler wird als Fehler
 * ausgewiesen und `truncated = true` gesetzt — es gibt keine stille Teilmenge.
 * `summary_only` liefert nur die Zahlen für den Vor/Nach-Vergleich.
 */
async function handleStorage(body: { summary_only?: boolean; after?: string | null; limit?: number }) {
  const client = db();
  const takenAt = () => new Date().toISOString();

  if (body.summary_only === true) {
    const { data, error } = await client.rpc("rpc_internal_storage_inventory_summary");
    if (error) {
      return {
        status: 200,
        payload: {
          bucket: MEDIA_BUCKET,
          object_count: 0,
          total_bytes: 0,
          invalid_size_count: 0,
          max_updated_at: null,
          errors: [`Mediensumme: ${error.message}`],
          truncated: true,
          taken_at: takenAt(),
        },
      };
    }
    const s = (data ?? {}) as {
      object_count?: number;
      total_bytes?: number;
      invalid_size_count?: number;
      max_updated_at?: string | null;
    };
    // Objekte mit fehlender/unbrauchbarer Groesse werden mitgezaehlt und als
    // Fehler ausgewiesen — sie verschwinden NICHT still aus den Zaehlern.
    const invalid = Number(s.invalid_size_count ?? 0);
    const summaryErrors = invalid > 0
      ? [`Mediensumme: ${invalid} Objekt(e) ohne gültige Größenangabe im Speicher.`]
      : [];
    return {
      status: 200,
      payload: {
        bucket: MEDIA_BUCKET,
        object_count: Number(s.object_count ?? 0),
        total_bytes: Number(s.total_bytes ?? 0),
        invalid_size_count: invalid,
        max_updated_at: s.max_updated_at ?? null,
        errors: summaryErrors,
        truncated: false,
        taken_at: takenAt(),
      },
    };
  }

  const limit = Math.min(Math.max(Number(body.limit ?? MAX_BATCH) || MAX_BATCH, 1), MAX_BATCH);
  const after =
    body.after === null || body.after === undefined || String(body.after) === "" ? null : String(body.after);

  const { data, error } = await client.rpc("rpc_internal_storage_inventory_page", {
    p_after: after,
    p_limit: limit,
  });
  if (error) {
    return {
      status: 200,
      payload: {
        bucket: MEDIA_BUCKET,
        objects: [],
        returned: 0,
        next_after: null,
        has_more: false,
        errors: [`Medieninventar${after ? ` ab ${after}` : ""}: ${error.message}`],
        truncated: true,
        taken_at: takenAt(),
      },
    };
  }
  const rows = (data ?? []) as Array<{
    object_path?: string;
    object_size?: number | string | null;
    mime_type?: string | null;
    etag?: string | null;
    updated_at?: string | null;
  }>;
  const pageErrors: string[] = [];
  const objects = rows.map((r) => {
    const path = String(r.object_path ?? "");
    // Fehlende oder unbrauchbare Groesse bleibt null (nie 0) und wird gemeldet.
    let size: number | null = null;
    if (r.object_size !== null && r.object_size !== undefined && String(r.object_size) !== "") {
      const n = Number(r.object_size);
      if (Number.isInteger(n) && n >= 0) size = n;
    }
    if (size === null) pageErrors.push(`Objekt ohne gültige Größenangabe: ${path}`);
    return {
      path,
      size,
      mime_type: r.mime_type ?? null,
      etag: r.etag ?? null,
      updated_at: r.updated_at ?? null,
      public_url: `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
    };
  });
  const last = objects.length > 0 ? objects[objects.length - 1].path : null;
  return {
    status: 200,
    payload: {
      bucket: MEDIA_BUCKET,
      objects,
      returned: objects.length,
      next_after: objects.length === limit ? last : null,
      has_more: objects.length === limit,
      errors: pageErrors,
      truncated: false,
      taken_at: takenAt(),
    },
  };
}


async function handleSchema() {
  const client = db();
  const { data, error } = await client.rpc("rpc_internal_cms_schema_snapshot");
  if (error) return { status: 500, payload: { error: "schema_failed", message: error.message } };
  return { status: 200, payload: { schema: data } };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsFor(origin);
  const json = (payload: unknown, status: number) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!isAllowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403);

  let body: {
    action?: string;
    admin_token?: string;
    table?: string;
    after?: string | null;
    limit?: number;
    summary_only?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Freigabe zuerst — vor jedem Lesen von Daten oder Struktur.
  const guard = await requireAdmin(req, body);
  if (!guard.ok) return json({ error: guard.error, message: guard.message }, guard.status);

  const action = String(body.action ?? "");
  try {
    if (action === "counts") return json({ ...(await handleCounts()), expires_at: guard.expiresAt }, 200);
    if (action === "rows") {
      const out = await handleRows(body);
      return json(out.payload, out.status);
    }
    if (action === "storage_inventory") {
      const out = await handleStorage(body);
      return json(out.payload, out.status);
    }
    if (action === "schema") {
      const out = await handleSchema();
      return json(out.payload, out.status);
    }
    return json({ error: "action_unknown" }, 400);
  } catch (e) {
    return json({ error: "export_failed", message: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
