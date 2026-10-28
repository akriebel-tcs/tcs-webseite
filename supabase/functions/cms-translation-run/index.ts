/**
 * CMS-Light Übersetzungswerkzeug — geschützter Serverdienst.
 *
 * Dieser Dienst ist der EINZIGE Schreibweg des neuen Admin-Tabs
 * „Übersetzungen". Er arbeitet mit dem internen Service-Role-Schlüssel und
 * ruft ausschließlich die eng begrenzten internen Funktionen
 * `rpc_internal_translation_*` bzw. `rpc_internal_apply_machine_translation`
 * auf. Aus dem Browser ist keine dieser Funktionen ausführbar.
 *
 * Sicherheitsmodell (übernommen von `cms-translate-field`, ergänzt):
 * - CORS nur für projektgebundene Ursprünge; originlose Aufrufe brauchen den
 *   internen Service-Role-Nachweis. Origin ist KEIN Auth-Ersatz.
 * - atomare, serverseitige Mengenbremse über `rpc_internal_rate_limit_hit`
 *   (Start-, Schritt- und Modellaufruf-Budget je Ursprung+IP).
 * - harte Grenzen: max. 25 Texte je Schritt, Längenlimit, Kostenlimit je Lauf,
 *   Tagesbudget für Modellaufrufe.
 * - Ein globaler Lauf über eine ganze Sprache verlangt ein zusätzliches
 *   Freigabewort aus dem Secret `CMS_TRANSLATION_GLOBAL_TOKEN`. Ohne dieses
 *   Secret wird ein globaler Start abgelehnt (kein offener kostenpflichtiger
 *   Endpunkt im No-Login-Arbeitsbereich).
 * - Externe Modell-Payload enthält nur Textsegment + Kontextlabel.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  joinTranslatedSegments,
  segmentLongText,
} from "../_shared/longTextSegments.ts";

const PROJECT_ID = "244ceaa8-da87-42eb-90d8-045b23513c76";

const PROJECT_SLUG = "tcs-webseite-db-cms";

const ALLOWED_ORIGIN_EXACT = new Set([
  `https://${PROJECT_SLUG}.lovable.app`,
  // Slug-basierte Vorschau dieses Projekts (exakt, keine Wildcard).
  `https://preview--${PROJECT_SLUG}.lovable.app`,
  `https://id-preview--${PROJECT_SLUG}.lovable.app`,
  `https://${PROJECT_SLUG}.lovableproject.com`,
  `https://id-preview--${PROJECT_ID}.lovable.app`,
  `https://${PROJECT_ID}.lovableproject.com`,
  `https://preview--${PROJECT_ID}.lovable.app`,
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
]);

const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  new RegExp(`^https://[a-z0-9-]*${PROJECT_ID}\\.lovable\\.app$`, "i"),
  new RegExp(`^https://[a-z0-9-]*${PROJECT_ID}\\.lovableproject\\.com$`, "i"),
];

/** Grenzwerte — bewusst konservativ. */
const MAX_ITEMS_PER_STEP = 25;
const MAX_SOURCE_LENGTH = 4000;
/** Höchstzahl an Segmenten je Texteinheit (schützt Budget und Laufzeit). */
const MAX_SEGMENTS_PER_UNIT = 12;
const RUN_COST_LIMIT_DEFAULT = 5; // EUR, Schätzung
const RUN_COST_LIMIT_GLOBAL = 25; // EUR, Schätzung
const RATE_START_LIMIT = 10;
const RATE_START_WINDOW = 300;
const RATE_STEP_LIMIT = 90;
const RATE_STEP_WINDOW = 60;
const RATE_MODEL_DAY_LIMIT = 6000;
const RATE_MODEL_DAY_WINDOW = 24 * 60 * 60;

const JOBS_TABLE = "cms_translation_jobs";
const JOBS_CONFLICT = "batch_id,page_key,section_key,field_key,target_locale";

const DEFAULT_PROVIDER = "lovable_ai";
/**
 * Notfall-Standard, falls die Modellliste der Datenbank nicht lesbar ist.
 * Die verbindliche Liste steht in `cms_translation_provider_rates`
 * (Spalte `is_default`) — es gibt bewusst keine zweite Liste im Code.
 */
const FALLBACK_MODEL = "google/gemini-3.6-flash";

/**
 * Zulässige Form einer Modell-Kennung beim Lovable-Gateway: `anbieter/modell`.
 * Wird an die Oberfläche gemeldet, damit dort dieselbe Regel gilt.
 */
const MODEL_ID_PATTERN = "^[a-z0-9][a-z0-9._-]*\\/[A-Za-z0-9][A-Za-z0-9._-]*$";
const MODEL_ID_HINT =
  "Modell-Kennungen haben immer die Form anbieter/modell, z. B. google/gemini-3.6-flash.";

/**
 * Eigene Anbieter benutzen ihre nativen Modell-Kennungen OHNE Schrägstrich
 * (z. B. `gemini-flash-latest`, `claude-sonnet-latest`) — genau so, wie sie an die
 * jeweilige API weitergegeben werden. DeepL hat keine Modellauswahl.
 */
const NATIVE_MODEL_ID_PATTERN = "^[A-Za-z0-9][A-Za-z0-9._-]*$";
const DEEPL_MODEL_ID = "deepl-api";

const MODEL_ID_PATTERNS: Record<string, string> = {
  lovable_ai: MODEL_ID_PATTERN,
  google_gemini: NATIVE_MODEL_ID_PATTERN,
  anthropic: NATIVE_MODEL_ID_PATTERN,
  deepl: `^${DEEPL_MODEL_ID}$`,
};

const MODEL_ID_HINTS: Record<string, string> = {
  lovable_ai: MODEL_ID_HINT,
  google_gemini:
    "Google Gemini benutzt seine eigene Modell-Kennung ohne Schrägstrich, z. B. gemini-flash-latest.",
  anthropic:
    "Anthropic benutzt seine eigene Modell-Kennung ohne Schrägstrich, z. B. claude-sonnet-latest.",
  deepl: "DeepL hat keine Modellauswahl — es gilt immer deepl-api.",
};

function modelIdPatternFor(provider: string): string {
  return MODEL_ID_PATTERNS[provider] ?? MODEL_ID_PATTERN;
}

/** Anbieter ohne Modellauswahl (DeepL) — es gilt immer der feste Vertrag. */
function hasNoModelChoice(provider: string): boolean {
  return provider === "deepl";
}

/** Kanonischer Modellwert je Anbieter (DeepL immer `deepl-api`). */
function canonicalModelFor(provider: string, model: string): string {
  return hasNoModelChoice(provider) ? DEEPL_MODEL_ID : model;
}

function modelIdHintFor(provider: string): string {
  return MODEL_ID_HINTS[provider] ?? MODEL_ID_HINT;
}

/** Prüft die Modell-Kennung nach der Regel des jeweiligen Anbieters. */
function isValidModelId(model: string, provider: string = DEFAULT_PROVIDER): boolean {
  return new RegExp(modelIdPatternFor(provider)).test(model);
}

/** Standardmodell des gewählten Anbieters aus der Datenbank. */
async function defaultModelFor(provider: string): Promise<string> {
  try {
    const rows = await restSelect<Array<{ model: string }>>(
      `cms_translation_provider_rates?provider=eq.${encodeURIComponent(provider)}&is_enabled=eq.true&is_default=eq.true&select=model&limit=1`,
    );
    return rows?.[0]?.model ?? FALLBACK_MODEL;
  } catch {
    return FALLBACK_MODEL;
  }
}

type Action =
  | "status"
  | "dry_run"
  | "start"
  | "step"
  | "worker"
  | "pause"
  | "resume"
  | "cancel"
  | "qa"
  | "sync_ui_catalog"
  | "ui_catalog_sync_capabilities"

  | "admin_unlock"
  | "admin_session"
  | "admin_lock"
  | "provider_keys"
  | "provider_key_save"
  | "provider_key_delete"
  | "provider_key_test"
  | "provider_models"
  | "locale_provider_set"
  | "run_switch_provider";
/**
 * Protokollstand des Katalogabgleichs. Datenbank und Serverdienst müssen
 * übereinstimmen; sonst wird nicht geschrieben (fail-closed).
 */
const UI_CATALOG_SYNC_PROTOCOL = 2;


/**
 * Aktionen, die eine echte Anmeldung mit Adminrolle verlangen.
 * Der No-Login-Arbeitsbereich darf diese Wege NICHT ausführen.
 */
const ADMIN_ACTIONS = new Set<Action>([
  "provider_keys",
  "provider_key_save",
  "provider_key_delete",
  "provider_key_test",
  "provider_models",
  "locale_provider_set",
  "run_switch_provider",
]);

interface Body {
  action?: Action;
  target_locale?: string;
  scope_kind?: "page" | "pages" | "locale";
  page_keys?: string[];
  provider?: string;
  model?: string;
  run_id?: string;
  batch_size?: number;
  lease_seconds?: number;
  authorization_code?: string;
  qa_limit?: number;
  /** false = nur der schnelle Grundstatus ohne schwere Sprachstand-Zahlen. */
  include_coverage?: boolean;
  refresh_coverage?: boolean;
  coverage_max_age_seconds?: number;
  /** Manifest der deutschen Bedienungstexte (nur für `sync_ui_catalog`). */
  manifest?: { version?: string; entries?: unknown[] };
  /** Nur für `sync_ui_catalog`: ohne Angabe reine Vorschau (kein Schreiben). */
  dry_run?: unknown;

  /** Kurzlebige, signierte Adminfreigabe für geschützte Aktionen. */
  admin_token?: string;
  /** Adminpasswort — nur auf dem Weg zum Server, nie zurück. */
  password?: string;
  /** Klartext-Schlüssel — nur auf dem Weg zum Tresor, nie zurück. */
  secret?: string;
  /** Sprache für die Anbieter-/Modellzuordnung. */
  locale?: string;
  /** Bestätigungswort der ausdrücklichen Umstellung eines pausierten Laufs. */
  confirm?: string;
}


function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGIN_EXACT.has(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function hasInternalProof(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return false;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const apikey = req.headers.get("apikey") ?? "";
  return bearer === serviceKey || apikey === serviceKey;
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

function subjectFor(req: Request, origin: string | null): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return `${origin ?? "no-origin"}|${ip || "no-ip"}`;
}

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

// ------------------------------------------------------------------ DB-Zugriff
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("db_not_configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[cms-translation-run] rpc ${fn} failed`, res.status, text);
    throw new Error(`rpc_failed:${fn}:${res.status}`);
  }
  return (await res.json()) as T;
}

async function restSelect<T = unknown>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("db_not_configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`select_failed:${res.status}`);
  return (await res.json()) as T;
}

async function restUpsert(table: string, rows: unknown[], onConflict?: string): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("db_not_configured");
  if (rows.length === 0) return;
  const query = onConflict ? `?on_conflict=${onConflict}` : "";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    console.error(`[cms-translation-run] upsert ${table} failed`, res.status, await res.text());
  }
}

async function rateLimit(
  bucket: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter: number; unavailable?: boolean }> {
  try {
    const out = await rpc<{ allowed?: boolean; retry_after?: number }>(
      "rpc_internal_rate_limit_hit",
      { p_bucket: bucket, p_subject: subject, p_limit: limit, p_window_seconds: windowSeconds },
    );
    return { allowed: out?.allowed !== false, retryAfter: Math.max(1, out?.retry_after ?? 60) };
  } catch {
    return { allowed: false, retryAfter: 60, unavailable: true };
  }
}

// ------------------------------------------------------- Adminschranke
/**
 * Adminschranke ohne Benutzerkonten.
 *
 * Es gibt in diesem Projekt ausdrücklich keine E-Mail-Anmeldung und keine
 * Selbstregistrierung. Der sensible Abschnitt „Schlüssel & Anbieter" wird mit
 * EINEM serverseitigen Adminpasswort entsperrt (Projekt-Geheimnis
 * `CMS_ADMIN_PASSWORD`, alternativ `CMS_ADMIN_PASSWORD_SHA256`). Der Vergleich
 * läuft laufzeitkonstant über SHA-256; das Passwort verlässt den Server nie.
 *
 * Nach erfolgreichem Vergleich stellt der Server eine kurzlebige, signierte
 * Sitzung aus (HMAC-SHA-256, 30 Minuten). Sie wird als HttpOnly-/Secure-/
 * SameSite-Cookie gesetzt und zusätzlich einmalig im Antwortkörper geliefert,
 * weil der Browser die Funktion über einen anderen Ursprung aufruft und
 * Cookies dort nicht mitgesendet werden. Der Client hält diesen Wert nur im
 * Arbeitsspeicher — kein localStorage, kein sessionStorage.
 */
const ADMIN_SESSION_TTL_SECONDS = 30 * 60;
const ADMIN_SESSION_COOKIE = "cms_admin_session";

function b64urlEncode(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += String.fromCharCode(b);
  return btoa(out).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().replace(/[^0-9a-f]/g, "");
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

/** Signierschlüssel der Adminsitzung — reines Servergeheimnis. */
async function adminSigningKey(): Promise<CryptoKey> {
  const secret = env("CMS_ADMIN_SESSION_SECRET") ?? env("CMS_ADMIN_PASSWORD") ?? SERVICE_KEY;
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`cms-admin|${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signAdminSession(nowSeconds = Math.floor(Date.now() / 1000)): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = nowSeconds + ADMIN_SESSION_TTL_SECONDS;
  const payload = b64urlEncode(
    new TextEncoder().encode(JSON.stringify({ v: 1, scope: "cms_admin", exp: expiresAt })),
  );
  const key = await adminSigningKey();
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  );
  return { token: `${payload}.${b64urlEncode(sig)}`, expiresAt };
}

async function verifyAdminSession(
  token: string,
): Promise<{ ok: true; expiresAt: number } | { ok: false; error: string }> {
  const parts = (token ?? "").split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: "admin_session_invalid" };
  let expected: Uint8Array;
  try {
    const key = await adminSigningKey();
    expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(parts[0])),
    );
  } catch {
    return { ok: false, error: "admin_session_invalid" };
  }
  let given: Uint8Array;
  try {
    given = b64urlDecode(parts[1]);
  } catch {
    return { ok: false, error: "admin_session_invalid" };
  }
  if (!timingSafeEqual(expected, given)) return { ok: false, error: "admin_session_invalid" };
  let payload: { exp?: number; scope?: string };
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
  } catch {
    return { ok: false, error: "admin_session_invalid" };
  }
  if (payload?.scope !== "cms_admin" || typeof payload.exp !== "number") {
    return { ok: false, error: "admin_session_invalid" };
  }
  if (payload.exp <= Math.floor(Date.now() / 1000)) return { ok: false, error: "admin_session_expired" };
  return { ok: true, expiresAt: payload.exp };
}

/** Prüft das eingegebene Adminpasswort laufzeitkonstant gegen das Servergeheimnis. */
async function checkAdminPassword(
  password: string,
): Promise<{ ok: true } | { ok: false; error: string; message: string; status: number }> {
  const hashHex = env("CMS_ADMIN_PASSWORD_SHA256");
  const plain = env("CMS_ADMIN_PASSWORD");
  if (!hashHex && !plain) {
    return {
      ok: false,
      status: 503,
      error: "admin_password_not_configured",
      message:
        "Das Adminpasswort ist auf dem Server noch nicht eingerichtet. Die Schlüsselverwaltung bleibt bis dahin geschlossen.",
    };
  }
  const candidate = await sha256Bytes(String(password ?? ""));
  const reference = hashHex ? hexToBytes(hashHex) : await sha256Bytes(plain as string);
  if (!timingSafeEqual(candidate, reference)) {
    return {
      ok: false,
      status: 401,
      error: "admin_password_invalid",
      message: "Das Adminpasswort stimmt nicht.",
    };
  }
  return { ok: true };
}

function readCookie(req: Request, name: string): string {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

function adminSessionCookie(token: string, maxAge: number): string {
  return `${ADMIN_SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None`;
}

/**
 * Verlangt eine gültige, signierte Adminsitzung. Ohne Entsperrung wird
 * abgelehnt — der No-Login-Arbeitsbereich kann diese Aktionen nicht ausführen.
 */
async function requireAdmin(
  req: Request,
  body: Body,
): Promise<{ ok: true; expiresAt: number } | { ok: false; status: number; error: string; message: string }> {
  const token = (body.admin_token ?? "").trim() || readCookie(req, ADMIN_SESSION_COOKIE);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "admin_unlock_required",
      message: "Bitte die Schlüsselverwaltung zuerst mit dem Adminpasswort entsperren.",
    };
  }
  const check = await verifyAdminSession(token);
  if (!check.ok) {
    return {
      ok: false,
      status: 401,
      error: check.error,
      message:
        check.error === "admin_session_expired"
          ? "Die Freigabe ist abgelaufen. Bitte erneut mit dem Adminpasswort entsperren."
          : "Die Freigabe ist ungültig. Bitte erneut mit dem Adminpasswort entsperren.",
    };
  }
  return { ok: true, expiresAt: check.expiresAt };
}


/**
 * Schlüssel eines Anbieters. Vorrang hat der verschlüsselte Tresor-Eintrag,
 * danach das Projekt-Geheimnis. Rückgabe verlässt den Server nie.
 */
async function providerSecret(provider: string, envName: string): Promise<string | undefined> {
  try {
    const vaulted = await rpc<string | null>("rpc_internal_provider_secret_get", { p_provider: provider });
    if (typeof vaulted === "string" && vaulted.trim()) return vaulted.trim();
  } catch {
    // Tresor nicht lesbar → Projekt-Geheimnis versuchen.
  }
  return env(envName);
}

// ------------------------------------------------------------- Provider-Schicht

interface ProviderResult {
  text: string;
  provider: string;
  model: string;
}

/**
 * Kontextlabel für das Modell. Berücksichtigt zusätzlich den Datenbereich,
 * damit Navigationsbeschriftungen kurz und Alternativtexte beschreibend
 * übersetzt werden.
 */
const CONTEXT_FOR_UNIT = (area: string, fieldKey: string): string => {
  if (area === "asset_alt") return "alt";
  if (area === "nav_label") return "label";
  if (area === "nav_description") return "body";
  if (area === "page_title") return "headline";
  const k = (fieldKey ?? "").toLowerCase();
  if (k.includes("alt")) return "alt";
  if (k.includes("headline") || k.includes("title")) return "headline";
  if (k.includes("subline") || k.includes("eyebrow")) return "subline";
  if (k.includes("cta")) return "cta";
  if (k.includes("label")) return "label";
  if (k.includes("text") || k.includes("description") || k.includes("intro")) return "body";
  return "generic";
};


function systemPrompt(context: string, target: string): string {
  return [
    "You are a professional translator (German, English, Polish, Dutch, Danish) for a B2B website of TCS AG, a manufacturer of building communication, access control and care-call systems.",
    "Translate the user's text faithfully and concisely. Keep brand names, product codes (e.g. DSI 110, FBI), placeholders like {{name}}, HTML tags and URLs unchanged.",
    "Match the register: headlines short and punchy, body copy clear and professional, CTAs imperative and short.",
    "Never add explanations, quotes or notes. Return ONLY the translated text.",
    `Text type: ${context}. Target language code: ${target}.`,
  ].join("\n");
}

function extractChatContent(json: unknown): string {
  const msg = (json as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]
    ?.message?.content;
  if (typeof msg === "string") return msg.trim();
  if (Array.isArray(msg)) {
    return msg
      .map((p) =>
        typeof p === "string"
          ? p
          : typeof (p as { text?: unknown })?.text === "string"
            ? (p as { text: string }).text
            : "",
      )
      .join("")
      .trim();
  }
  return "";
}

/**
 * Konfigurationsstatus der Anbieter — nur „ja/nein", niemals Werte.
 * Ein Anbieter gilt als eingerichtet, wenn ein Tresor-Eintrag ODER ein
 * Projekt-Geheimnis vorliegt. Zusätzlich werden die letzten vier Zeichen
 * und das Prüfergebnis des Tresor-Eintrags gemeldet (keine Klartextwerte).
 */
async function providerStatus() {
  let vaulted: Array<{
    provider?: string;
    last4?: string | null;
    updated_at?: string | null;
    last_test_at?: string | null;
    last_test_ok?: boolean | null;
    last_test_error?: string | null;
  }> = [];
  try {
    vaulted = (await rpc("rpc_internal_provider_credentials_status", {})) as typeof vaulted;
  } catch {
    vaulted = [];
  }
  const meta = (provider: string) => vaulted.find((v) => v.provider === provider);

  const base = [
    {
      provider: "lovable_ai",
      label: "Lovable AI Gateway (Standard)",
      configured: Boolean(env("LOVABLE_API_KEY")),
      secret: "LOVABLE_API_KEY",
      managed: true,
    },
    {
      provider: "google_gemini",
      label: "Google Gemini (eigener Schlüssel)",
      configured: Boolean(env("GOOGLE_GEMINI_API_KEY")),
      secret: "GOOGLE_GEMINI_API_KEY",
      managed: false,
    },
    {
      provider: "anthropic",
      label: "Anthropic Claude (eigener Schlüssel)",
      configured: Boolean(env("ANTHROPIC_API_KEY")),
      secret: "ANTHROPIC_API_KEY",
      managed: false,
    },
    {
      provider: "deepl",
      label: "DeepL API (eigener Schlüssel)",
      configured: Boolean(env("DEEPL_API_KEY")),
      secret: "DEEPL_API_KEY",
      managed: false,
    },
  ];

  return base.map((p) => {
    const m = meta(p.provider);
    return {
      ...p,
      configured: p.configured || Boolean(m),
      source: m ? ("vault" as const) : p.configured ? ("project_secret" as const) : ("none" as const),
      last4: m?.last4 ?? null,
      key_updated_at: m?.updated_at ?? null,
      last_test_at: m?.last_test_at ?? null,
      last_test_ok: m?.last_test_ok ?? null,
      last_test_error: m?.last_test_error ?? null,
    };
  });
}


class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status = 0,
  ) {
    super(message);
  }
}

/**
 * Lovable AI Gateway.
 * OpenAI-Modelle laufen über `/v1/responses` und werden immer gestreamt
 * (Denkschritte können Minuten dauern; gepufferte Aufrufe brechen ab).
 * Andere Anbieter im Gateway laufen über den Chat-Weg.
 */
async function translateWithLovable(
  text: string,
  target: string,
  context: string,
  model: string,
): Promise<ProviderResult> {
  const key = env("LOVABLE_API_KEY");
  if (!key) throw new ProviderError("provider_not_configured:lovable_ai", false);
  const isOpenAi = model.startsWith("openai/");

  const res = await fetch(
    isOpenAi
      ? "https://ai.gateway.lovable.dev/v1/responses"
      : "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify(
        isOpenAi
          ? {
              model,
              stream: true,
              instructions: systemPrompt(context, target),
              input: text,
              reasoning: { effort: "low", summary: "auto" },
            }
          : {
              model,
              messages: [
                { role: "system", content: systemPrompt(context, target) },
                { role: "user", content: text },
              ],
            },
      ),
    },
  );
  if (res.status === 429 || res.status >= 500) {
    throw new ProviderError(`gateway_transient:${res.status}`, true, res.status);
  }
  if (!res.ok) {
    throw new ProviderError(`gateway_error:${res.status}:${await res.text()}`, false, res.status);
  }

  let out = "";
  if (isOpenAi) {
    out = (await readResponsesStream(res)).trim();
  } else {
    out = extractChatContent(await res.json());
  }
  if (!out) throw new ProviderError("empty_translation", true);
  return { text: out, provider: "lovable_ai", model };
}

/** Liest die Ereignisse von `/v1/responses` und setzt den Antworttext zusammen. */
async function readResponsesStream(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new ProviderError("empty_translation", true);
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  let completed = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let evt: Record<string, unknown>;
      try {
        evt = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        continue;
      }
      const type = String(evt.type ?? "");
      if (type === "response.output_text.delta" && typeof evt.delta === "string") {
        out += evt.delta;
      } else if (type === "response.completed") {
        const r = evt.response as { output_text?: unknown } | undefined;
        if (typeof r?.output_text === "string") completed = r.output_text;
      } else if (type === "error" || type === "response.failed") {
        throw new ProviderError(`gateway_error:stream:${payload.slice(0, 300)}`, true);
      }
    }
  }
  return (out || completed).trim();
}


async function translateWithGemini(
  text: string,
  target: string,
  context: string,
  model: string,
): Promise<ProviderResult> {
  const key = await providerSecret("google_gemini", "GOOGLE_GEMINI_API_KEY");
  if (!key) throw new ProviderError("provider_not_configured:google_gemini", false);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(context, target) }] },
        contents: [{ role: "user", parts: [{ text }] }],
      }),
    },
  );
  if (res.status === 429 || res.status >= 500) {
    throw new ProviderError(`gemini_transient:${res.status}`, true, res.status);
  }
  if (!res.ok) throw new ProviderError(`gemini_error:${res.status}`, false, res.status);
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const out = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!out) throw new ProviderError("empty_translation", true);
  return { text: out, provider: "google_gemini", model };
}

async function translateWithAnthropic(
  text: string,
  target: string,
  context: string,
  model: string,
): Promise<ProviderResult> {
  const key = await providerSecret("anthropic", "ANTHROPIC_API_KEY");
  if (!key) throw new ProviderError("provider_not_configured:anthropic", false);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemPrompt(context, target),
      messages: [{ role: "user", content: text }],
    }),
  });
  if (res.status === 429 || res.status >= 500) {
    throw new ProviderError(`anthropic_transient:${res.status}`, true, res.status);
  }
  if (!res.ok) throw new ProviderError(`anthropic_error:${res.status}`, false, res.status);
  const json = (await res.json()) as { content?: Array<{ text?: string }> };
  const out = (json.content ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!out) throw new ProviderError("empty_translation", true);
  return { text: out, provider: "anthropic", model };
}

/** DeepL API (nicht „DeepL Translator"): unterstützt nicht jede Sprache. */
const DEEPL_TARGETS: Record<string, string> = {
  en: "EN-GB",
  pl: "PL",
  nl: "NL",
  da: "DA",
};

async function translateWithDeepl(text: string, target: string): Promise<ProviderResult> {
  const key = await providerSecret("deepl", "DEEPL_API_KEY");
  if (!key) throw new ProviderError("provider_not_configured:deepl", false);
  const targetCode = DEEPL_TARGETS[target];
  if (!targetCode) throw new ProviderError(`deepl_target_unsupported:${target}`, false);
  const endpoint = key.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `DeepL-Auth-Key ${key}` },
    body: JSON.stringify({ text: [text], source_lang: "DE", target_lang: targetCode }),
  });
  if (res.status === 429 || res.status >= 500) {
    throw new ProviderError(`deepl_transient:${res.status}`, true, res.status);
  }
  if (!res.ok) throw new ProviderError(`deepl_error:${res.status}`, false, res.status);
  const json = (await res.json()) as { translations?: Array<{ text?: string }> };
  const out = (json.translations?.[0]?.text ?? "").trim();
  if (!out) throw new ProviderError("empty_translation", true);
  return { text: out, provider: "deepl", model: "deepl-api" };
}

// -------------------------------------------- Anbieter mit eigenem Schlüssel
/** Anbieter, für die ein eigener Schlüssel verwaltet wird (nie `lovable_ai`). */
const MANAGED_PROVIDERS: Record<string, { label: string; secret: string }> = {
  google_gemini: { label: "Google Gemini", secret: "GOOGLE_GEMINI_API_KEY" },
  anthropic: { label: "Anthropic Claude", secret: "ANTHROPIC_API_KEY" },
  deepl: { label: "DeepL API", secret: "DEEPL_API_KEY" },
};

/** Konservativer, geprüfter Ersatzkatalog, falls die Anbieter-API ausfällt. */
const MODEL_FALLBACKS: Record<string, Array<{ model: string; label: string }>> = {
  google_gemini: [
    { model: "gemini-flash-latest", label: "Gemini Flash (aktuell)" },
    { model: "gemini-pro-latest", label: "Gemini Pro (aktuell)" },
  ],
  anthropic: [{ model: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" }],
  deepl: [{ model: "deepl-api", label: "DeepL API" }],
};

/**
 * Ermittelt die tatsächlich verfügbaren Modelle eines Anbieters serverseitig.
 * Google: nur Modelle, die `generateContent` unterstützen.
 * Anthropic: offizielle Modellliste.
 * DeepL: keine Modellauswahl.
 */
async function discoverProviderModels(
  provider: string,
): Promise<{ models: Array<{ model: string; label: string }>; source: "api" | "fallback" | "static"; message?: string }> {
  if (provider === "deepl") {
    return { models: MODEL_FALLBACKS.deepl, source: "static", message: "DeepL hat keine Modellauswahl." };
  }
  const key = await providerSecret(provider, MANAGED_PROVIDERS[provider]?.secret ?? "");
  if (!key) {
    return {
      models: [],
      source: "fallback",
      message: "Kein Schlüssel eingerichtet — es können keine Modelle abgefragt werden.",
    };
  }
  try {
    if (provider === "google_gemini") {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
        headers: { "x-goog-api-key": key },
      });
      if (!res.ok) throw new Error(`models_http_${res.status}`);
      const jsonBody = (await res.json()) as {
        models?: Array<{ name?: string; displayName?: string; supportedGenerationMethods?: string[] }>;
      };
      const models = (jsonBody.models ?? [])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m) => ({
          model: String(m.name ?? "").replace(/^models\//, ""),
          label: String(m.displayName ?? m.name ?? ""),
        }))
        .filter((m) => m.model.length > 0);
      if (models.length === 0) throw new Error("models_empty");
      return { models, source: "api" };
    }
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      });
      if (!res.ok) throw new Error(`models_http_${res.status}`);
      const jsonBody = (await res.json()) as { data?: Array<{ id?: string; display_name?: string }> };
      const models = (jsonBody.data ?? [])
        .map((m) => ({ model: String(m.id ?? ""), label: String(m.display_name ?? m.id ?? "") }))
        .filter((m) => m.model.length > 0);
      if (models.length === 0) throw new Error("models_empty");
      return { models, source: "api" };
    }
  } catch (err) {
    return {
      models: MODEL_FALLBACKS[provider] ?? [],
      source: "fallback",
      message: `Modellliste nicht abrufbar (${(err as Error).message}). Geprüfte Auswahl wird angeboten.`,
    };
  }
  return { models: [], source: "fallback", message: "Anbieter unbekannt." };
}

/** Minimaler echter Anbieter-Test mit einem kurzen Testsatz. */
async function testProviderKey(
  provider: string,
  model?: string,
): Promise<{ ok: boolean; message: string }> {
  const probe = "Guten Tag";
  try {
    if (provider === "deepl") {
      const out = await translateWithDeepl(probe, "en");
      return { ok: Boolean(out.text), message: "Verbindung erfolgreich." };
    }
    if (provider === "google_gemini") {
      const m = model || MODEL_FALLBACKS.google_gemini[0].model;
      const out = await translateWithGemini(probe, "en", "generic", m);
      return { ok: Boolean(out.text), message: "Verbindung erfolgreich." };
    }
    if (provider === "anthropic") {
      const m = model || MODEL_FALLBACKS.anthropic[0].model;
      const out = await translateWithAnthropic(probe, "en", "generic", m);
      return { ok: Boolean(out.text), message: "Verbindung erfolgreich." };
    }
    if (provider === "lovable_ai") {
      return {
        ok: Boolean(env("LOVABLE_API_KEY")),
        message: env("LOVABLE_API_KEY")
          ? "Lovable AI ist eingerichtet."
          : "Lovable AI ist nicht eingerichtet.",
      };
    }
    return { ok: false, message: "Unbekannter Anbieter." };
  } catch (err) {
    const raw = (err as Error).message ?? "";
    const friendly = raw.includes("provider_not_configured")
      ? "Für diesen Anbieter ist kein Schlüssel eingerichtet."
      : raw.includes("401") || raw.includes("403")
        ? "Der Schlüssel wurde vom Anbieter abgelehnt."
        : raw.includes("404")
          ? "Das gewählte Modell ist für diesen Schlüssel nicht verfügbar."
          : raw.includes("429")
            ? "Der Anbieter bremst gerade (Mengenbegrenzung). Später erneut testen."
            : `Test fehlgeschlagen (${raw}).`;
    return { ok: false, message: friendly };
  }
}


async function translateOnce(
  provider: string,
  model: string,
  text: string,
  target: string,
  context: string,
): Promise<ProviderResult> {
  switch (provider) {
    case "google_gemini":
      return translateWithGemini(text, target, context, model);
    case "anthropic":
      return translateWithAnthropic(text, target, context, model);
    case "deepl":
      return translateWithDeepl(text, target);
    default:
      return translateWithLovable(text, target, context, model);
  }
}

/** Retry mit exponentiellem Backoff, nur bei erkennbar vorübergehenden Fehlern. */
async function translateWithRetry(
  provider: string,
  model: string,
  text: string,
  target: string,
  context: string,
): Promise<ProviderResult> {
  const delays = [400, 1200, 3000];
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await translateOnce(provider, model, text, target, context);
    } catch (err) {
      lastError = err;
      const retryable = err instanceof ProviderError ? err.retryable : false;
      if (!retryable || attempt === delays.length) break;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastError;
}

// ------------------------------------------------------------------- Hilfsteile
export function scopeSignature(
  scopeKind: string,
  targetLocale: string,
  pageKeys: string[],
): string {
  if (scopeKind === "locale") return `locale:${targetLocale}:*`;
  const keys = [...new Set(pageKeys)].filter(Boolean).sort();
  return `${scopeKind}:${targetLocale}:${keys.join(",")}`;
}

async function costPer1kChars(provider: string, model: string): Promise<number> {
  try {
    const rows = await restSelect<Array<{ cost_per_1k_source_chars: number }>>(
      `cms_translation_provider_rates?provider=eq.${encodeURIComponent(provider)}&model=eq.${encodeURIComponent(model)}&select=cost_per_1k_source_chars`,
    );
    return Number(rows?.[0]?.cost_per_1k_source_chars ?? 0);
  } catch {
    return 0;
  }
}

/** Zeitfenster des serverseitigen Arbeiters (unter dem Plattform-Zeitlimit). */
const WORKER_WINDOW_MS = 40_000;
const WORKER_MAX_STEPS = 12;

/** Zeitplan der Nachschau einschalten (nur solange Läufe offen sind). */
async function armWorker(): Promise<void> {
  try {
    await rpc("rpc_internal_translation_worker_arm", {});
  } catch (err) {
    console.error("[cms-translation-run] arm failed", String((err as Error).message ?? err));
  }
}

/**
 * Ein idempotenter Arbeitsschritt eines gespeicherten Laufs.
 * Wird sowohl vom serverseitigen Arbeiter als auch von `step` benutzt.
 */
async function performStep(
  runId: string,
  batchSize: number,
  subject: string,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const next = await rpc<{
    error?: string;
    run?: {
      id: string;
      target_locale: string;
      provider: string;
      model: string;
      status: string;
      cost_estimate: number;
      cost_limit: number | null;
    };
    items?: Array<{
      area: string;
      ref_id: string | null;
      ref_key: string;
      page_key: string;
      section_key: string;
      unit_key: string;
      sort_a: string;
      sort_b: string;
      sort_c: string;
      source_text: string;
      source_hash: string;
      memory_text: string | null;
      /** Nur bei Automatik-Läufen: Kennung des gespeicherten Auftrags. */
      job_id?: string | null;
    }>;
    /** Nur bei Automatik-Läufen: geplante Aufträge, deren Ruhezeit noch läuft. */
    pending_later?: number;
    next_due_at?: string | null;
  }>("rpc_internal_translation_next_batch", { p_run_id: runId, p_limit: batchSize });

  if (next?.error || !next?.run) {
    return { status: 404, payload: { error: next?.error ?? "run_not_found" } };
  }
  const run = next.run;
  if (run.status === "paused" || run.status === "cancelled") {
    return {
      status: 200,
      payload: { run, items_processed: 0, finished: false, halted: run.status },
    };
  }

  const items = next.items ?? [];
  const pendingLater = next.pending_later ?? 0;
  if (items.length === 0 && pendingLater > 0) {
    // Entprellung: es sind Aufträge geplant, ihre Ruhezeit läuft aber noch.
    // Der Lauf bleibt offen, damit nur die letzte deutsche Fassung übersetzt wird.
    const out = await rpc<{ run?: unknown }>("rpc_internal_translation_progress", {
      p_run_id: run.id,
      p_done: 0,
      p_skipped: 0,
      p_failed: 0,
      p_model_calls: 0,
      p_memory_hits: 0,
      p_chars: 0,
      p_cost: 0,
      p_cursor_page_key: null,
      p_cursor_section_key: null,
      p_cursor_field_key: null,
      p_status: "running",
      p_error: null,
    });
    return {
      status: 200,
      payload: {
        run: out.run,
        items_processed: 0,
        finished: false,
        waiting_for_debounce: pendingLater,
        next_due_at: next.next_due_at ?? null,
      },
    };
  }
  if (items.length === 0) {
    // Keine fälligen Einheiten mehr: die Datenbank entscheidet, ob der Lauf
    // wirklich abgeschlossen ist (Bilanz erfüllt bzw. keine offenen Einheiten)
    // oder ob er mit zurückgesetztem Cursor weiterlaufen muss.
    const out = await rpc<{
      run?: { status?: string };
      open_units?: number;
      plan_reconciled?: number;
      rescan?: boolean;
    }>("rpc_internal_translation_progress", {
      p_run_id: run.id,
      p_done: 0,
      p_skipped: 0,
      p_failed: 0,
      p_model_calls: 0,
      p_memory_hits: 0,
      p_chars: 0,
      p_cost: 0,
      p_cursor_page_key: null,
      p_cursor_section_key: null,
      p_cursor_field_key: null,
      p_status: "done",
      p_error: null,
    });
    const settled = out.run?.status === "done";
    return {
      status: 200,
      payload: {
        run: out.run,
        items_processed: 0,
        finished: settled,
        open_units: out.open_units ?? 0,
        plan_reconciled: out.plan_reconciled ?? 0,
        rescan: Boolean(out.rescan),
      },
    };
  }



  const rate = await costPer1kChars(run.provider, run.model);
  const batchId = `run-${run.id.slice(0, 8)}-${Date.now()}`;

  let done = 0;
  let skipped = 0;
  let failed = 0;
  let modelCalls = 0;
  let memoryHits = 0;
  let chars = 0;
  let lastKey: { page: string; section: string; field: string } | null = null;
  let lastError: string | null = null;
  let hardStop: string | null = null;

  /**
   * Stabile Auftrags-Kennung je Texteinheit. Die Sortierschlüssel decken alle
   * Datenbereiche ab (Bausteinfeld, Seitentitel, Navigation, Alternativtext)
   * und sind gleichzeitig der Fortsetzungszeiger des Laufs.
   */
  const jobKeys = (item: { sort_a: string; sort_b: string; sort_c: string }) => ({
    page_key: item.sort_a,
    section_key: item.sort_b,
    field_key: item.sort_c,
  });

  /**
   * Ergebnis einer Texteinheit protokollieren.
   * - Automatik-Lauf: der bereits gespeicherte Auftrag wird abgeschlossen
   *   (`rpc_internal_translation_job_finish`) — es entsteht keine zweite
   *   Warteschlange und keine Doppelzeile.
   * - Übrige Läufe: bisheriges Protokoll je Stapel.
   */
  const recordJob = async (
    item: { job_id?: string | null; source_hash: string },
    keys: { page_key: string; section_key: string; field_key: string },
    status: "translated" | "failed" | "skipped_manual" | "memory_hit",
    error: string | null,
  ) => {
    if (item.job_id) {
      await rpc("rpc_internal_translation_job_finish", {
        p_job_id: item.job_id,
        p_status: status,
        p_error: error,
      });
      return;
    }
    await restUpsert(
      JOBS_TABLE,
      [
        {
          batch_id: batchId,
          run_id: run.id,
          ...keys,
          target_locale: run.target_locale,
          source_hash: item.source_hash,
          status,
          last_error: error,
        },
      ],
      JOBS_CONFLICT,
    );
  };

  for (const item of items) {
    const keys = jobKeys(item);

    // Sehr lange Quelltexte (z. B. Rechtstexte) werden an strukturellen Grenzen
    // segmentiert, segmentweise übersetzt und danach exakt zusammengesetzt.
    const seg =
      item.source_text.length > MAX_SOURCE_LENGTH
        ? segmentLongText(item.source_text, MAX_SOURCE_LENGTH)
        : { segments: [item.source_text], fits: true, longest: item.source_text.length };

    if (!seg.fits || seg.segments.length > MAX_SEGMENTS_PER_UNIT) {
      skipped++;
      lastKey = { page: keys.page_key, section: keys.section_key, field: keys.field_key };
      await recordJob(
        item,
        keys,
        "skipped_manual",
        seg.fits ? "source_text_too_many_segments" : "source_text_too_long",
      );
      continue;
    }

    // Kostenbremse serverseitig, vor jedem Modellaufruf.
    const projected = run.cost_estimate + ((chars + item.source_text.length) / 1000) * rate;
    if (run.cost_limit != null && projected > Number(run.cost_limit)) {
      hardStop = "cost_limit_reached";
      break;
    }

    let translated = (item.memory_text ?? "").trim();
    if (translated) {
      memoryHits++;
    } else {
      const dayBudget = await rateLimit(
        "cms_translation_model_day",
        subject,
        RATE_MODEL_DAY_LIMIT,
        RATE_MODEL_DAY_WINDOW,
      );
      if (!dayBudget.allowed) {
        hardStop = "daily_model_budget_reached";
        break;
      }
      try {
        const parts: string[] = [];
        for (const part of seg.segments) {
          if (part.trim() === "") {
            parts.push(part);
            continue;
          }
          const res = await translateWithRetry(
            run.provider,
            run.model,
            part.trim(),
            run.target_locale,
            CONTEXT_FOR_UNIT(item.area, item.unit_key),
          );
          parts.push(res.text);
          modelCalls++;
          chars += part.length;
        }
        translated =
          seg.segments.length === 1
            ? parts[0]
            : joinTranslatedSegments(seg.segments, parts);
      } catch (err) {
        failed++;
        lastError = String((err as Error).message ?? err);
        lastKey = { page: keys.page_key, section: keys.section_key, field: keys.field_key };
        await recordJob(item, keys, "failed", lastError.slice(0, 500));
        if (lastError.includes("provider_not_configured")) {
          hardStop = "provider_not_configured";
          break;
        }
        continue;
      }


      await restUpsert(
        "cms_translation_memory",
        [
          {
            source_locale: "de",
            target_locale: run.target_locale,
            source_hash: item.source_hash,
            source_text: item.source_text,
            target_text: translated,
            provider: run.provider,
            model: run.model,
            origin: "machine",
            status: "ok",
          },
        ],
        "source_hash,target_locale",
      );
    }

    // Schreibweg für ALLE Datenbereiche. Von Hand gepflegte Zieltexte werden
    // in der Datenbankfunktion abgewiesen (`skipped: manual_value`).
    const applied = await rpc<{
      success?: boolean;
      updated?: boolean;
      skipped?: string;
      error?: string;
    }>("rpc_internal_apply_machine_unit", {
      p_area: item.area,
      p_ref_id: item.ref_id,
      p_page_key: item.page_key,
      p_section_key: item.section_key,
      p_unit_key: item.unit_key,
      p_locale: run.target_locale,
      p_value: translated,
      p_source_hash: item.source_hash,
    });
    // Wichtig für ehrliche Zahlen: eine erfolgreiche Anwendung, die nichts
    // ändern musste (Zielwert war bereits identisch), ist verarbeitet und
    // darf nicht aus der Bilanz verschwinden.
    if (applied?.success && !applied?.skipped) done++;
    else if (applied?.skipped) skipped++;
    else {
      failed++;
      lastError = applied?.error ?? "apply_failed";
    }


    lastKey = { page: keys.page_key, section: keys.section_key, field: keys.field_key };

    await recordJob(
      item,
      keys,
      applied?.success ? (applied?.skipped ? "skipped_manual" : "translated") : "failed",
      applied?.success ? null : (applied?.error ?? "apply_failed"),
    );
  }

  const nextStatus = hardStop ? "paused" : "running";
  const out = await rpc<{ run?: unknown }>("rpc_internal_translation_progress", {
    p_run_id: run.id,
    p_done: done,
    p_skipped: skipped,
    p_failed: failed,
    p_model_calls: modelCalls,
    p_memory_hits: memoryHits,
    p_chars: chars,
    p_cost: Number(((chars / 1000) * rate).toFixed(6)),
    p_cursor_page_key: lastKey?.page ?? null,
    p_cursor_section_key: lastKey?.section ?? null,
    p_cursor_field_key: lastKey?.field ?? null,
    p_status: nextStatus,
    p_error: hardStop ?? lastError,
  });

  return {
    status: 200,
    payload: {
      run: out.run,
      items_processed: done + skipped + failed,
      done,
      skipped,
      failed,
      model_calls: modelCalls,
      memory_hits: memoryHits,
      batch_id: batchId,
      halted: hardStop,
      finished: false,
    },
  };
}

// ----------------------------------------------------------------------- Server
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = corsFor(origin);
  const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "db_not_configured" }, 500);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action = (body.action ?? "status") as Action;

  // Ursprungsprüfung. Ausnahme: der interne Zeitplan der Datenbank ruft
  // ausschließlich `worker` auf, hat keinen Ursprung und darf keine neuen
  // Aufträge anlegen — er arbeitet nur bereits freigegebene Läufe weiter.
  if (origin === null) {
    // Der Katalogabgleich läuft aus Server-/CI-Umgebungen ohne Ursprung. Er ist
    // ausschließlich über das Freigabewort `CMS_TRANSLATION_GLOBAL_TOKEN`
    // erlaubt (Prüfung weiter unten) — kein Service-Role im Aufrufer nötig.
    const tokenGatedNoOrigin =
      (action === "sync_ui_catalog" || action === "ui_catalog_sync_capabilities") &&
      Boolean(env("CMS_TRANSLATION_GLOBAL_TOKEN"));

    if (action !== "worker" && !tokenGatedNoOrigin && !hasInternalProof(req)) {
      return json({ error: "origin_required" }, 403);
    }
  } else if (!isAllowedOrigin(origin)) {
    return json({ error: "origin_not_allowed" }, 403);
  }

  const subject = subjectFor(req, origin);
  const targetLocale = String(body.target_locale ?? "").toLowerCase();
  const pageKeys = Array.isArray(body.page_keys)
    ? body.page_keys.filter((k) => typeof k === "string" && k.length > 0).slice(0, 500)
    : [];
  const scopeKind = body.scope_kind ?? (pageKeys.length === 1 ? "page" : "pages");
  const provider = String(body.provider ?? DEFAULT_PROVIDER);
  // Modell: entweder ausdrücklich gewählt (Preset oder eigene Kennung) oder der
  // in der Datenbank als Standard markierte Eintrag des Anbieters.
  const requestedModel = String(body.model ?? "").trim();
  const model = requestedModel || (await defaultModelFor(provider));
  if ((action === "dry_run" || action === "start") && !isValidModelId(model, provider)) {
    return json(
      {
        error: "model_id_invalid",
        message: `Die Modell-Kennung „${model}" ist nicht zulässig. ${modelIdHintFor(provider)}`,
        model_id_pattern: modelIdPatternFor(provider),
      },
      400,
    );
  }

  // Geschützte Adminaktionen: nur mit gültiger, signierter Adminfreigabe.
  if (ADMIN_ACTIONS.has(action)) {
    const guard = await requireAdmin(req, body);
    if (!guard.ok) {
      return json({ error: guard.error, message: guard.message }, guard.status);
    }
    const gate = await rateLimit("cms_provider_admin", subject, 30, 300);
    if (!gate.allowed) {
      return json(
        { error: "rate_limited", message: "Zu viele Schlüsselaktionen. Bitte kurz warten." },
        429,
        { "Retry-After": String(gate.retryAfter) },
      );
    }
  }

  try {
    // ------------------------------------------------------- admin_unlock
    // Entsperrt die Schlüsselverwaltung mit dem Adminpasswort. Kein Konto,
    // keine E-Mail. Bei Fehlversuchen greift eine Mengenbremse.
    if (action === "admin_unlock") {
      const gate = await rateLimit("cms_admin_unlock", subject, 10, 300);
      if (!gate.allowed) {
        return json(
          { unlocked: false, error: "rate_limited", message: "Zu viele Versuche. Bitte kurz warten." },
          429,
          { "Retry-After": String(gate.retryAfter) },
        );
      }
      const check = await checkAdminPassword(String(body.password ?? ""));
      if (!check.ok) {
        return json({ unlocked: false, error: check.error, message: check.message }, check.status);
      }
      const session = await signAdminSession();
      return json(
        {
          unlocked: true,
          expires_at: new Date(session.expiresAt * 1000).toISOString(),
          admin_token: session.token,
        },
        200,
        { "Set-Cookie": adminSessionCookie(session.token, ADMIN_SESSION_TTL_SECONDS) },
      );
    }

    // ------------------------------------------------------ admin_session
    // Prüft eine vorhandene Freigabe (Ablauf, Gültigkeit) — ohne Geheimnisse.
    if (action === "admin_session") {
      const guard = await requireAdmin(req, body);
      return json(
        guard.ok
          ? { unlocked: true, expires_at: new Date(guard.expiresAt * 1000).toISOString() }
          : {
              unlocked: false,
              reason: guard.error,
              message: guard.message,
              password_configured: Boolean(env("CMS_ADMIN_PASSWORD") || env("CMS_ADMIN_PASSWORD_SHA256")),
            },
        200,
      );
    }

    // --------------------------------------------------------- admin_lock
    if (action === "admin_lock") {
      return json({ unlocked: false }, 200, {
        "Set-Cookie": adminSessionCookie("", 0),
      });
    }


    // ------------------------------------------------------ provider_keys
    if (action === "provider_keys") {
      return json({ providers: await providerStatus() }, 200);
    }

    // -------------------------------------------------- provider_key_save
    if (action === "provider_key_save") {
      const p = String(body.provider ?? "").toLowerCase();
      if (!MANAGED_PROVIDERS[p]) {
        return json({ error: "provider_not_managed", message: "Für diesen Anbieter wird kein eigener Schlüssel verwaltet." }, 400);
      }
      const secret = String(body.secret ?? "");
      const out = await rpc<{ success?: boolean; error?: string; last4?: string }>(
        "rpc_internal_provider_secret_set",
        { p_provider: p, p_secret: secret, p_actor: null },
      );
      if (!out?.success) {
        return json(
          {
            error: out?.error ?? "save_failed",
            message:
              out?.error === "secret_too_short"
                ? "Der Schlüssel sieht nicht vollständig aus."
                : "Der Schlüssel konnte nicht gespeichert werden.",
          },
          400,
        );
      }
      return json({ success: true, provider: p, last4: out.last4, providers: await providerStatus() }, 200);
    }

    // ------------------------------------------------ provider_key_delete
    if (action === "provider_key_delete") {
      const p = String(body.provider ?? "").toLowerCase();
      if (!MANAGED_PROVIDERS[p]) return json({ error: "provider_not_managed" }, 400);
      await rpc("rpc_internal_provider_secret_delete", {
        p_provider: p,
        p_actor: null,
      });
      return json({ success: true, providers: await providerStatus() }, 200);
    }

    // -------------------------------------------------- provider_key_test
    if (action === "provider_key_test") {
      const p = String(body.provider ?? "").toLowerCase();
      if (!MANAGED_PROVIDERS[p]) return json({ error: "provider_not_managed" }, 400);
      const test = await testProviderKey(p, String(body.model ?? "").trim() || undefined);
      await rpc("rpc_internal_provider_test_record", {
        p_provider: p,
        p_ok: test.ok,
        p_error: test.ok ? null : test.message,
        p_actor: null,
      }).catch(() => undefined);
      return json({ success: test.ok, message: test.message, providers: await providerStatus() }, 200);
    }

    // ---------------------------------------------------- provider_models
    if (action === "provider_models") {
      const p = String(body.provider ?? "").toLowerCase();
      if (!MANAGED_PROVIDERS[p]) return json({ error: "provider_not_managed" }, 400);
      const found = await discoverProviderModels(p);
      if (found.models.length > 0) {
        await rpc("rpc_internal_provider_models_replace", {
          p_provider: p,
          p_models: found.models,
        }).catch((err) => console.error("[cms-translation-run] models_replace", (err as Error).message));
      }
      const rates = await restSelect<unknown[]>(
        `cms_translation_provider_rates?provider=eq.${encodeURIComponent(p)}&select=provider,model,label,is_default,is_enabled,requires_secret,basis_note&order=model`,
      );
      return json(
        { success: true, provider: p, source: found.source, message: found.message, models: found.models, rates },
        200,
      );
    }

    // ------------------------------------------------ locale_provider_set
    if (action === "locale_provider_set") {
      const p = String(body.provider ?? "").toLowerCase();
      const m = String(body.model ?? "").trim();
      const loc = String(body.locale ?? "").toLowerCase();
      // DeepL: immer der feste Vertrag. Sonst die Regel des Anbieters.
      const modelForProvider = canonicalModelFor(p, m);
      if (!isValidModelId(modelForProvider, p)) {
        return json(
          { error: "model_id_invalid", message: modelIdHintFor(p), model_id_pattern: modelIdPatternFor(p) },
          400,
        );
      }
      // Durchgängig der kanonische Wert — kein Rückfall auf den Rohwert.
      const test = await testProviderKey(p, hasNoModelChoice(p) ? undefined : modelForProvider);
      if (!test.ok) {
        return json({ error: "provider_test_failed", message: test.message }, 400);
      }
      const out = await rpc<{ success?: boolean; error?: string }>("rpc_internal_locale_provider_set", {
        p_locale: loc,
        p_provider: p,
        p_model: modelForProvider,
        p_actor: null,
      });
      if (!out?.success) return json({ error: out?.error ?? "save_failed" }, 400);
      return json({ success: true, locale: loc, provider: p, model: modelForProvider }, 200);
    }

    // ------------------------------------------------- run_switch_provider
    if (action === "run_switch_provider") {
      const runId = String(body.run_id ?? "");
      const p = String(body.provider ?? "").toLowerCase();
      const m = String(body.model ?? "").trim();
      if (!runId) return json({ error: "run_id_required" }, 400);
      if (body.confirm !== "UMSTELLEN") {
        return json(
          {
            error: "confirmation_required",
            message: "Bitte die Umstellung ausdrücklich bestätigen.",
          },
          400,
        );
      }
      // Dieselbe providerabhängige Modellregel wie bei dry_run/start.
      const switchModel = canonicalModelFor(p, m);
      if (!isValidModelId(switchModel, p)) {
        return json(
          { error: "model_id_invalid", message: modelIdHintFor(p), model_id_pattern: modelIdPatternFor(p) },
          400,
        );
      }
      const test = await testProviderKey(p, hasNoModelChoice(p) ? undefined : switchModel);
      if (!test.ok) return json({ error: "provider_test_failed", message: test.message }, 400);
      const out = await rpc<{ success?: boolean; error?: string; status?: string; run?: unknown }>(
        "rpc_internal_translation_run_switch_provider",
        { p_run_id: runId, p_provider: p, p_model: switchModel, p_actor: null },
      );
      if (!out?.success) {
        return json(
          {
            error: out?.error ?? "switch_failed",
            message:
              out?.error === "run_not_paused"
                ? `Nur ein pausierter Lauf kann umgestellt werden (aktuell: ${out?.status ?? "unbekannt"}).`
                : "Die Umstellung war nicht möglich.",
          },
          400,
        );
      }
      await armWorker();
      return json({ success: true, run: out.run }, 200);
    }


    // ------------------------------------------------------------- status
    if (action === "status") {
      // Sprachstand kommt aus der gespeicherten Zusammenfassung der Datenbank.
      // Ohne Zwischenspeicher müsste bei jedem Aufruf der komplette deutsche
      // Textbestand neu materialisiert werden (Zeitüberschreitung).
      //
      // Grundstatus (Sprachliste, Anbieter, Grenzen) und Sprachstand sind
      // bewusst entkoppelt: `include_coverage: false` liefert nur den schnellen
      // Grundstatus, und ein Fehler beim Sprachstand blockiert die Oberfläche
      // nie — er wird als `coverage_error` gemeldet.
      const maxAge = Number.isFinite(Number(body.coverage_max_age_seconds))
        ? Math.max(0, Math.min(86400, Number(body.coverage_max_age_seconds)))
        : 900;
      const wantCoverage = body.include_coverage !== false;
      let coverage: unknown = null;
      let coverageError: string | null = null;
      if (wantCoverage) {
        try {
          coverage = await rpc<unknown>("rpc_internal_translation_coverage_cached", {
            p_max_age_seconds: maxAge,
            p_force: body.refresh_coverage === true,
          });
        } catch (err) {
          coverage = null;
          coverageError = (err as Error).message || "coverage_unavailable";
          console.error("[cms-translation-run] coverage unavailable", coverageError);
        }
      }

      const rates = await restSelect<unknown[]>(
        "cms_translation_provider_rates?select=provider,model,label,currency,cost_per_1k_source_chars,is_default,is_enabled,requires_secret,basis_note&order=provider,model",
      );
      const locales = await restSelect<unknown[]>(
        "cms_locales?select=*&order=sort_order",
      );
      return json(
        {
          coverage,
          coverage_error: coverageError,
          rates,
          locales,
          providers: await providerStatus(),
          locale_configs: await restSelect<unknown[]>(
            "cms_locale_translation_config?select=locale,provider,model,verified_at,updated_at&order=locale",
          ).catch(() => []),

          global_authorization_configured: Boolean(env("CMS_TRANSLATION_GLOBAL_TOKEN")),
          limits: {
            max_items_per_step: MAX_ITEMS_PER_STEP,
            run_cost_limit_default: RUN_COST_LIMIT_DEFAULT,
            run_cost_limit_global: RUN_COST_LIMIT_GLOBAL,
            model_calls_per_day: RATE_MODEL_DAY_LIMIT,
          },
          model_id_pattern: MODEL_ID_PATTERN,
          model_id_hint: MODEL_ID_HINT,
          // Providerabhängige Regeln — die Oberfläche prüft genau dieselben.
          model_id_patterns: MODEL_ID_PATTERNS,
          model_id_hints: MODEL_ID_HINTS,
          default_model: await defaultModelFor(DEFAULT_PROVIDER),
        },
        200,
      );
    }

    // ------------------------------------------------------------ dry_run
    if (action === "dry_run") {
      if (!targetLocale || targetLocale === "de") {
        return json({ error: "target_locale_invalid" }, 400);
      }
      // Vorbereitung der Zielsprache läuft serverseitig mit (idempotent),
      // damit die Vorschau nie von einem Browserzustand abhängt.
      const dry = await rpc<Record<string, number | string>>(
        "rpc_internal_translation_prepare_and_dry_run",
        {
          p_target_locale: targetLocale,
          p_page_keys: scopeKind === "locale" ? null : pageKeys,
        },
      );
      if (dry && typeof dry.error === "string") {
        return json({ error: dry.error }, 400);
      }
      const rate = await costPer1kChars(provider, model);
      const uniqueChars = Number(dry?.chars_unique ?? 0);
      return json(
        {
          dry_run: dry,
          scope_kind: scopeKind,
          scope_signature: scopeSignature(scopeKind, targetLocale, pageKeys),
          estimate: {
            model_calls_expected: Math.max(
              0,
              Number(dry?.todo_unique ?? 0) - Number(dry?.memory_ready ?? 0),
            ),
            chars_billable: uniqueChars,
            cost_per_1k_source_chars: rate,
            currency: "EUR",
            cost_estimate: Number(((uniqueChars / 1000) * rate).toFixed(4)),
            is_estimate: true,
            // Für die Gateway-Modelle ist kein belastbarer Zeichenpreis gepflegt
            // (Abrechnung nach Token). Dann wird ehrlich „nicht verfügbar"
            // gemeldet statt einer Scheingenauigkeit.
            cost_available: rate > 0,
            model,
            provider,
            basis:
              rate > 0
                ? "Schätzung auf Basis der serverseitig gepflegten Kostensätze je 1.000 Quellzeichen."
                : "Kostenschätzung nicht verfügbar: Die Abrechnung läuft über Lovable-AI-Credits nach Token, nicht pro Zeichen.",
          },
        },
        200,
      );
    }

    // -------------------------------------------------------------- start
    if (action === "start") {
      if (!targetLocale || targetLocale === "de") {
        return json({ error: "target_locale_invalid" }, 400);
      }
      const limit = await rateLimit("cms_translation_start", subject, RATE_START_LIMIT, RATE_START_WINDOW);
      if (!limit.allowed) {
        return json(
          {
            error: limit.unavailable ? "rate_limit_unavailable" : "rate_limited",
            retry_after: limit.retryAfter,
            message: limit.unavailable
              ? "Schutzprüfung nicht möglich. Bitte später erneut versuchen."
              : `Zu viele Startversuche. Bitte ${limit.retryAfter} Sekunden warten.`,
          },
          limit.unavailable ? 503 : 429,
          { "Retry-After": String(limit.retryAfter) },
        );
      }

      if (scopeKind === "locale") {
        const token = env("CMS_TRANSLATION_GLOBAL_TOKEN");
        if (!token) {
          return json(
            {
              error: "global_authorization_not_configured",
              message:
                "Ein Lauf über eine komplette Sprache ist gesperrt, solange kein Freigabewort hinterlegt ist. Bitte das Secret CMS_TRANSLATION_GLOBAL_TOKEN in den Projekteinstellungen setzen.",
            },
            403,
          );
        }
        if (String(body.authorization_code ?? "") !== token) {
          return json(
            {
              error: "global_authorization_invalid",
              message: "Freigabewort für den Gesamtlauf ist falsch.",
            },
            403,
          );
        }
      } else if (pageKeys.length === 0) {
        return json({ error: "page_keys_required" }, 400);
      }

      // Auch der Start sichert die Vorbereitung selbst ab (idempotent).
      const dry = await rpc<Record<string, number | string>>(
        "rpc_internal_translation_prepare_and_dry_run",
        {
          p_target_locale: targetLocale,
          p_page_keys: scopeKind === "locale" ? null : pageKeys,
        },
      );
      if (dry && typeof dry.error === "string") {
        return json({ error: dry.error }, 400);
      }
      const rate = await costPer1kChars(provider, model);
      const costLimit = scopeKind === "locale" ? RUN_COST_LIMIT_GLOBAL : RUN_COST_LIMIT_DEFAULT;
      const estimate = (Number(dry?.chars_unique ?? 0) / 1000) * rate;
      if (estimate > costLimit) {
        return json(
          {
            error: "cost_limit_exceeded",
            message: `Geschätzte Kosten (${estimate.toFixed(2)} EUR) liegen über dem Limit von ${costLimit} EUR. Bitte den Umfang verkleinern.`,
            estimate,
            cost_limit: costLimit,
          },
          422,
        );
      }

      const started = await rpc<{ success?: boolean; run_id?: string; error?: string; reused?: boolean }>(
        "rpc_internal_translation_start_run",
        {
          p_target_locale: targetLocale,
          p_scope_kind: scopeKind,
          p_page_keys: scopeKind === "locale" ? [] : pageKeys,
          p_scope_signature: scopeSignature(scopeKind, targetLocale, pageKeys),
          p_provider: provider,
          p_model: model,
          p_dry_run: dry,
          p_limits: {
            max_items_per_step: MAX_ITEMS_PER_STEP,
            cost_limit: costLimit,
            cost_per_1k_source_chars: rate,
          },
          p_cost_limit: costLimit,
        },
      );
      if (!started?.success) {
        return json({ error: started?.error ?? "start_failed" }, 422);
      }
      // Serverseitige Nachschau einschalten: ab jetzt läuft die Verarbeitung
      // auch ohne offenen Browser weiter.
      await armWorker();
      return json({ run_id: started.run_id, reused: Boolean(started.reused), dry_run: dry }, 200);
    }

    // --------------------------------------------- pause / resume / cancel
    if (action === "pause" || action === "resume" || action === "cancel") {
      if (!body.run_id) return json({ error: "run_id_required" }, 400);

      // Fortsetzen geht über die eigene Funktion: sie prüft zuerst, ob wirklich
      // noch etwas offen ist, setzt die Suche zurück und gleicht sonst den Plan
      // sauber ab. So kann auch ein zu früh abgeschlossener Lauf weiterlaufen.
      if (action === "resume") {
        const res = await rpc<{
          success?: boolean;
          run?: unknown;
          error?: string;
          open_units?: number;
        }>("rpc_internal_translation_run_resume", { p_run_id: body.run_id });
        if (!res?.success) return json({ error: res?.error ?? "update_failed" }, 422);
        if ((res.open_units ?? 0) > 0) await armWorker();
        else await rpc("rpc_internal_translation_worker_disarm", {}).catch(() => undefined);
        return json({ run: res.run, open_units: res.open_units ?? 0 }, 200);
      }

      const status = action === "pause" ? "paused" : "cancelled";
      const out = await rpc<{ success?: boolean; run?: unknown; error?: string }>(
        "rpc_internal_translation_progress",
        {
          p_run_id: body.run_id,
          p_done: 0,
          p_skipped: 0,
          p_failed: 0,
          p_model_calls: 0,
          p_memory_hits: 0,
          p_chars: 0,
          p_cost: 0,
          p_cursor_page_key: null,
          p_cursor_section_key: null,
          p_cursor_field_key: null,
          p_status: status,
          p_error: null,
        },
      );
      if (!out?.success) return json({ error: out?.error ?? "update_failed" }, 422);
      await rpc("rpc_internal_translation_worker_disarm", {}).catch(() => undefined);
      return json({ run: out.run }, 200);
    }


    // ----------------------------------------------------------------- qa
    // ------------------------------- ui_catalog_sync_capabilities
    // Lesender Protokollnachweis VOR jedem Abgleich. Ein alter Serverdienst
    // kennt diese Aktion nicht — dann bricht das Aufrufskript ab, bevor
    // irgendetwas geschrieben wird (fail-closed). Es werden keine
    // Geheimnisse ausgegeben.
    if (action === "ui_catalog_sync_capabilities") {
      const capToken = env("CMS_TRANSLATION_GLOBAL_TOKEN");
      if (!capToken) {
        return json(
          {
            error: "global_authorization_not_configured",
            message:
              "Der Katalogabgleich ist gesperrt, solange kein Freigabewort hinterlegt ist.",
          },
          403,
        );
      }
      if (String(body.authorization_code ?? "") !== capToken) {
        return json(
          { error: "global_authorization_invalid", message: "Freigabewort ist falsch." },
          403,
        );
      }
      try {
        const caps = await rpc<Record<string, unknown>>(
          "rpc_admin_ui_catalog_sync_capabilities",
          {},
        );
        return json(
          { capabilities: caps, edge_protocol_version: UI_CATALOG_SYNC_PROTOCOL },
          200,
        );
      } catch (_err) {
        return json(
          {
            error: "db_protocol_unknown",
            message:
              "Die Datenbank kennt den Protokollstand des Katalogabgleichs nicht. Es wurde nichts geändert.",
            edge_protocol_version: UI_CATALOG_SYNC_PROTOCOL,
          },
          409,
        );
      }
    }

    // ------------------------------------------------- sync_ui_catalog

    // Geschützter Serverweg für den Abgleich des Bedienungstext-Katalogs.
    // Der schreibende RPC `rpc_admin_sync_ui_strings` bleibt in der Datenbank
    // service_role-only; nur dieser Dienst ruft ihn auf. Es wird kein
    // Übersetzungslauf gestartet und kein Zieltext überschrieben.
    if (action === "sync_ui_catalog") {
      const token = env("CMS_TRANSLATION_GLOBAL_TOKEN");
      if (!token) {
        return json(
          {
            error: "global_authorization_not_configured",
            message:
              "Der Katalogabgleich ist gesperrt, solange kein Freigabewort hinterlegt ist. Bitte das Secret CMS_TRANSLATION_GLOBAL_TOKEN in den Projekteinstellungen setzen.",
          },
          403,
        );
      }
      if (String(body.authorization_code ?? "") !== token) {
        return json(
          {
            error: "global_authorization_invalid",
            message: "Freigabewort für den Katalogabgleich ist falsch.",
          },
          403,
        );
      }
      const limit = await rateLimit(
        "cms_translation_ui_catalog_sync",
        subject,
        RATE_START_LIMIT,
        RATE_START_WINDOW,
      );
      if (!limit.allowed) {
        return json(
          {
            error: limit.unavailable ? "rate_limit_unavailable" : "rate_limited",
            retry_after: limit.retryAfter,
            message: limit.unavailable
              ? "Schutzprüfung nicht möglich. Bitte später erneut versuchen."
              : `Zu viele Abgleichversuche. Bitte ${limit.retryAfter} Sekunden warten.`,
          },
          limit.unavailable ? 503 : 429,
          { "Retry-After": String(limit.retryAfter) },
        );
      }
      const manifest = body.manifest;
      const entries = Array.isArray(manifest?.entries) ? manifest.entries : null;
      const version = String(manifest?.version ?? "").trim();
      if (!entries || entries.length === 0 || !version) {
        return json(
          {
            error: "manifest_invalid",
            message:
              "Das Manifest ist unvollständig. Erwartet werden eine Version und mindestens ein deutscher Bedienungstext.",
          },
          400,
        );
      }
      if (entries.length > 20000) {
        return json({ error: "manifest_too_large" }, 400);
      }
      // Standard ist die reine Vorschau. Nur ein ausdrückliches `false`
      // erlaubt das Schreiben; alles andere als boolean wird abgelehnt.
      let dryRun = true;
      if (body.dry_run !== undefined) {
        if (typeof body.dry_run !== "boolean") {
          return json(
            {
              error: "dry_run_invalid",
              message: "dry_run muss true oder false sein.",
            },
            400,
          );
        }
        dryRun = body.dry_run;
      }
      // Fail-closed vor dem Schreiben: der neue Dienst ruft eine alte
      // Datenbank nicht an. Der Protokollstand wird lesend geprüft.
      let caps: Record<string, unknown>;
      try {
        caps = await rpc<Record<string, unknown>>("rpc_admin_ui_catalog_sync_capabilities", {});
      } catch (_err) {
        return json(
          {
            error: "db_protocol_unknown",
            message:
              "Die Datenbank kennt den Protokollstand des Katalogabgleichs nicht. Es wurde nichts geändert.",
            edge_protocol_version: UI_CATALOG_SYNC_PROTOCOL,
          },
          409,
        );
      }
      if (Number(caps?.protocol_version) !== UI_CATALOG_SYNC_PROTOCOL) {
        return json(
          {
            error: "db_protocol_mismatch",
            message: `Protokollstand passt nicht (Datenbank ${String(caps?.protocol_version)}, Dienst ${UI_CATALOG_SYNC_PROTOCOL}). Es wurde nichts geändert.`,
            capabilities: caps,
            edge_protocol_version: UI_CATALOG_SYNC_PROTOCOL,
          },
          409,
        );
      }
      if (!dryRun && caps?.trigger_suppression_supported !== true) {
        return json(
          {
            error: "trigger_contract_missing",
            message:
              "Der Trigger-Vertrag für die Unterdrückung der Übersetzungsaufträge fehlt. Es wurde nichts geändert.",
            capabilities: caps,
          },
          409,
        );
      }
      const result = await rpc<Record<string, unknown>>("rpc_admin_sync_ui_strings", {
        p_manifest: { version, entries, dry_run: dryRun },
      });
      // Aussage nur über den eigenen Import in der Transaktion der
      // Datenbank. Es wird NICHT behauptet, dass außerhalb dieser
      // Transaktion keine Aufträge entstehen (z. B. gleichzeitige Redaktion).
      const applied = result?.applied === true;
      const ownImportSuppressed = result?.own_import_autopilot_suppressed === true;
      return json(
        {
          sync: result,
          dry_run: dryRun,
          own_import_autopilot_suppressed: applied ? ownImportSuppressed : true,
          run_started: applied ? !ownImportSuppressed : false,
          edge_protocol_version: UI_CATALOG_SYNC_PROTOCOL,
          capabilities: caps,
        },
        200,
      );


    }

    if (action === "qa") {
      if (!targetLocale || targetLocale === "de") {
        return json({ error: "target_locale_invalid" }, 400);
      }
      const report = await rpc<unknown>("rpc_internal_translation_qa", {
        p_target_locale: targetLocale,
        p_page_keys: scopeKind === "locale" ? null : pageKeys,
        p_limit: Math.min(Math.max(Number(body.qa_limit ?? 500), 1), 2000),
      });
      return json({ qa: report }, 200);
    }

    // --------------------------------------------------------------- step
    // Einzelschritt (Diagnose / manuelles Nachfassen). Die reguläre
    // Verarbeitung übernimmt der serverseitige Arbeiter (`worker`).
    if (action === "step") {
      if (!body.run_id) return json({ error: "run_id_required" }, 400);

      const stepLimit = await rateLimit("cms_translation_step", subject, RATE_STEP_LIMIT, RATE_STEP_WINDOW);
      if (!stepLimit.allowed) {
        return json(
          {
            error: stepLimit.unavailable ? "rate_limit_unavailable" : "rate_limited",
            retry_after: stepLimit.retryAfter,
            message: stepLimit.unavailable
              ? "Schutzprüfung nicht möglich. Lauf bleibt gespeichert und kann später fortgesetzt werden."
              : `Zu viele Arbeitsschritte. Bitte ${stepLimit.retryAfter} Sekunden warten — der Lauf bleibt gespeichert.`,
          },
          stepLimit.unavailable ? 503 : 429,
          { "Retry-After": String(stepLimit.retryAfter) },
        );
      }

      const batchSize = Math.min(Math.max(Number(body.batch_size ?? 10), 1), MAX_ITEMS_PER_STEP);
      const out = await performStep(String(body.run_id), batchSize, subject);
      await armWorker();
      return json(out.payload, out.status);
    }

    // ------------------------------------------------------------- worker
    // Serverseitiger Arbeiter: übernimmt einen offenen Lauf per Lease,
    // arbeitet ihn in kleinen Schritten innerhalb eines Zeitfensters weiter
    // und gibt den Lease danach frei. Keine rekursive Selbstaufruf-Kette:
    // der nächste Durchlauf kommt vom Zeitplan in der Datenbank.
    if (action === "worker") {
      const workerLimit = await rateLimit("cms_translation_worker", "scheduler", 4, 60);
      if (!workerLimit.allowed) {
        return json({ error: "worker_busy", retry_after: workerLimit.retryAfter }, 429, {
          "Retry-After": String(workerLimit.retryAfter),
        });
      }

      const leaseSeconds = Math.min(Math.max(Number(body.lease_seconds ?? 120), 60), 300);
      const claim = await rpc<{
        claimed?: boolean;
        lease_owner?: string;
        pending?: number;
        run?: { id: string; status: string };
      }>("rpc_internal_translation_worker_claim", { p_lease_seconds: leaseSeconds });

      if (!claim?.claimed || !claim.run || !claim.lease_owner) {
        const off = await rpc<unknown>("rpc_internal_translation_worker_disarm", {});
        return json({ claimed: false, pending: claim?.pending ?? 0, disarm: off }, 200);
      }

      const runId = claim.run.id;
      const owner = claim.lease_owner;
      const deadline = Date.now() + WORKER_WINDOW_MS;
      let steps = 0;
      let processed = 0;
      let finished = false;
      let halted: string | null = null;

      try {
        while (Date.now() < deadline && steps < WORKER_MAX_STEPS) {
          const out = await performStep(runId, MAX_ITEMS_PER_STEP, "worker");
          steps++;
          if (out.status !== 200) {
            halted = String((out.payload as { error?: string }).error ?? "step_failed");
            break;
          }
          const payload = out.payload as {
            items_processed?: number;
            finished?: boolean;
            halted?: string | null;
            run?: { status?: string };
          };
          processed += Number(payload.items_processed ?? 0);
          if (payload.finished) {
            finished = true;
            break;
          }
          if (payload.halted) {
            halted = payload.halted;
            break;
          }
          const status = payload.run?.status;
          if (status === "paused" || status === "cancelled" || status === "done") {
            halted = status;
            break;
          }
          await rpc("rpc_internal_translation_worker_heartbeat", {
            p_run_id: runId,
            p_lease_owner: owner,
            p_lease_seconds: leaseSeconds,
          });
        }
      } finally {
        await rpc("rpc_internal_translation_worker_release", {
          p_run_id: runId,
          p_lease_owner: owner,
        });
        // Zeitplan nur so lange behalten, wie tatsächlich Läufe offen sind.
        await rpc("rpc_internal_translation_worker_disarm", {});
      }

      return json(
        { claimed: true, run_id: runId, steps, items_processed: processed, finished, halted },
        200,
      );
    }


    return json({ error: "action_not_supported" }, 400);
  } catch (err) {
    const message = String((err as Error).message ?? err);
    console.error("[cms-translation-run] unexpected", message);
    return json({ error: "internal_error", message }, 500);
  }
});
