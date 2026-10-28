/**
 * Markenprofil des Datenblatts (nur lesend aus der externen Produktbasis).
 *
 * Quelle ist ausschließlich
 * `rpc_get_datasheet_brand_profile({ p_profile_key: 'tcs' })`. Die Antwort
 * kommt direkt als Objekt
 * `{ found, profile_key, company_name, logo_url, accent_color,
 *    footer_background, footer_text_color, address, phone, email, website,
 *    show_price, is_active }`.
 *
 * Regeln:
 * - Es wird ausschließlich der öffentliche (publishable) Produktclient
 *   verwendet — niemals ein service_role-Schlüssel.
 * - Akzeptiert wird nur `found === true`, `is_active === true` und exakt
 *   `profile_key === 'tcs'`. Alles andere blockiert den Druck; die Oberfläche
 *   zeigt eine verständliche Meldung mit Wiederholung.
 * - Farben, Footer und `show_price` stammen vollständig aus der Datenbank; es
 *   gibt keine eigenmächtige Preisfreigabe.
 * - Kurzer, begrenzter Cache (nur erfolgreiche Antworten).
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { isSupportedTemplate } from "@/shared/datasheet";
import type { DatasheetBrandProfile } from "@/shared/datasheet";

export const DATASHEET_BRAND_PROFILE_RPC = "rpc_get_datasheet_brand_profile" as const;
export const TCS_BRAND_PROFILE_KEY = "tcs" as const;

const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 4;

export type BrandProfileOutcome =
  | { readonly status: "ok"; readonly profile: DatasheetBrandProfile }
  /** Kein Profil unter diesem Schlüssel vorhanden. */
  | { readonly status: "missing" }
  /** Profil vorhanden, aber nicht aktiv. */
  | { readonly status: "inactive" }
  /** Profil vorhanden, aber fremder Schlüssel. */
  | { readonly status: "mismatch"; readonly profileKey: string | null }
  /** Profil ohne Vorlagenangabe. */
  | { readonly status: "templateMissing" }
  /** Fremde Vorlage oder nicht unterstützte Vorlagenversion. */
  | {
      readonly status: "templateUnsupported";
      readonly templateKey: string | null;
      readonly templateVersion: number | null;
    }
  /** Produktverbindung nicht konfiguriert. */
  | { readonly status: "unconfigured" }
  /** Technischer Fehler beim Lesen. */
  | { readonly status: "error"; readonly message: string };

const cache = new Map<string, { at: number; outcome: BrandProfileOutcome }>();

export function resetBrandProfileCache(): void {
  cache.clear();
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Vorlagenversion als Zahl; akzeptiert auch numerische Textwerte der DB. */
function versionOf(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function prune(now: number): void {
  for (const [key, entry] of cache) {
    if (now - entry.at >= CACHE_TTL_MS) cache.delete(key);
  }
  while (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Wertet die Rohantwort des RPC aus, ohne etwas zu erfinden. */
export function readBrandProfile(
  raw: unknown,
  expectedKey: string,
): BrandProfileOutcome {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return { status: "missing" };
  const rec = row as Record<string, unknown>;
  if (rec.found === false) return { status: "missing" };
  const profileKey = str(rec.profile_key);
  if (profileKey === null) return { status: "missing" };
  if (profileKey !== expectedKey) return { status: "mismatch", profileKey };
  if (rec.is_active !== true) return { status: "inactive" };

  // Nur die eine geprüfte Vorlage (`standard-product-sheet` v1) wird gerendert.
  const templateKey = str(rec.template_key);
  const templateVersion = versionOf(rec.template_version);
  if (!isSupportedTemplate({ template_key: templateKey, template_version: templateVersion })) {
    // Web Neu unterscheidet: gar keine Angabe vs. fremde Vorlage/Version.
    if (templateKey === null && templateVersion === null) {
      return { status: "templateMissing" };
    }
    return { status: "templateUnsupported", templateKey, templateVersion };
  }

  return {
    status: "ok",
    profile: {
      profile_key: profileKey,
      company_name: str(rec.company_name),
      logo_url: str(rec.logo_url),
      accent_color: str(rec.accent_color),
      secondary_accent_color: str(rec.secondary_accent_color),
      accent_text_color: str(rec.accent_text_color),
      template_key: templateKey,
      template_version: templateVersion,
      footer_background: str(rec.footer_background),
      footer_text_color: str(rec.footer_text_color),
      address: str(rec.address),
      phone: str(rec.phone),
      email: str(rec.email),
      website: str(rec.website),
      // Nur eine ausdrückliche Freigabe zählt als „ja".
      show_price: rec.show_price === true,
    },
  };
}

/** Liest das Markenprofil; erfolgreiche Antworten werden kurz zwischengespeichert. */
export async function loadDatasheetBrandProfile(
  profileKey: string = TCS_BRAND_PROFILE_KEY,
  options: { readonly signal?: AbortSignal; readonly force?: boolean } = {},
): Promise<BrandProfileOutcome> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };
  const now = Date.now();
  prune(now);
  if (!options.force) {
    const cached = cache.get(profileKey);
    if (cached && now - cached.at < CACHE_TTL_MS) return cached.outcome;
  }

  try {
    let query = supabase.rpc(DATASHEET_BRAND_PROFILE_RPC, {
      p_profile_key: profileKey,
    });
    if (options.signal) query = query.abortSignal(options.signal);
    const { data, error } = await query;
    if (error) throw error;
    const outcome = readBrandProfile(data, profileKey);
    if (outcome.status === "ok") cache.set(profileKey, { at: Date.now(), outcome });
    return outcome;
  } catch (err) {
    const rec = (err ?? {}) as Record<string, unknown>;
    const message =
      [str(rec.code), str(rec.message), str(rec.details)]
        .filter((part): part is string => part !== null)
        .join(" | ") || "unbekannter Datenbankfehler";
    return { status: "error", message };
  }
}
