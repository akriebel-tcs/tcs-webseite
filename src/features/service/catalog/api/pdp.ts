/**
 * Read-only API-Schicht für die Produktdetailseite (PDP).
 *
 * **Zentraler Ausgabekanal-Vertrag.** Alle Produktdaten des öffentlichen
 * Online-Produktkatalogs laufen ausschließlich über die Kanal-RPCs:
 *
 * - RPC `rpc_get_channel_product_listing('pdp_de', ...)` – Listing **und**
 *   Slug-Auflösung (Slug → Artikelnummer, kanalbegrenzt)
 * - RPC `rpc_get_channel_product_pdp('pdp_de', artikel_nr, locale)` – PDP
 *   (verwendet wird der enthaltene Wert `pdp`)
 * - RPC `rpc_get_channel_product_datasheet('datenblatt_de', artikel_nr, locale)`
 *   – Website-Datenblatt (verwendet wird der enthaltene Wert `datasheet`)
 * - View `api_v1_paket_komponenten` – Paketkomponenten
 *
 * Technische Daten kommen ausschließlich aus `pdp.technical_specs_display`.
 * Ein zusätzlicher Spec-RPC existiert nicht mehr (keine zweite Wahrheit).
 *
 * Verboten und entfernt: `api_v1_product_pdp`, `rpc_get_product_listing`,
 * `rpc_get_product_pdp`, `rpc_get_product_datasheet`, `product_pdp_view` und
 * jede andere breitere Produktquelle. Es gibt **keinen** stillen Fallback:
 * Artikel, die im Kanal nicht sichtbar sind, führen zu „nicht verfügbar"
 * bzw. 404. Keine hartkodierten Artikelnummern, keine BMEcat-Auswahl im
 * Frontend – Freigabe und Umfang kommen aus dem Datenbankvertrag.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabaseRecord } from "../types";
import {
  CATALOG_CHANNEL_KEY,
  DATASHEET_CHANNEL_KEY,
  getProductListing,
} from "./catalog";
import {
  normalizeProductLocale,
  readDeliveredLocale,
  type ProductLocaleResolution,
} from "../lib/productLocale";


const PDP_CHANNEL_RPC = "rpc_get_channel_product_pdp" as const;

const DATASHEET_CHANNEL_RPC = "rpc_get_channel_product_datasheet" as const;
const PAKET_KOMPONENTEN_VIEW = "api_v1_paket_komponenten" as const;

/**
 * Blockgröße der kanalbegrenzten Slug-Auflösung. Bewusst konservativ:
 * große Seiten laufen bei nicht-deutschen Sprachen in Statement-Timeouts.
 */
const SLUG_INDEX_PAGE_SIZE = 200;
/** Kanonische Sprache des sprachneutralen Slug-Index. */
const SLUG_INDEX_LOCALE = "de" as const;
const SLUG_INDEX_MAX_PAGES = 100;

/**
 * Format einer TCS-Artikelnummer (z. B. `ADA45015-0030`). Ist die Route
 * bereits eine Artikelnummer, braucht es keine Slug-Auflösung über das
 * Listing — die Sichtbarkeits-, Kanal- und `found`-Prüfung bleibt
 * vollständig beim PDP-Vertrag `rpc_get_channel_product_pdp`.
 */
const ARTIKEL_NR_PATTERN = /^[A-Z]{2,5}[0-9]{3,8}(?:-[0-9]{2,6})?$/;

export function isTcsArtikelNr(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return ARTIKEL_NR_PATTERN.test(value.trim().toUpperCase());
}

/** Normalform einer Artikelnummer für den PDP-Vertrag. */
export function normalizeArtikelNr(value: string): string {
  return value.trim().toUpperCase();
}

export interface PdpSlugRow extends SupabaseRecord {}

export interface PdpPayload extends SupabaseRecord {
  readonly found?: boolean | null;
}

export interface SlugResolveDiagnostics {
  readonly requestedRaw: string | null;
  readonly requestedNormalized: string | null;
  readonly pdpViewQueriesAttempted: readonly string[];
  readonly pdpViewMatchField: string | null;
  readonly pdpViewMatch: boolean;
  readonly artikelNr: string | null;
  readonly reason: string | null;
  /**
   * true, wenn die Auflösung an einem vorübergehenden Transportproblem
   * scheiterte (z. B. Statement-Timeout des Listings). Das ist KEIN
   * fachliches „Produkt nicht gefunden".
   */
  readonly transient?: boolean;
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizeSlug(slug: string | null | undefined): string | null {
  if (typeof slug !== "string") return null;
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  const trimmed = decoded.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Kanalbegrenzter Slug-Index (`pdp_slug` → `artikel_nr`). Quelle ist
 * ausschließlich `rpc_get_channel_product_listing` mit dem Kanalschlüssel,
 * damit ein nicht freigegebener Artikel auch über eine direkte PDP-URL
 * nicht auflösbar ist. Pro Locale einmal geladen und im Modul gehalten.
 */
const slugIndexCache = new Map<string, Promise<Map<string, string>>>();

async function loadChannelSlugIndex(
  locale: string,
): Promise<Map<string, string>> {
  const cached = slugIndexCache.get(locale);
  if (cached) return cached;

  const promise = (async () => {
    const index = new Map<string, string>();
    for (let page = 0; page < SLUG_INDEX_MAX_PAGES; page += 1) {
      const rows = await getProductListing({
        locale,
        limit: SLUG_INDEX_PAGE_SIZE,
        offset: page * SLUG_INDEX_PAGE_SIZE,
      });
      for (const row of rows) {
        const nr = readString(row.pdp_artikel_nr) ?? readString(row.artikel_nr);
        if (!nr) continue;
        const slug = readString(row.pdp_slug);
        if (slug) index.set(slug.toLowerCase(), nr);
        index.set(nr.toLowerCase(), nr);
      }
      if (rows.length < SLUG_INDEX_PAGE_SIZE) break;
    }
    return index;
  })();

  slugIndexCache.set(locale, promise);
  try {
    return await promise;
  } catch (err) {
    slugIndexCache.delete(locale);
    throw err;
  }
}

/**
 * Auflösung Slug → Artikelnummer, ausschließlich innerhalb des Kanals.
 * Keine Slug-Heuristik, kein Fallback auf eine breitere Produktquelle.
 */
export async function getArtikelNrBySlug(
  slug: string,
  locale: string = "de",
): Promise<string | null> {
  const result = await resolveArtikelNrBySlug(slug, locale);
  return result.artikelNr;
}

export async function resolveArtikelNrBySlug(
  slug: string,
  locale: string = "de",
): Promise<SlugResolveDiagnostics> {
  const requestedRaw = typeof slug === "string" ? slug : null;
  const normalized = normalizeSlug(slug);
  const attempted = [
    `rpc_get_channel_product_listing(${CATALOG_CHANNEL_KEY}).pdp_slug = ${normalized ?? ""}`,
    `rpc_get_channel_product_listing(${CATALOG_CHANNEL_KEY}).artikel_nr = ${normalized ?? ""}`,
  ];

  const base: SlugResolveDiagnostics = {
    requestedRaw,
    requestedNormalized: normalized,
    pdpViewQueriesAttempted: attempted,
    pdpViewMatchField: null,
    pdpViewMatch: false,
    artikelNr: null,
    reason: null,
  };

  if (!isSupabaseConfigured()) {
    return { ...base, reason: "supabase_not_configured", transient: true };
  }
  if (!normalized) {
    return { ...base, reason: "empty_slug" };
  }

  // Ist die Route bereits eine gültige TCS-Artikelnummer, wird sie direkt
  // verwendet. Kein Bypass: Sichtbarkeit, Kanalfreigabe und `found` prüft
  // weiterhin ausschließlich `rpc_get_channel_product_pdp`.
  if (isTcsArtikelNr(normalized)) {
    return {
      ...base,
      pdpViewMatchField: "artikel_nr",
      pdpViewMatch: true,
      artikelNr: normalizeArtikelNr(normalized),
      reason: "artikel_nr_from_route",
    };
  }



  // Slug und Artikelnummer sind sprachneutrale Kennungen. Die Auflösung
  // läuft deshalb zuerst über den kanonischen Index (de) und nur ergänzend
  // über die angefragte Sprache. So kann ein Sprachwechsel die Auflösung
  // nicht kippen, wenn das Listing einer Sprache gerade nicht antwortet.
  const requestedLocale = normalizeProductLocale(locale);
  const indexLocales =
    requestedLocale === SLUG_INDEX_LOCALE
      ? [SLUG_INDEX_LOCALE]
      : [SLUG_INDEX_LOCALE, requestedLocale];

  const key = normalized.toLowerCase();
  let nr: string | null = null;
  let anyIndexLoaded = false;
  for (const indexLocale of indexLocales) {
    let index: Map<string, string>;
    try {
      index = await loadChannelSlugIndex(indexLocale);
    } catch {
      continue;
    }
    anyIndexLoaded = true;
    nr = index.get(key) ?? null;
    if (nr) break;
  }

  if (!anyIndexLoaded) {
    return { ...base, reason: "channel_listing_unavailable", transient: true };
  }
  if (!nr) {
    return { ...base, reason: "not_visible_in_channel" };
  }


  return {
    ...base,
    pdpViewMatchField: nr.toLowerCase() === key ? "artikel_nr" : "pdp_slug",
    pdpViewMatch: true,
    artikelNr: nr,
    reason: "matched_in_channel_listing",
  };
}

/**
 * Vollständige PDP-Payload über `rpc_get_channel_product_pdp`. Verwendet
 * wird der enthaltene Wert `pdp`. Ist der Artikel im Kanal nicht sichtbar
 * (`ok = false`), liefert die Funktion `null` → „nicht verfügbar" / 404.
 */
export async function getProductPdp(
  artikelNr: string,
  locale: string,
): Promise<PdpPayload | null> {
  if (!isSupabaseConfigured()) return null;
  if (!artikelNr) return null;

  const { data, error } = await supabase.rpc(PDP_CHANNEL_RPC, {
    p_channel_key: CATALOG_CHANNEL_KEY,
    p_artikel_nr: artikelNr,
    p_locale: locale,
  });
  if (error) throw error;
  if (data === null || data === undefined) return null;

  const envelope = (Array.isArray(data) ? data[0] : data) as
    | (SupabaseRecord & { ok?: unknown; pdp?: unknown })
    | undefined;
  if (!envelope) return null;
  if (envelope.ok === false) return null;

  const pdp = envelope.pdp;
  if (!pdp || typeof pdp !== "object") return null;
  return withEnvelopeLocale(pdp as PdpPayload, envelope);
}

/**
 * Der äußere Kanal-Envelope trägt die tatsächlich gelieferte Sprache
 * (`locale` / `resolved_locale`). Sie wird als `delivered_locale` an die
 * innere Nutzlast geheftet, damit `resolveProductLocaleValue` einen
 * stillen Sprachwechsel (z. B. NL angefordert, DE geliefert) erkennt.
 * Eine bereits vorhandene innere Sprachangabe wird nicht überschrieben.
 */
function withEnvelopeLocale<T extends object>(
  payload: T,
  envelope: SupabaseRecord,
): T {
  const outer = readDeliveredLocale(envelope);
  if (!outer) return payload;
  const inner = readDeliveredLocale(payload);
  if (inner) return payload;
  return { ...payload, delivered_locale: outer } as T;
}


/**
 * Website-Datenblatt über `rpc_get_channel_product_datasheet` mit dem
 * Datenblatt-Kanal. Verwendet wird der enthaltene Wert `datasheet`; ohne
 * Kanalfreigabe wird `null` geliefert (kein Fallback).
 */
export async function getProductDatasheet(
  artikelNr: string,
  locale: string,
): Promise<unknown> {
  if (!isSupabaseConfigured()) return null;
  if (!artikelNr) return null;

  const { data, error } = await supabase.rpc(DATASHEET_CHANNEL_RPC, {
    p_channel_key: DATASHEET_CHANNEL_KEY,
    p_artikel_nr: artikelNr,
    p_locale: locale,
  });
  if (error) throw error;
  if (data === null || data === undefined) return null;

  const envelope = (Array.isArray(data) ? data[0] : data) as
    | (SupabaseRecord & { ok?: unknown; datasheet?: unknown })
    | undefined;
  if (!envelope) return null;
  if (envelope.ok === false) return null;
  const datasheet = envelope.datasheet ?? null;
  if (!datasheet || typeof datasheet !== "object") return datasheet;
  return withEnvelopeLocale(datasheet as Record<string, unknown>, envelope);
}

/**
 * PDP in der angeforderten Sprache — **genau ein** Aufruf von
 * `rpc_get_channel_product_pdp` mit der normalisierten Seitensprache.
 *
 * Der Kanalvertrag löst den Rückfall bereits feldweise auf
 * (angefordert → en → de) und meldet weiterhin die angefragte Sprache.
 * Deshalb gibt es hier keine clientseitige Sprachprobe und keine globale
 * Herabstufung der Seitensprache: `resolvedLocale` ist immer die
 * angeforderte Sprache, `usedFallback` immer `false`.
 */
export async function loadProductPdpLocalized(
  artikelNr: string,
  locale: string,
): Promise<ProductLocaleResolution<PdpPayload>> {
  const requested = normalizeProductLocale(locale);
  const value = await getProductPdp(artikelNr, requested);
  return requestedOnlyResolution(value, requested);
}

/** Datenblatt: identischer Vertrag, genau ein Aufruf mit derselben Sprache. */
export async function loadProductDatasheetLocalized(
  locale: string,
  artikelNr: string,
): Promise<ProductLocaleResolution<Record<string, unknown>>> {
  const requested = normalizeProductLocale(locale);
  const raw = await getProductDatasheet(artikelNr, requested);
  const value =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  return requestedOnlyResolution(value, requested);
}

function requestedOnlyResolution<T>(
  value: T | null,
  requested: string,
): ProductLocaleResolution<T> {
  return {
    value,
    requestedLocale: requested,
    resolvedLocale: requested,
    usedFallback: false,
    attempted: [requested],
  };
}


export interface PaketKomponente extends SupabaseRecord {
  readonly paket_artikel_nr?: string | null;
  readonly rolle?: string | null;
  readonly resolved_artikel_nr?: string | null;
  readonly resolved_title?: string | null;
  readonly anzahl?: number | null;
}

/**
 * Aktive Paketkomponenten ausschließlich aus `api_v1_paket_komponenten`.
 * Read-only. Es wird keine Frontend-Heuristik für Pakete eingeführt.
 */
export async function getPaketKomponenten(
  paketArtikelNr: string,
): Promise<PaketKomponente[]> {
  if (!isSupabaseConfigured()) return [];
  if (!paketArtikelNr) return [];
  const { data, error } = await supabase
    .from(PAKET_KOMPONENTEN_VIEW)
    .select("*")
    .eq("paket_artikel_nr", paketArtikelNr);
  if (error) throw error;
  return (data ?? []) as PaketKomponente[];
}
