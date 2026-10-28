/**
 * Client-Zugang zum Übersetzungswerkzeug (Tab „Übersetzungen").
 *
 * Regeln:
 * - Lesen: direkte, RLS-geschützte SELECTs auf `cms_locales`,
 *   `cms_translation_provider_rates`, `cms_translation_runs`, `cms_pages`.
 * - Schreiben/Übersetzen: ausschließlich über die Edge Function
 *   `cms-translation-run` (Service-Role bleibt serverseitig). Aus dem Browser
 *   ist keine Übersetzungs-Funktion der Datenbank ausführbar.
 * - Keine Provider-Schlüssel im Client. Die Oberfläche kennt nur
 *   „konfiguriert / nicht konfiguriert".
 */

export type TranslationScopeKind = "page" | "pages" | "locale";

export interface CmsLocaleRow {
  locale: string;
  label_de: string;
  label_native: string;
  is_source: boolean;
  is_active: boolean;
  is_public: boolean;
  fallback_locale: string | null;
  sort_order: number;
  deepl_supported: boolean;
  notes: string | null;
}

export interface ProviderRateRow {
  provider: string;
  model: string;
  label: string;
  currency: string;
  cost_per_1k_source_chars: number;
  is_default: boolean;
  is_enabled: boolean;
  requires_secret: string | null;
  basis_note: string | null;
}

export interface TranslationRunRow {
  id: string;
  source_locale: string;
  target_locale: string;
  scope_kind: TranslationScopeKind;
  scope_signature: string;
  page_keys: string[];
  provider: string;
  model: string;
  status: "queued" | "running" | "paused" | "cancelled" | "done" | "error";
  fields_planned: number;
  fields_done: number;
  fields_skipped: number;
  fields_failed: number;
  batches_done: number;
  model_calls: number;
  memory_hits: number;
  chars_source: number;
  cost_estimate: number;
  cost_limit: number | null;
  cursor_page_key: string | null;
  cursor_section_key: string | null;
  cursor_field_key: string | null;
  last_error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoverageAreaRow {
  total: number;
  filled: number;
  machine: number;
  stale: number;
  reviewed: number;
  todo: number;
  not_whitelisted: number;
}

export interface CoverageLocaleRow {
  locale: string;
  label_de: string;
  is_active: boolean;
  is_source: boolean;
  is_public: boolean;
  total: number;
  filled: number;
  machine: number;
  stale: number;
  reviewed: number;
  todo: number;
  not_whitelisted: number;
  open_runs: number;
  failed_jobs: number;
  /** Spaltenbasierte Bereiche (Titel/Navigation/Alt-Text) gibt es nur für EN/PL. */
  columns_supported: boolean;
  /** true = Zahlen dieser Sprache werden gerade erst erstmalig berechnet. */
  pending?: boolean;
  by_area: Record<string, CoverageAreaRow>;
}

/** Herkunft und Alter der gespeicherten Sprachstand-Zusammenfassung. */
export interface CoverageCacheMeta {
  hit: boolean;
  is_stale: boolean;
  computed_at: string;
  compute_ms: number;
  age_seconds: number;
  /** Sprache, die bei diesem Aufruf neu berechnet wurde (falls vorhanden). */
  refreshed_locale?: string | null;
  /** Sprachen ohne gespeicherte Zahlen — werden schrittweise nachgerechnet. */
  pending_locales?: string[];
  /** true = eine Neuberechnung läuft bereits; es wird keine zweite gestartet. */
  busy?: boolean;
}

export interface TranslationStatus {
  coverage: {
    de_translatable_fields: number;
    areas: string[];
    source_by_area: Record<string, number>;
    locales: CoverageLocaleRow[];
    /** Fehlt nur bei sehr alten Serverständen. */
    cache?: CoverageCacheMeta;
  };
  rates: ProviderRateRow[];
  locales: CmsLocaleRow[];
  providers: Array<{
    provider: string;
    label: string;
    configured: boolean;
    secret: string;
    /** true = vom Anbieter Lovable AI verwaltet, kein eigener Schlüssel nötig. */
    managed?: boolean;
    /** Woher der Schlüssel kommt: Tresor, Projekt-Geheimnis oder gar nicht. */
    source?: "vault" | "project_secret" | "none";
    last4?: string | null;
    key_updated_at?: string | null;
    last_test_at?: string | null;
    last_test_ok?: boolean | null;
    last_test_error?: string | null;
  }>;
  /** Anbieter-/Modellzuordnung je Sprache (nur Zuordnung, keine Schlüssel). */
  locale_configs?: Array<{
    locale: string;
    provider: string;
    model: string;
    verified_at: string | null;
    updated_at: string | null;
  }>;
  global_authorization_configured: boolean;

  limits: {
    max_items_per_step: number;
    run_cost_limit_default: number;
    run_cost_limit_global: number;
    model_calls_per_day: number;
  };
  /** Erlaubte Form einer Modell-Kennung — kommt vom Server, nicht aus dem Code. */
  model_id_pattern?: string;
  model_id_hint?: string;
  /** Providerabhängige Regeln (eigene Anbieter benutzen native Kennungen). */
  model_id_patterns?: Record<string, string>;
  model_id_hints?: Record<string, string>;
  default_model?: string;
}



export interface DryRunResult {
  dry_run: {
    target_locale: string;
    pages: number;
    fields: number;
    source_unique: number;
    targets_existing: number;
    protected_manual: number;
    not_whitelisted: number;
    todo_fields: number;
    todo_unique: number;
    memory_ready: number;
    chars_source: number;
    chars_unique: number;
    /** Bereichsaufteilung, damit Navigation/Alt-Texte nicht unsichtbar fehlen. */
    by_area: Record<string, { todo: number; total: number; chars: number }>;
  };
  scope_kind: TranslationScopeKind;
  scope_signature: string;
  estimate: {
    model_calls_expected: number;
    chars_billable: number;
    cost_per_1k_source_chars: number;
    currency: string;
    cost_estimate: number;
    is_estimate: boolean;
    /** false = kein belastbarer Zeichenpreis gepflegt (Abrechnung nach Token). */
    cost_available?: boolean;
    model?: string;
    provider?: string;
    basis: string;
  };
}

export interface QaIssue {
  /** Datenbereich (Baustein, Seitentitel, Navigation, Bild-Alt). */
  area?: string;
  page_key: string;
  section_key: string;
  field_key: string;
  issue: string;
  review_status: string | null;
  de_value: string;
  target_value: string;
}

export interface QaReport {
  target_locale: string;
  checked: number;
  ok: number;
  issues_total: number;
  by_issue: Record<string, number>;
  failed_batches: number;
  items: QaIssue[];
}

export interface StepResult {
  run: TranslationRunRow;
  items_processed: number;
  done?: number;
  skipped?: number;
  failed?: number;
  model_calls?: number;
  memory_hits?: number;
  halted?: string | null;
  finished?: boolean;
}

/** Umfangs-Signatur — identisch zur serverseitigen Berechnung (Idempotenz). */
export function scopeSignature(
  scopeKind: TranslationScopeKind,
  targetLocale: string,
  pageKeys: string[],
): string {
  if (scopeKind === "locale") return `locale:${targetLocale}:*`;
  const keys = [...new Set(pageKeys)].filter(Boolean).sort();
  return `${scopeKind}:${targetLocale}:${keys.join(",")}`;
}

/** Menschlicher Fehlertext aus der Edge-Function-Antwort. */
export async function readFunctionError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    let body: Record<string, unknown> = {};
    try {
      body = (await ctx.clone().json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const code = typeof body.error === "string" ? body.error : "";
    const message = typeof body.message === "string" ? body.message : "";
    if (message) return message;
    if (code === "origin_not_allowed" || code === "origin_required") {
      return "Dieser Ursprung darf den Übersetzungsdienst nicht aufrufen.";
    }
    if (code) return `Übersetzungsdienst meldet: ${code}`;
  }
  return (error as { message?: string })?.message || "Übersetzungsdienst nicht erreichbar.";
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase.functions.invoke("cms-translation-run", { body });
  if (error) throw new Error(await readFunctionError(error));
  return data as T;
}

/**
 * Statusübersicht — bewusst entkoppelt vom Takt der Oberfläche.
 *
 * - Serverseitig kommt der Sprachstand aus einer gespeicherten Zusammenfassung
 *   (Standardalter 15 Minuten). Änderungen und Läufe markieren sie automatisch
 *   als veraltet, dann wird früher neu gerechnet.
 * - Im Browser wird jede Anfrage entdoppelt: parallele Aufrufe teilen sich eine
 *   laufende Anfrage, und ein frisches Ergebnis wird kurz wiederverwendet.
 *   Damit entsteht kein Anfragensturm, wenn mehrere Bereiche gleichzeitig laden.
 */
export const STATUS_CLIENT_TTL_MS = 60_000;

let statusInflight: Promise<TranslationStatus> | null = null;
let statusCached: { at: number; value: TranslationStatus } | null = null;

export interface FetchStatusOptions {
  /** true = gespeicherte Zusammenfassung serverseitig neu berechnen. */
  refresh?: boolean;
  /** Wie alt ein Browser-Ergebnis höchstens sein darf (Millisekunden). */
  maxAgeMs?: number;
}

export async function fetchTranslationStatus(
  options: FetchStatusOptions = {},
): Promise<TranslationStatus> {
  const force = options.refresh === true;
  const ttl = options.maxAgeMs ?? STATUS_CLIENT_TTL_MS;

  if (!force && statusCached && Date.now() - statusCached.at < ttl) {
    return statusCached.value;
  }
  if (!force && statusInflight) return statusInflight;

  const pending = invoke<TranslationStatus>({
    action: "status",
    refresh_coverage: force,
    coverage_max_age_seconds: force ? 0 : 900,
  })
    .then((value) => {
      statusCached = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      if (statusInflight === pending) statusInflight = null;
    });

  statusInflight = pending;
  return pending;
}

/** Für Tests und für den Wechsel des Arbeitsbereichs. */
export function resetTranslationStatusCache(): void {
  statusInflight = null;
  statusCached = null;
  basicsInflight = null;
  basicsCached = null;
  coverageInflight = null;
  coverageCached = null;
}

/**
 * Grundstatus ohne Sprachstand-Zahlen: Sprachliste, Anbieter, Modelle, Grenzen.
 *
 * Dieser Abruf ist absichtlich leichtgewichtig — er darf nie auf die teure
 * Sprachstand-Berechnung warten. Sprachwahl und Sprachaktivierung hängen nur
 * hiervon ab.
 */
export type TranslationBasics = Omit<TranslationStatus, "coverage">;
export type TranslationCoverage = TranslationStatus["coverage"];

let basicsInflight: Promise<TranslationBasics> | null = null;
let basicsCached: { at: number; value: TranslationBasics } | null = null;

export async function fetchTranslationBasics(
  options: FetchStatusOptions = {},
): Promise<TranslationBasics> {
  const force = options.refresh === true;
  const ttl = options.maxAgeMs ?? STATUS_CLIENT_TTL_MS;
  if (!force && basicsCached && Date.now() - basicsCached.at < ttl) return basicsCached.value;
  if (!force && basicsInflight) return basicsInflight;

  const pending = invoke<TranslationBasics>({ action: "status", include_coverage: false })
    .then((value) => {
      basicsCached = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      if (basicsInflight === pending) basicsInflight = null;
    });
  basicsInflight = pending;
  return pending;
}

/**
 * Sprachstand getrennt abrufen. Mehrere gleichzeitige Aufrufe teilen sich eine
 * Anfrage — es entstehen nie parallele schwere Neuberechnungen. Ein Fehler hier
 * betrifft ausschließlich die Zahlen, nicht die Bedienbarkeit.
 */
let coverageInflight: Promise<TranslationCoverage> | null = null;
let coverageCached: { at: number; value: TranslationCoverage } | null = null;

export async function fetchTranslationCoverage(
  options: FetchStatusOptions = {},
): Promise<TranslationCoverage> {
  const force = options.refresh === true;
  const ttl = options.maxAgeMs ?? STATUS_CLIENT_TTL_MS;
  if (!force && coverageCached && Date.now() - coverageCached.at < ttl) return coverageCached.value;
  // Auch ein erzwungenes Neuberechnen wartet auf eine bereits laufende Anfrage,
  // damit der Server nicht mehrfach dieselbe Menge materialisiert.
  if (coverageInflight) return coverageInflight;

  const pending = invoke<{ coverage: TranslationCoverage | null; coverage_error?: string | null }>({
    action: "status",
    include_coverage: true,
    refresh_coverage: force,
    coverage_max_age_seconds: force ? 0 : 900,
  })
    .then((res) => {
      if (!res.coverage) {
        throw new Error(
          res.coverage_error
            ? `Die Sprachstand-Zahlen konnten nicht berechnet werden (${res.coverage_error}).`
            : "Die Sprachstand-Zahlen sind derzeit nicht verfügbar.",
        );
      }
      coverageCached = { at: Date.now(), value: res.coverage };
      return res.coverage;
    })
    .finally(() => {
      if (coverageInflight === pending) coverageInflight = null;
    });
  coverageInflight = pending;
  return pending;
}



export const requestDryRun = (args: {
  targetLocale: string;
  scopeKind: TranslationScopeKind;
  pageKeys: string[];
  provider?: string;
  model?: string;
}) =>
  invoke<DryRunResult>({
    action: "dry_run",
    target_locale: args.targetLocale,
    scope_kind: args.scopeKind,
    page_keys: args.pageKeys,
    provider: args.provider,
    model: args.model,
  });

export const startRun = (args: {
  targetLocale: string;
  scopeKind: TranslationScopeKind;
  pageKeys: string[];
  provider?: string;
  model?: string;
  authorizationCode?: string;
}) =>
  invoke<{ run_id: string; reused: boolean }>({
    action: "start",
    target_locale: args.targetLocale,
    scope_kind: args.scopeKind,
    page_keys: args.pageKeys,
    provider: args.provider,
    model: args.model,
    authorization_code: args.authorizationCode,
  });

export const stepRun = (runId: string, batchSize = 10) =>
  invoke<StepResult>({ action: "step", run_id: runId, batch_size: batchSize });

export const controlRun = (runId: string, action: "pause" | "resume" | "cancel") =>
  invoke<{ run: TranslationRunRow }>({ action, run_id: runId });

export const requestQaReport = (args: {
  targetLocale: string;
  scopeKind: TranslationScopeKind;
  pageKeys: string[];
  limit?: number;
}) =>
  invoke<{ qa: QaReport }>({
    action: "qa",
    target_locale: args.targetLocale,
    scope_kind: args.scopeKind,
    page_keys: args.pageKeys,
    qa_limit: args.limit,
  });

/** Läufe lesen (RLS: nur lesen, kein Schreibweg über die Tabelle). */
export async function readRuns(limit = 25): Promise<TranslationRunRow[]> {
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase
    .from("cms_translation_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TranslationRunRow[];
}

export async function readRun(runId: string): Promise<TranslationRunRow | null> {
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase
    .from("cms_translation_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as TranslationRunRow) ?? null;
}

export async function readPageList(): Promise<Array<{ page_key: string; title: string }>> {
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase
    .from("cms_pages")
    .select("page_key,title_de,route_path")
    .order("page_key");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as { page_key: string; title_de: string | null; route_path: string | null };
    return { page_key: row.page_key, title: row.title_de || row.route_path || row.page_key };
  });
}

/** Fortschritt/Restzeit — ausschließlich aus persistierten Laufdaten. */
export function runProgress(run: TranslationRunRow) {
  const processed = run.fields_done + run.fields_skipped + run.fields_failed;
  const planned = Math.max(run.fields_planned, processed);
  const percent = planned > 0 ? Math.min(100, Math.round((processed / planned) * 100)) : 0;
  const startedAt = run.started_at ? new Date(run.started_at).getTime() : null;
  const endAt = run.finished_at ? new Date(run.finished_at).getTime() : Date.now();
  const runtimeSeconds = startedAt ? Math.max(0, Math.round((endAt - startedAt) / 1000)) : 0;
  const throughput = runtimeSeconds > 0 ? processed / runtimeSeconds : 0;
  const remaining = Math.max(0, planned - processed);
  const etaSeconds = throughput > 0 ? Math.round(remaining / throughput) : null;
  const isComplete = remaining === 0 && planned > 0;
  const lastActivity = new Date(run.updated_at).getTime();
  const secondsSinceActivity = Number.isFinite(lastActivity)
    ? Math.max(0, Math.round((Date.now() - lastActivity) / 1000))
    : 0;
  return {
    processed,
    planned,
    percent,
    runtimeSeconds,
    throughput,
    remaining,
    etaSeconds,
    isComplete,
    secondsSinceActivity,
  };
}

/**
 * Ehrlicher Laufzustand für die Anzeige. „abgeschlossen" darf nie zusammen mit
 * weniger als 100 % erscheinen; in diesem Fall wird der Rest benannt und ein
 * Fortsetzen angeboten.
 */
export function describeRunState(run: TranslationRunRow): {
  label: string;
  incomplete: boolean;
  remaining: number;
  canResume: boolean;
  reason: string | null;
} {
  const p = runProgress(run);
  const base: Record<string, string> = {
    queued: "wartet",
    running: "läuft",
    paused: "pausiert",
    cancelled: "abgebrochen",
    done: "abgeschlossen",
    error: "Fehler",
  };
  const incomplete = run.status === "done" && p.remaining > 0;
  const canResume =
    ["paused", "queued"].includes(run.status) || incomplete || run.status === "error";
  return {
    label: incomplete
      ? `unvollständig: ${p.remaining.toLocaleString("de-DE")} Restobjekte`
      : (base[run.status] ?? run.status),
    incomplete,
    remaining: p.remaining,
    canResume,
    reason: incomplete ? (run.last_error ?? "Grund nicht protokolliert") : null,
  };
}


/** Ab wie vielen verarbeiteten Texten eine Restzeit belastbar ist. */
export const ETA_MIN_SAMPLE = 10;
/** Ab wann ein laufender Lauf als „wartet auf Serverschritt" gilt. */
export const STALL_SECONDS = 90;

/**
 * Verständlicher Restzeit-Text — nur aus dem gespeicherten Lauf, ohne
 * Hochrechnung bei ausbleibender Serveraktivität.
 */
export function describeEta(run: TranslationRunRow): string {
  const p = runProgress(run);
  if (p.isComplete || ["done", "cancelled", "error"].includes(run.status)) return "–";
  if (run.status !== "running") return "–";
  if (p.secondsSinceActivity > STALL_SECONDS) {
    return `Wartet auf nächsten Serverschritt; letzte Aktivität vor ${formatSeconds(
      p.secondsSinceActivity,
    )}`;
  }
  if (p.processed < ETA_MIN_SAMPLE || p.etaSeconds == null) {
    return "Noch keine belastbare Restzeit";
  }
  return formatSeconds(p.etaSeconds);
}

/**
 * Aktiven Lauf zu genau diesem Umfang finden (Neuladen, Doppelklickschutz).
 * Liest nur die gespeicherten Läufe; erzeugt nichts.
 */
export async function findActiveRunForScope(args: {
  targetLocale: string;
  scopeKind: TranslationScopeKind;
  pageKeys: string[];
}): Promise<TranslationRunRow | null> {
  const wanted = scopeSignature(args.scopeKind, args.targetLocale, args.pageKeys);
  const rows = await readRuns(50);
  return (
    rows.find(
      (r) =>
        r.scope_signature === wanted &&
        ["queued", "running", "paused"].includes(r.status),
    ) ?? null
  );
}

/**
 * Lauf für die Fortschrittskarte — strikt an Zielsprache und Umfang gebunden.
 *
 * Es wird bewusst NIE „irgendein offener Lauf" übernommen: sonst zeigt die
 * Anzeige bei Sprache A einen fremden Lauf der Sprache B. Bevorzugt wird ein
 * offener Lauf dieses Umfangs; sonst der jüngste Lauf dieses Umfangs.
 */
export async function findRunForLocale(args: {
  targetLocale: string;
  scopeKind: TranslationScopeKind;
  pageKeys: string[];
}): Promise<TranslationRunRow | null> {
  if (!args.targetLocale) return null;
  const wanted = scopeSignature(args.scopeKind, args.targetLocale, args.pageKeys);
  const rows = (await readRuns(50)).filter(
    (r) => r.target_locale === args.targetLocale && r.scope_signature === wanted,
  );
  return (
    rows.find((r) => ["queued", "running", "paused"].includes(r.status)) ?? rows[0] ?? null
  );
}

export function formatSeconds(seconds: number | null): string {
  if (seconds == null) return "–";
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m} min ${s} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** QA-Bericht als CSV (Semikolon, Excel-freundlich). */
export function qaReportToCsv(report: QaReport): string {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = [
    "bereich",
    "seite",
    "baustein",
    "feld",
    "befund",
    "herkunft",
    "deutsch",
    "zielsprache",
    "sprache",
  ].join(";");
  const lines = report.items.map((i) =>
    [
      esc(i.area ?? "section_field"),
      esc(i.page_key),
      esc(i.section_key),
      esc(i.field_key),
      esc(i.issue),
      esc(i.review_status ?? ""),
      esc(i.de_value),
      esc(i.target_value),
      esc(report.target_locale),
    ].join(";"),
  );
  return [head, ...lines].join("\r\n");
}


/**
 * Druckbarer Bericht (Browser-Druck → „Als PDF speichern"). Enthält
 * Sprachstand je Datenbereich und die Prüfbefunde. Reine Anzeige — es werden
 * keine Inhalte verändert.
 */
export function buildReportHtml(args: {
  locale: string;
  status: TranslationStatus | null;
  qa: QaReport | null;
}): string {
  const esc = (v: unknown) =>
    String(v ?? "").replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
  const cov = args.status?.coverage;
  const row = cov?.locales.find((l) => l.locale === args.locale) ?? null;
  const areas = cov?.areas ?? [];
  const areaRows = areas
    .map((a) => {
      const r = row?.by_area?.[a];
      return `<tr><td>${esc(a)}</td><td>${esc(cov?.source_by_area?.[a] ?? 0)}</td><td>${esc(
        r?.filled ?? 0,
      )}</td><td>${esc(r?.reviewed ?? 0)}</td><td>${esc(r?.machine ?? 0)}</td><td>${esc(
        r?.stale ?? 0,
      )}</td><td>${esc(r?.todo ?? 0)}</td><td>${esc(r?.not_whitelisted ?? 0)}</td></tr>`;
    })
    .join("");
  const qaRows = (args.qa?.items ?? [])
    .slice(0, 500)
    .map(
      (i) =>
        `<tr><td>${esc(i.area ?? "section_field")}</td><td>${esc(i.page_key)}</td><td>${esc(
          i.section_key,
        )}</td><td>${esc(i.field_key)}</td><td>${esc(i.issue)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Sprachbericht ${esc(args.locale)}</title>
<style>body{font-family:system-ui,sans-serif;font-size:12px;margin:24px;color:#111}
h1{font-size:18px}h2{font-size:14px;margin-top:20px}
table{border-collapse:collapse;width:100%;margin-top:6px}
th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f3f3f3}</style></head><body>
<h1>Sprachbericht ${esc(args.locale.toUpperCase())}</h1>
<p>Erstellt am ${esc(new Date().toLocaleString("de-DE"))}. Quelle ist Deutsch.</p>
<h2>Stand je Datenbereich</h2>
<table><thead><tr><th>Bereich</th><th>Texte</th><th>gefüllt</th><th>geprüft</th><th>maschinell</th><th>veraltet</th><th>offen</th><th>nicht freigeschaltet</th></tr></thead>
<tbody>${areaRows || '<tr><td colspan="8">Keine Zahlen geladen.</td></tr>'}</tbody></table>
<h2>Prüfbefunde${args.qa ? ` (${esc(args.qa.issues_total)} von ${esc(args.qa.checked)})` : ""}</h2>
<table><thead><tr><th>Bereich</th><th>Seite</th><th>Baustein</th><th>Feld</th><th>Befund</th></tr></thead>
<tbody>${qaRows || '<tr><td colspan="5">Kein Prüfbericht erzeugt.</td></tr>'}</tbody></table>
</body></html>`;
}
