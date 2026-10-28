/**
 * Etappe I.8 — DE→EN / DE→PL Übersetzungsvorschlag pro Feld.
 *
 * Nutzt den Lovable AI Gateway (kein zusätzlicher API-Key nötig).
 * Wird vom Admin-Editor pro Feld auf Knopfdruck aufgerufen und liefert nur
 * einen Vorschlag zurück — gespeichert wird ausschließlich im Admin.
 *
 * Sicherheits-Nacharbeit (PL-Pilot):
 * - serverseitige, atomare Mengenbremse über die interne DB-Funktion
 *   `public.rpc_internal_rate_limit_hit` (nur service_role, Zähler liegt im
 *   nicht exponierten Schema `cms_internal`),
 * - harte Payload-Grenzen (nur de→en/pl, Länge, bekannte Kontexte,
 *   Ablehnung technischer/sprachneutraler Werte),
 * - CORS nur für die bekannten Projekt-/Preview-Ursprünge. Origin ist KEINE
 *   Authentifizierung, sondern nur Missbrauchs-Reduktion. Die vollständige
 *   Auth-/Rollenprüfung bleibt der Auth-Etappe vorbehalten.
 *
 * Eingabe: { source_text, source_locale: "de", target_locale: "en"|"pl", context? }
 * Ausgabe: { translated_text, model } | { error, message }
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";

// ---------------------------------------------------------------- Grenzwerte
/** Versuche je Ursprung+IP in einem kurzen Fenster (normaler Redaktionsfluss). */
const RATE_BURST_LIMIT = 30;
const RATE_BURST_WINDOW_SECONDS = 60;
/** Zusätzliche Tagesobergrenze je Ursprung+IP (Massenlauf-Schutz). */
const RATE_DAY_LIMIT = 600;
const RATE_DAY_WINDOW_SECONDS = 24 * 60 * 60;
/** Maximale Zeichenlänge eines Quelltexts. */
const MAX_SOURCE_LENGTH = 4000;

const ALLOWED_SOURCE_LOCALES = ["de"] as const;
const ALLOWED_TARGET_LOCALES = ["en", "pl"] as const;
const ALLOWED_CONTEXTS = [
  "headline",
  "subline",
  "body",
  "cta",
  "alt",
  "label",
  "generic",
] as const;

/** Projekt-Kennung dieses Projekts — Preview-Ursprünge müssen sie enthalten. */
const PROJECT_ID = "244ceaa8-da87-42eb-90d8-045b23513c76";

/**
 * Erlaubte Ursprünge: veröffentlichte Seite, Projekt-Preview, lokale
 * Entwicklung. Bewusst KEINE breiten Muster für beliebige
 * `*.lovableproject.com` / `*.lovable.dev` — nur projektgebundene Hosts.
 */
const PROJECT_SLUG = "tcs-webseite-db-cms";
const ALLOWED_ORIGIN_EXACT = new Set([
  `https://${PROJECT_SLUG}.lovable.app`,
  `https://preview--${PROJECT_SLUG}.lovable.app`,
  `https://id-preview--${PROJECT_SLUG}.lovable.app`,
  `https://id-preview--${PROJECT_ID}.lovable.app`,
  `https://${PROJECT_ID}.lovableproject.com`,
  `https://preview--${PROJECT_ID}.lovable.app`,
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
]);
/**
 * Projektgebundene Preview-Varianten: der Host muss mit der Projekt-Kennung
 * enden bzw. sie als eigenes Label tragen (z. B.
 * `id-preview--<projekt-id>.lovable.app`, `<projekt-id>.lovableproject.com`).
 */
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  new RegExp(`^https://[a-z0-9-]*${PROJECT_ID}\\.lovable\\.app$`, "i"),
  new RegExp(`^https://[a-z0-9-]*${PROJECT_ID}\\.lovableproject\\.com$`, "i"),
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGIN_EXACT.has(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

/**
 * Originlose Aufrufe (Server/Skript/curl) sind nur mit dem bereits
 * vorhandenen internen Service-Role-Nachweis erlaubt. Es wird KEIN neues
 * Geheimnis eingeführt und nichts an den Client gegeben.
 */
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
    // Nur echte, bekannte Ursprünge erhalten eine Freigabe.
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? (origin as string) : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

interface TranslateRequest {
  source_text?: string;
  source_locale?: string;
  target_locale?: string;
  context?: string;
}

function buildSystemPrompt(context: string): string {
  return [
    "You are a professional translator (German, English, Polish) for a B2B website of TCS AG, a manufacturer of building communication, access control and care-call systems.",
    "Translate the user's text faithfully and concisely. Keep brand names, product codes (e.g. DSI 110, FBI), and technical abbreviations unchanged.",
    "Match the register: headlines short and punchy, body copy clear and professional, CTAs imperative and short.",
    "Never add explanations, never add quotes around the translation, never add a translator's note.",
    "Return ONLY the translated text, nothing else.",
    `The text type is: ${context}.`,
  ].join("\n");
}

// Abgestimmt mit der Modellliste des Übersetzungswerkzeugs
// (`cms_translation_provider_rates`): Gemini 3.6 Flash für die Masse,
// Gemini 3.1 Flash Lite als Ersatz bei leerer Antwort. Beide laufen über den
// Chat-Weg des Gateways.
const PRIMARY_MODEL = "google/gemini-3.6-flash";
const FALLBACK_MODEL = "google/gemini-3.1-flash-lite";

/** Holt den Text robust aus der Gateway-Antwort (String oder Content-Parts). */
function extractContent(json: unknown): string {
  const msg = (json as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;
  if (typeof msg === "string") return msg.trim();
  if (Array.isArray(msg)) {
    return msg
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof (part as { text?: unknown })?.text === "string"
            ? (part as { text: string }).text
            : "",
      )
      .join("")
      .trim();
  }
  return "";
}

/**
 * Sprachneutrale/technische Werte werden nicht übersetzt: URLs, Pfade,
 * E-Mail/Telefon, Farbwerte, Icon-/Slug-Kennungen, Zahlen, Schalterwerte.
 */
function isTechnicalValue(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (/^(https?:\/\/|mailto:|tel:|\/|#|www\.)/i.test(t)) return true;
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return true;
  if (/^[\d\s.,:+()/-]+$/.test(t)) return true;
  if (/^(true|false|on|off|ja|nein|yes|no|null|none)$/i.test(t)) return true;
  // Einzelner Token ohne Leerzeichen, der wie eine Kennung aussieht
  // (icon-name, section_key, some.path) → keine Übersetzung.
  if (!/\s/.test(t) && /^[a-z0-9]+([._-][a-z0-9]+)+$/i.test(t)) return true;
  return false;
}

/** Belastbare Absender-Kennung: IP-Kette aus dem Edge-Proxy + Ursprung. */
function subjectFor(req: Request, origin: string | null): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return `${origin ?? "no-origin"}|${ip || "no-ip"}`;
}

/** Atomarer Mengen-Check in der Datenbank. Fehlt der Zugang → ablehnen. */
async function rateLimitCheck(
  subject: string,
): Promise<{ allowed: boolean; retryAfter: number; error?: string }> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return { allowed: false, retryAfter: 60, error: "rate_limit_unavailable" };
  }

  const call = async (bucket: string, limit: number, windowSeconds: number) => {
    const res = await fetch(`${url}/rest/v1/rpc/rpc_internal_rate_limit_hit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_bucket: bucket,
        p_subject: subject,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      }),
    });
    if (!res.ok) {
      console.error("[cms-translate-field] rate limit rpc failed", res.status, await res.text());
      return null;
    }
    return (await res.json()) as { allowed?: boolean; retry_after?: number };
  };

  const burst = await call(
    "cms_translate_field_burst",
    RATE_BURST_LIMIT,
    RATE_BURST_WINDOW_SECONDS,
  );
  if (!burst) return { allowed: false, retryAfter: 60, error: "rate_limit_unavailable" };
  if (burst.allowed === false) {
    return { allowed: false, retryAfter: Math.max(1, burst.retry_after ?? 60) };
  }

  const day = await call("cms_translate_field_day", RATE_DAY_LIMIT, RATE_DAY_WINDOW_SECONDS);
  if (!day) return { allowed: false, retryAfter: 60, error: "rate_limit_unavailable" };
  if (day.allowed === false) {
    return { allowed: false, retryAfter: Math.max(1, day.retry_after ?? 3600) };
  }

  return { allowed: true, retryAfter: 0 };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = corsFor(origin);
  const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }
  // Browser-Aufrufe müssen von einem bekannten Projekt-Ursprung kommen.
  // Originlose Aufrufe nur mit internem Service-Role-Nachweis.
  // Beides ist Missbrauchsbegrenzung, KEIN Auth-Ersatz.
  if (origin === null) {
    if (!hasInternalProof(req)) {
      return json({ error: "origin_required" }, 403);
    }
  } else if (!isAllowedOrigin(origin)) {
    return json({ error: "origin_not_allowed" }, 403);
  }


  let body: TranslateRequest;
  try {
    body = (await req.json()) as TranslateRequest;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ error: "invalid_body" }, 400);
  }

  const sourceText = typeof body.source_text === "string" ? body.source_text.trim() : "";
  const sourceLocale = String(body.source_locale ?? "").toLowerCase();
  const targetLocale = String(body.target_locale ?? "").toLowerCase();
  const context = String(body.context ?? "generic").toLowerCase();

  if (!sourceText) {
    return json({ error: "source_text_required" }, 400);
  }
  if (sourceText.length > MAX_SOURCE_LENGTH) {
    return json({ error: "source_text_too_long", max: MAX_SOURCE_LENGTH }, 400);
  }
  if (!(ALLOWED_SOURCE_LOCALES as readonly string[]).includes(sourceLocale)) {
    return json(
      { error: "source_locale_not_allowed", supported: ALLOWED_SOURCE_LOCALES },
      400,
    );
  }
  if (!(ALLOWED_TARGET_LOCALES as readonly string[]).includes(targetLocale)) {
    return json(
      { error: "target_locale_not_allowed", supported: ALLOWED_TARGET_LOCALES },
      400,
    );
  }
  if (!(ALLOWED_CONTEXTS as readonly string[]).includes(context)) {
    return json({ error: "context_not_allowed", supported: ALLOWED_CONTEXTS }, 400);
  }
  if (isTechnicalValue(sourceText)) {
    return json(
      {
        error: "source_text_not_translatable",
        message:
          "Dieser Wert ist sprachneutral oder technisch (z. B. Link, Kennung, Zahl) und wird nicht übersetzt.",
      },
      422,
    );
  }

  // Mengenbremse: atomar in der Datenbank, nicht im Frontend.
  const subject = subjectFor(req, origin);
  const limit = await rateLimitCheck(subject);
  if (!limit.allowed) {
    if (limit.error === "rate_limit_unavailable") {
      return json(
        {
          error: "rate_limit_unavailable",
          message: "Schutzprüfung nicht möglich. Bitte später erneut versuchen.",
        },
        503,
        { "Retry-After": String(limit.retryAfter) },
      );
    }
    return json(
      {
        error: "rate_limited",
        retry_after: limit.retryAfter,
        message: `Zu viele Übersetzungsanfragen. Bitte ${limit.retryAfter} Sekunden warten.`,
      },
      429,
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return json({ error: "ai_gateway_not_configured" }, 500);
  }

  const userPrompt =
    `Translate this from ${sourceLocale.toUpperCase()} to ${targetLocale.toUpperCase()}:\n\n${sourceText}`;

  const callGateway = (model: string) =>
    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(context) },
          { role: "user", content: userPrompt },
        ],
      }),
    });

  try {
    let usedModel = PRIMARY_MODEL;
    let aiRes = await callGateway(usedModel);

    if (aiRes.status === 429) {
      const retryAfter = Number(aiRes.headers.get("retry-after") ?? "30") || 30;
      return json(
        {
          error: "rate_limited",
          retry_after: retryAfter,
          message: "Der Übersetzungsdienst ist gerade überlastet. Bitte kurz warten.",
        },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }
    if (aiRes.status === 402) {
      return json(
        {
          error: "credits_exhausted",
          message: "Lovable AI Credits aufgebraucht. Bitte im Workspace nachladen.",
        },
        402,
      );
    }
    if (aiRes.status === 403) {
      return json(
        {
          error: "ai_blocked",
          message: "Lovable AI ist für diesen Workspace gesperrt. Bitte Einstellungen prüfen.",
        },
        403,
      );
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("[cms-translate-field] gateway error", aiRes.status, text);
      return json({ error: "gateway_error", status: aiRes.status }, 502);
    }

    let payload = await aiRes.json();
    let translated = extractContent(payload);

    // Manche Modelle liefern (z. B. bei Reasoning-Abbruch) eine leere Antwort.
    // Dann einmal mit dem Fallback-Modell erneut versuchen, statt sofort 502.
    if (!translated) {
      console.warn(
        "[cms-translate-field] empty content from",
        usedModel,
        "finish_reason:",
        payload?.choices?.[0]?.finish_reason,
      );
      usedModel = FALLBACK_MODEL;
      aiRes = await callGateway(usedModel);
      if (aiRes.ok) {
        payload = await aiRes.json();
        translated = extractContent(payload);
      } else {
        console.error("[cms-translate-field] fallback failed", aiRes.status, await aiRes.text());
      }
    }

    if (!translated) {
      return json(
        {
          error: "empty_translation",
          message: "Das Übersetzungsmodell hat keinen Text geliefert. Bitte erneut versuchen.",
        },
        502,
      );
    }

    return json({ translated_text: translated, model: usedModel }, 200);
  } catch (err) {
    console.error("[cms-translate-field] unexpected", err);
    return json(
      { error: "internal_error", message: String((err as Error).message ?? err) },
      500,
    );
  }
});
