/**
 * Read-only API-Schicht für den Online-Produktkatalog.
 *
 * Etappe `catalog-supabase-readonly-1`: strikt am Datenvertrag der externen
 * TCS-Supabase-DB ausgerichtet. Erlaubte Quellen:
 *
 * - View  `api_v1_products_catalog`         – öffentliche Produktliste
 * - RPC   `rpc_get_product_listing(...)`    – serverseitiges Listing
 * - View  `product_filter_options_view`     – Filteroptionen
 * - View  `catalog_navigation_groups`       – Navigation (Gruppen)
 * - View  `catalog_navigation_group_items`  – Navigation (Items)
 * - RPC   `rpc_get_catalog_context()`       – Kontext / Pagination-Defaults
 *
 * Verboten (und in dieser Etappe entfernt): direkter Zugriff auf
 * `product_catalog_view`, `product_pdp_view`, `column_presets`,
 * `column_preset_columns`, `product_column_definitions`, `article_images`,
 * `image_artikel`, `document_artikel`. Keine Schreiboperationen, keine
 * Slug-/Klassifikations-Heuristik im Frontend.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  normalizeProductLocale,
  readDeliveredLocale,
} from "../lib/productLocale";

import type {
  CatalogContext,
  CatalogProduct,
  FilterOptionRow,
} from "../types";

const CATALOG_VIEWS = {
  productsCatalog: "api_v1_products_catalog",
  productFilterOptionsView: "product_filter_options_view",
  navigationGroups: "catalog_navigation_groups",
  navigationGroupItems: "catalog_navigation_group_items",
  /**
   * Öffentliche Navigations-View (1 Zeile je nav_slug). Liefert seit
   * Etappe „serien-chips" die Spalten `applicable_filters`,
   * `primary_filters` und `category_slugs` direkt aus der Produkt-DB.
   */
  apiNavigation: "product_catalog_navigation_view",
  /** Serien-Filter pro Kategorie (zweite Filterstufe). */
  apiSeriesByCategory: "api_v1_filter_series_by_category",
  /**
   * Pro-Serien-Facetten (true/false-Counts pro boolescher Facette). Liefert
   * `ip_gateway_counts` als Objekt mit den Schlüsseln `"true"`/`"false"`,
   * beide immer gesetzt — auch bei Count 0. Quelle für die DB-First-
   * Darstellung der booleschen Filter-Pills (statt clientseitiger
   * Rekonstruktion aus der Trefferliste).
   */
  apiFacetsBySerie: "api_v1_filter_facets_by_serie",
  /** Farbzuordnung je Artikel (read-only, mehrere Farben pro Artikel möglich). */
  apiProductColors: "api_v1_product_colors",
  /** Globale Farbdefinitionen inkl. `hex_code` und `product_count`. */
  apiProductColorFacets: "api_v1_product_color_facets",

} as const;

const CATALOG_RPCS = {
  getCatalogContext: "rpc_get_catalog_context",
  /**
   * Zentraler Ausgabekanal-Vertrag: Listing/Suche/Filter des öffentlichen
   * Online-Produktkatalogs laufen ausschließlich über die Kanal-RPC.
   * Es gibt **keinen** Fallback auf `rpc_get_product_listing` oder eine
   * andere, breitere Produktquelle.
   */
  getChannelProductListing: "rpc_get_channel_product_listing",
  /**
   * Sprachvertrag der Filter: liefert `field_key`, `field_label`,
   * `option_key` (technischer Wert), `option_label` (Anzeige),
   * `option_count`, `sort_order`, `hex_code` sowie `requested_locale` /
   * `resolved_locale`.
   */
  getLocalizedFilterOptions: "rpc_get_localized_filter_options",
  /**
   * Serienfamilien der zweiten Auswahlstufe. Wahrheit für Gruppierung,
   * Labels, Artikelzahlen und Reihenfolge liegt vollständig in der
   * Produktdatenbank; das Frontend gruppiert nichts selbst.
   */
  getChannelSerieFamilies: "rpc_get_channel_serie_families",
} as const;


/**
 * Kanalschlüssel des öffentlichen Online-Produktkatalogs (Website/PDP).
 * Freigabe und Umfang kommen ausschließlich aus dem Datenbankvertrag.
 */
export const CATALOG_CHANNEL_KEY = "pdp_de" as const;

/** Kanalschlüssel für das Website-Datenblatt eines Produkts. */
export const DATASHEET_CHANNEL_KEY = "datenblatt_de" as const;

export const CATALOG_PAGE_LIMIT = 1000 as const;

/**
 * Lokale-Code (ISO 639-1 Basis) für die RPCs des Datenvertrags.
 *
 * Der Katalog reicht die aktuelle Website-Sprache 1:1 als `p_locale` an die
 * Produktdatenbank durch — auch Sprachen, für die dort noch keine freigegebene
 * Übersetzung existiert (z. B. `pl`). Die Produktdatenbank liefert in diesem
 * Fall selbst den deutschen Ausgangswert zurück. Damit erscheinen freigegebene
 * Produktübersetzungen automatisch, sobald sie in der Produktdatenbank
 * freigegeben sind — und es wird kein Produkttext in CMS-Light kopiert.
 */
export type CatalogLocale = string;

/** Delegiert an den zentralen Produkt-Locale-Normalizer (eine Wahrheit). */
export function normalizeLocale(input: string | undefined | null): CatalogLocale {
  return normalizeProductLocale(input);
}

/**
 * Wirksame Listing-Sprache.
 *
 * Die Produktbasis löst den Sprachvertrag inzwischen **serverseitig** auf:
 * `rpc_get_channel_product_listing` erhält `p_locale` unverändert und
 * liefert je Feld die Kette angefordert → `en` → `de`. Der Client darf
 * deshalb eine korrekt angeforderte Sprache **nicht** wegen einzelner
 * zurückgefallener Felder global auf Deutsch umschalten. Es gibt keine
 * clientseitige Sprachprobe mehr.
 */
export interface ListingLocaleResolution {
  readonly requestedLocale: string;
  readonly effectiveLocale: string;
  readonly usedFallback: boolean;
  readonly attempted: readonly string[];
}

export function resolveListingLocale(
  requested: string | undefined | null,
): ListingLocaleResolution {
  const requestedLocale = normalizeLocale(requested);
  return {
    requestedLocale,
    effectiveLocale: requestedLocale,
    usedFallback: false,
    attempted: [requestedLocale],
  };
}

/**
 * Listing im zentralen Ausgabevertrag.
 *
 * Die angeforderte Sprache wird unverändert (nur normalisiert) an die
 * Kanal-RPC übergeben. Meldet die Antwort selbst eine andere gelieferte
 * Sprache (`resolved_locale` / `locale`), wird das nach außen gemeldet —
 * ohne die Abfrage zu wiederholen und ohne eine Sprachmischung je Zeile.
 */
export async function getProductListingLocalized(
  params: ProductListingParams,
): Promise<{
  readonly products: CatalogProduct[];
  readonly locale: ListingLocaleResolution;
}> {
  const requestedLocale = normalizeLocale(params.locale);
  const products = await getProductListing({
    ...params,
    locale: requestedLocale,
  });
  const delivered = readDeliveredLocale(products[0] ?? null);
  const effectiveLocale = delivered ?? requestedLocale;
  return {
    products,
    locale: {
      requestedLocale,
      effectiveLocale,
      usedFallback: effectiveLocale !== requestedLocale,
      attempted: [requestedLocale],
    },
  };
}


/**
 * Optionale Filterparameter für `rpc_get_product_listing`. Die Schlüssel
 * entsprechen 1:1 dem Datenvertrag; das Frontend reicht nur durch.
 */
export interface ProductListingParams {
  readonly locale: CatalogLocale;
  /**
   * Optionales Abbruchsignal. Wird eine Kategorie oder die Sprache gewechselt,
   * bricht die überholte Abfrage ab, statt im Hintergrund weiterzulaufen.
   * Geht nicht in den Bündelungsschlüssel ein.
   */
  readonly signal?: AbortSignal;
  readonly limit?: number;
  readonly offset?: number;
  readonly search?: string | null;
  readonly system_typ?: string | null;
  readonly paket_klasse?: string | null;
  readonly montageart?: string | null;
  readonly drahtanzahl?: string | null;
  readonly ip_gateway?: boolean | null;
  readonly has_image?: boolean | null;
  readonly has_documents?: boolean | null;
  readonly has_technical_specs?: boolean | null;
  readonly wohneinheiten_min?: number | null;
  readonly wohneinheiten_max?: number | null;
  readonly category_slugs?: readonly string[] | null;
  /**
   * Multi-Select-Serien (zweite Filterstufe). Wird 1:1 als `p_series`
   * (`text[]`) an die RPC durchgereicht. Whitelist liegt serverseitig.
   */
  readonly series?: readonly string[] | null;
  readonly bauform?: string | null;
  readonly module_role?: string | null;
  readonly accessory_type?: string | null;
  readonly component_role?: string | null;
  readonly anschluss_modes?: readonly string[] | null;
  readonly smartstick_possible?: boolean | null;
  readonly paket_filter?: string | null;
  readonly wohneinheiten_mode?: string | null;
  readonly sort_col?: string | null;
  readonly sort_dir?: string | null;
  readonly tastenanzahl?: number | null;
  /**
   * Farbfilter (Etappe `catalog-color-filter-1`). Wird 1:1 als optionaler
   * Named-Parameter `p_color` an den Kanalvertrag durchgereicht. Gültige
   * Werte sind die `color_key`-Werte der Produktdatenbank
   * (`api_v1_product_colors` / `api_v1_product_color_facets`).
   */
  readonly color?: string | null;
}


/** Ruft `rpc_get_catalog_context()`. Read-only. */
export async function getCatalogContext(): Promise<CatalogContext> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase.rpc(CATALOG_RPCS.getCatalogContext);
  if (error) throw error;
  return (data as CatalogContext) ?? null;
}

/**
 * Größe der Nachladeschritte, wenn die Produktbasis eine große Abfrage mit
 * `57014` (statement timeout) abbricht. Das Ergebnis bleibt identisch: es
 * werden dieselben Zeilen in derselben Sortierung, nur in Teilstücken
 * geladen. Es wird nichts in der Produktbasis verändert.
 */
const LISTING_CHUNK_SIZE = 200;
/** Obergrenze für das seitenweise Nachladen (entspricht dem Client-Limit). */
const LISTING_MAX_ROWS = 1000;

/** Abbruch durch überholte Anfrage (Kategorie-/Sprachwechsel). */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const rec = error as { name?: unknown; code?: unknown; message?: unknown };
  if (rec.name === "AbortError") return true;
  const msg = typeof rec.message === "string" ? rec.message.toLowerCase() : "";
  return rec.code === "20" || msg.includes("abort");
}

function abortError(): Error {
  const err = new Error("aborted");
  err.name = "AbortError";
  return err;
}

/**
 * Lesbare Fehlerbeschreibung einer Produktbasis-Antwort für Anzeige und
 * Protokoll: `code`, `message`, `details`, `hint`. Enthält bewusst keine
 * Zugangsdaten, Kopfzeilen oder vollständigen Adressen.
 */
export function describeDbError(error: unknown): string {
  if (error === null || error === undefined) return "unbekannter Fehler";
  if (typeof error === "string") return redactSensitiveErrorText(error);
  if (typeof error !== "object") return String(error);
  const rec = error as Record<string, unknown>;
  const parts: string[] = [];
  const push = (label: string, value: unknown) => {
    if (typeof value === "string" && value.trim() !== "") {
      parts.push(`${label}: ${redactSensitiveErrorText(value.trim())}`);
    } else if (typeof value === "number") {
      parts.push(`${label}: ${value}`);
    }
  };
  push("code", rec.code);
  push("message", rec.message);
  push("details", rec.details);
  push("hint", rec.hint);
  if (parts.length === 0 && error instanceof Error) {
    return redactSensitiveErrorText(error.message || error.name);
  }
  // Unbekannte Objekte werden niemals serialisiert: Response-/Request-
  // Objekte können Kopfzeilen oder Zugangsdaten enthalten.
  if (parts.length === 0) return "unbekannter Datenbankfehler";
  return parts.join(" | ");
}

function redactSensitiveErrorText(value: string): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(
      /\b(authorization|access_token|refresh_token|api[_-]?key|apikey|password|passwd|secret|token)\s*[:=]\s*(?:Bearer\s+)?([^\s,;&]+)/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/gi,
      "$1[REDACTED]@",
    )
    .replace(
      /([?&](?:access_token|refresh_token|api[_-]?key|apikey|password|passwd|secret|token)=)[^&#\s]*/gi,
      "$1[REDACTED]",
    );
}

function isStatementTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const rec = error as { code?: unknown; message?: unknown };
  if (rec.code === "57014") return true;
  return (
    typeof rec.message === "string" &&
    rec.message.toLowerCase().includes("statement timeout")
  );
}

function listingRpcArgs(
  params: ProductListingParams,
  overrides: { limit?: number | null; offset?: number | null } = {},
): Record<string, unknown> {
  return {
    p_channel_key: CATALOG_CHANNEL_KEY,
    p_locale: params.locale,
    p_limit: overrides.limit ?? params.limit ?? null,
    p_offset: overrides.offset ?? params.offset ?? null,
    p_search: params.search ?? null,
    p_system_typ: params.system_typ ?? null,
    p_paket_klasse: params.paket_klasse ?? null,
    p_montageart: params.montageart ?? null,
    p_drahtanzahl: params.drahtanzahl ?? null,
    p_ip_gateway: params.ip_gateway ?? null,
    p_has_image: params.has_image ?? null,
    p_has_documents: params.has_documents ?? null,
    p_has_technical_specs: params.has_technical_specs ?? null,
    p_wohneinheiten_min: params.wohneinheiten_min ?? null,
    p_wohneinheiten_max: params.wohneinheiten_max ?? null,
    p_category_slugs: params.category_slugs ?? null,
    p_series: params.series ?? null,
    p_bauform: params.bauform ?? null,
    p_module_role: params.module_role ?? null,
    p_accessory_type: params.accessory_type ?? null,
    p_component_role: params.component_role ?? null,
    p_anschluss_modes: params.anschluss_modes ?? null,
    p_smartstick_possible: params.smartstick_possible ?? null,
    p_paket_filter: params.paket_filter ?? null,
    p_wohneinheiten_mode: params.wohneinheiten_mode ?? null,
    // Beim seitenweisen Nachladen muss die Sortierung stabil sein, sonst
    // könnten sich Zeilen zwischen den Teilstücken verschieben.
    p_sort_col: params.sort_col ?? (overrides.limit != null ? "artikel_nr" : null),
    p_sort_dir: params.sort_dir ?? (overrides.limit != null ? "asc" : null),
    p_tastenanzahl: params.tastenanzahl ?? null,
    p_color: params.color ?? null,
  };
}

async function callListing(
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<CatalogProduct[]> {
  const query = supabase.rpc(CATALOG_RPCS.getChannelProductListing, args);
  const { data, error } = await (signal
    ? query.abortSignal(signal)
    : query);
  if (error) throw error;
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]) as CatalogProduct[];
}

/**
 * Listing über `rpc_get_channel_product_listing` mit dem Kanalschlüssel des
 * öffentlichen Online-Produktkatalogs. Reicht alle bekannten Filter durch
 * (alle optional). Kein Fallback auf eine breitere Produktquelle.
 *
 * Bricht die Produktbasis eine große Abfrage mit `57014` (statement timeout)
 * ab — bei übersetzten Sprachen tritt das ab etwa 1.000 Zeilen auf —, wird
 * dieselbe Abfrage seitenweise in Schritten von `LISTING_CHUNK_SIZE`
 * nachgeladen. Andere Fehler werden unverändert geworfen.
 */
export async function getProductListing(
  params: ProductListingParams,
): Promise<CatalogProduct[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    return await callListing(listingRpcArgs(params), params.signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (!isStatementTimeout(error)) throw error;
  }

  const max = Math.min(params.limit ?? LISTING_MAX_ROWS, LISTING_MAX_ROWS);
  const startOffset = params.offset ?? 0;
  const rows: CatalogProduct[] = [];
  for (let loaded = 0; loaded < max; loaded += LISTING_CHUNK_SIZE) {
    const size = Math.min(LISTING_CHUNK_SIZE, max - loaded);
    if (params.signal?.aborted) throw abortError();
    const chunk = await callListing(
      listingRpcArgs(params, { limit: size, offset: startOffset + loaded }),
      params.signal,
    );
    rows.push(...chunk);
    if (chunk.length < size) break;
  }
  return rows;
}

/* ─────────────── Begrenztes Wiederholen + Anfrage-Bündelung ─────────────── */

/**
 * Vorübergehende Fehler der Produktbasis (z. B. `57014` statement timeout,
 * abgebrochene Verbindung). Nur solche Fehler werden wiederholt; fachliche
 * Fehler (fehlende Rechte, falscher Parameter) werden unverändert geworfen.
 */
function isTransientProductDbError(error: unknown): boolean {
  if (isAbortError(error)) return false;
  if (isStatementTimeout(error)) return true;
  if (!error || typeof error !== "object") return false;
  const rec = error as { code?: unknown; message?: unknown };
  const msg =
    typeof rec.message === "string" ? rec.message.toLowerCase() : "";
  return (
    rec.code === "08006" ||
    rec.code === "53300" ||
    rec.code === "" ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("timeout")
  );
}

const RETRY_DELAYS_MS = [600, 1800] as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Führt eine lesende Produktbasis-Abfrage aus und wiederholt sie bei
 * vorübergehenden Fehlern **begrenzt** (maximal zwei Wiederholungen mit
 * Wartezeit). Kein Dauer-Polling, keine neue Abfrageart.
 */
export async function withLimitedRetry<T>(
  run: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (signal?.aborted) throw abortError();
    try {
      return await run();
    } catch (error) {
      lastError = error;
      // Abbruch ist kein Fehlversuch: keine Wiederholung, kein Retry-Sturm.
      if (isAbortError(error)) throw error;
      if (!isTransientProductDbError(error)) throw error;
      const wait = RETRY_DELAYS_MS[attempt];
      if (wait === undefined) break;
      await delay(wait);
    }
  }
  throw lastError;
}

interface ListingCacheEntry {
  readonly at: number;
  promise: Promise<CatalogProduct[]>;
  readonly controller: AbortController;
  subscribers: number;
  settled: boolean;
}

const listingShared = new Map<string, ListingCacheEntry>();
/**
 * Kurze Gültigkeit: verhindert, dass mehrere Blöcke derselben Seite dieselbe
 * Liste gleichzeitig oder unmittelbar hintereinander erneut anfordern
 * (Hauptursache der Zeitüberschreitungen). Es wird **keine** zusätzliche
 * Abfrage eingeführt, nur identische zusammengeführt.
 */
const LISTING_SHARED_TTL_MS = 30_000;
/** Harte Obergrenze gegen unbegrenzte Filter-/Suchkombinationen im SPA-Cache. */
const LISTING_SHARED_MAX_ENTRIES = 32;

function listingCacheKey(params: ProductListingParams): string {
  return JSON.stringify(
    listingRpcArgs({ ...params, locale: normalizeLocale(params.locale) }),
  );
}

function pruneListingCache(now: number): void {
  for (const [key, entry] of listingShared) {
    if (
      entry.settled &&
      entry.subscribers === 0 &&
      now - entry.at >= LISTING_SHARED_TTL_MS
    ) {
      listingShared.delete(key);
    }
  }
  while (listingShared.size >= LISTING_SHARED_MAX_ENTRIES) {
    const removable = [...listingShared].find(
      ([, entry]) => entry.settled && entry.subscribers === 0,
    );
    if (!removable) break;
    listingShared.delete(removable[0]);
  }
}

/** Nur für Tests: Bündelung/Cache zurücksetzen. */
export function resetSharedListingCache(): void {
  for (const entry of listingShared.values()) {
    if (!entry.settled) entry.controller.abort();
  }
  listingShared.clear();
}

/**
 * Wie `getProductListing`, aber mit begrenztem Wiederholen und Bündelung
 * identischer Abfragen. Gleiche Parameter innerhalb der Gültigkeitsdauer
 * ergeben genau **eine** Netzabfrage.
 */
export async function getSharedProductListing(
  params: ProductListingParams,
): Promise<CatalogProduct[]> {
  if (params.signal?.aborted) throw abortError();

  const key = listingCacheKey(params);
  const now = Date.now();
  pruneListingCache(now);
  let entry = listingShared.get(key);
  if (!entry) {
    // Sind ausnahmsweise alle Cacheplätze noch aktiv, läuft die neue,
    // abweichende Anfrage ohne Cache statt die harte Obergrenze zu reißen.
    if (listingShared.size >= LISTING_SHARED_MAX_ENTRIES) {
      return withLimitedRetry(
        () =>
          getProductListing({
            ...params,
            locale: normalizeLocale(params.locale),
            signal: params.signal,
          }),
        params.signal,
      );
    }
    const controller = new AbortController();
    const next: ListingCacheEntry = {
      at: now,
      controller,
      subscribers: 0,
      settled: false,
      promise: Promise.resolve([]),
    };
    next.promise = withLimitedRetry(
      () =>
        getProductListing({
          ...params,
          locale: normalizeLocale(params.locale),
          signal: controller.signal,
        }),
      controller.signal,
    )
      .catch((error) => {
        // Eine ältere Anfrage darf einen inzwischen neueren Cacheeintrag
        // desselben Schlüssels nicht entfernen.
        if (listingShared.get(key) === next) listingShared.delete(key);
        throw error;
      })
      .finally(() => {
        next.settled = true;
        pruneListingCache(Date.now());
      });
    entry = next;
    listingShared.set(key, entry);
  }

  entry.subscribers += 1;
  const consumer = entry;
  return new Promise<CatalogProduct[]>((resolve, reject) => {
    let active = true;
    const release = () => {
      if (!active) return;
      active = false;
      params.signal?.removeEventListener("abort", onAbort);
      consumer.subscribers = Math.max(0, consumer.subscribers - 1);
      if (!consumer.settled && consumer.subscribers === 0) {
        consumer.controller.abort();
        if (listingShared.get(key) === consumer) listingShared.delete(key);
      }
    };
    const onAbort = () => {
      release();
      reject(abortError());
    };
    params.signal?.addEventListener("abort", onAbort, { once: true });
    if (params.signal?.aborted) {
      onAbort();
      return;
    }
    consumer.promise.then(
      (products) => {
        if (!active) return;
        release();
        resolve(products);
      },
      (error: unknown) => {
        if (!active) return;
        release();
        reject(error);
      },
    );
  });
}

/** Gemeinsamer Ladeweg mit demselben Sprachvertrag wie das Haupt-Listing. */
export async function getSharedProductListingLocalized(
  params: ProductListingParams,
): Promise<{
  readonly products: CatalogProduct[];
  readonly locale: ListingLocaleResolution;
}> {
  const requestedLocale = normalizeLocale(params.locale);
  const products = await getSharedProductListing({
    ...params,
    locale: requestedLocale,
  });
  const effectiveLocale = readDeliveredLocale(products[0] ?? null) ?? requestedLocale;
  return {
    products,
    locale: {
      requestedLocale,
      effectiveLocale,
      usedFallback: effectiveLocale !== requestedLocale,
      attempted: [requestedLocale],
    },
  };
}



/*
 * Bewusst entfernt (Ausgabekanal-Vertrag): Direkt-Reads auf
 * `api_v1_products_catalog` (`getProductsCatalog` / `getAllProductsCatalog`).
 * Produktlisten dürfen ausschließlich über
 * `rpc_get_channel_product_listing` mit dem Kanalschlüssel laufen, damit
 * keine breitere Produktquelle die Kanalfreigabe umgeht.
 */


/**
 * Filteroptionen ausschließlich über `rpc_get_localized_filter_options`.
 *
 * Der Sprachvertrag liegt vollständig in der Produktbasis: `option_key` ist
 * der technische Filterwert (nie übersetzt), `option_label` die Anzeige in
 * der angeforderten Sprache mit feldweiser Kette angefordert → `en` → `de`.
 * Die alte, sprachlose View `product_filter_options_view` wird nicht mehr
 * gelesen; es gibt keine hartkodierte DE/EN-Label-Auswahl im Client.
 */
const filterOptionsShared = new Map<string, ListingCacheEntry2>();

interface ListingCacheEntry2 {
  readonly at: number;
  readonly promise: Promise<FilterOptionRow[]>;
}

/** Nur für Tests: Bündelung der Filteroptionen zurücksetzen. */
export function resetSharedFilterOptionsCache(): void {
  filterOptionsShared.clear();
}

/**
 * Filteroptionen mit Bündelung: derselbe Sprachcode innerhalb von 30 Sekunden
 * ergibt genau **eine** Netzabfrage. Beim Start löst i18next den Sprachcode
 * verzögert auf, wodurch dieselbe schwere Abfrage bisher doppelt lief.
 */
export async function getSharedLocalizedFilterOptions(
  locale: CatalogLocale,
): Promise<FilterOptionRow[]> {
  const key = normalizeLocale(locale);
  const now = Date.now();
  const hit = filterOptionsShared.get(key);
  if (hit && now - hit.at < LISTING_SHARED_TTL_MS) return hit.promise;
  const promise = getLocalizedFilterOptions(key).catch((error) => {
    filterOptionsShared.delete(key);
    throw error;
  });
  filterOptionsShared.set(key, { at: now, promise });
  return promise;
}

export async function getLocalizedFilterOptions(
  locale: CatalogLocale,
): Promise<FilterOptionRow[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase.rpc(
    CATALOG_RPCS.getLocalizedFilterOptions,
    { p_locale: normalizeLocale(locale) },
  );
  if (error) throw error;
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]) as FilterOptionRow[];
}


/** Lädt Navigationsgruppen aus `catalog_navigation_groups`. */
export async function getNavigationGroups(): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from(CATALOG_VIEWS.navigationGroups)
    .select("*");
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

/** Lädt Navigations-Items aus `catalog_navigation_group_items`. */
export async function getNavigationGroupItems(): Promise<
  Record<string, unknown>[]
> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from(CATALOG_VIEWS.navigationGroupItems)
    .select("*");
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

/**
 * Eintrag der öffentlichen Katalog-Navigation (1 Zeile je nav_slug).
 * Quelle: View `product_catalog_navigation_view` aus der Produkt-DB. Die
 * Reihenfolge, Slugs, Labels, `applicable_filters` und `primary_filters`
 * sind dort gesetzte Wahrheit und werden vom Frontend nur konsumiert –
 * nie überschrieben.
 *
 * `primary_filters` markiert Filter, die VOR den Detail-Filtern gewählt
 * werden müssen. Enthält die Liste z. B. `"serie"`, ist die Serien-Auswahl
 * Pflicht, bevor Detail-Filter und Produktliste ausgespielt werden
 * (aktuell für `aussenstationen` und `innenstationen`).
 */
export interface CatalogNavGroup {
  nav_slug: string;
  label_de: string;
  label_en: string;
  sort_order: number;
  applicable_filters: string[];
  primary_filters: string[];
  categories: { category_slug: string; sort_order: number }[];
}

/** Lädt die Top-Level-Gruppen aus `product_catalog_navigation_view`. */
export async function getCatalogNavigation(): Promise<CatalogNavGroup[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from(CATALOG_VIEWS.apiNavigation)
    .select(
      "nav_slug, label_de, label_en, sort_order, applicable_filters, primary_filters, category_slugs, is_active",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const cats = Array.isArray(r.category_slugs)
      ? (r.category_slugs as unknown[]).map(String)
      : [];
    return {
      nav_slug: String(r.nav_slug ?? ""),
      label_de: String(r.label_de ?? ""),
      label_en: String(r.label_en ?? ""),
      sort_order: Number(r.sort_order ?? 0),
      applicable_filters: Array.isArray(r.applicable_filters)
        ? (r.applicable_filters as unknown[]).map(String)
        : [],
      primary_filters: Array.isArray(r.primary_filters)
        ? (r.primary_filters as unknown[]).map(String)
        : [],
      categories: cats.map((slug, idx) => ({
        category_slug: slug,
        sort_order: idx,
      })),
    };
  });
}

/**
 * Ein Eintrag aus `api_v1_filter_series_by_category` — eine Serie, die
 * mindestens einen Artikel in einer der gewählten Kategorien hat. Die
 * `artikel_count`-Zahl bezieht sich auf die jeweilige (category_slug,
 * serie_slug)-Kombination.
 */
export interface SeriesChip {
  /** Weitere Spalten der View (u. a. künftige Sprachspalten). */
  readonly [key: string]: unknown;
  category_slug: string;
  serie_slug: string;
  label_de: string;
  label_en: string | null;
  sort_order: number;
  thumbnail_path: string | null;
  artikel_count: number;
}

/**
 * Lädt die Serien-Chips für eine Menge von Kategorien (zweite
 * Filterstufe). Read-only, ungefiltert nach Sprache — Labels kommen
 * direkt aus der View.
 */
export async function getSeriesForCategories(
  categorySlugs: readonly string[],
): Promise<SeriesChip[]> {
  if (!isSupabaseConfigured()) return [];
  if (categorySlugs.length === 0) return [];
  const { data, error } = await supabase
    .from(CATALOG_VIEWS.apiSeriesByCategory)
    // `*`: alle Sprachspalten der View mitnehmen (heute `label_de`/`label_en`,
    // künftig z. B. `label_pl`), damit `pickProductLocalized` sie nutzen kann.
    .select("*")
    .in("category_slug", categorySlugs as string[])
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeriesChip[];
}

/**
 * Eine Serienfamilie aus `rpc_get_channel_serie_families` (read-only).
 *
 * `label` ist bereits in der angefragten Sprache aufgelöst, `serie_slugs`
 * enthält die technischen Serien der Familie. Einträge mit
 * `is_fallback = true` sind noch nicht gruppierte Einzelserien und werden
 * wie normale Familien behandelt.
 */
export interface SerieFamily {
  readonly [key: string]: unknown;
  readonly family_slug: string;
  readonly nav_slug: string | null;
  readonly label: string | null;
  readonly description: string | null;
  readonly serie_slugs: readonly string[];
  readonly product_count: number;
  readonly sort_order: number;
  readonly thumbnail_path: string | null;
  readonly is_fallback: boolean;
}

/**
 * Lädt die Serienfamilien für die aktuell gewählten Kategorien.
 * Ausschließlich lesend über den Kanalvertrag (`p_channel_key`).
 */
export async function getSerieFamilies(
  locale: CatalogLocale,
  categorySlugs: readonly string[],
  signal?: AbortSignal,
): Promise<SerieFamily[]> {
  if (!isSupabaseConfigured()) return [];
  if (categorySlugs.length === 0) return [];
  const query = supabase.rpc(CATALOG_RPCS.getChannelSerieFamilies, {
    p_channel_key: CATALOG_CHANNEL_KEY,
    p_locale: locale,
    p_category_slugs: categorySlugs as string[],
  });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as Array<
    Record<string, unknown>
  >;
  return rows.map((row) => ({
    ...row,
    family_slug: String(row.family_slug ?? ""),
    nav_slug: row.nav_slug == null ? null : String(row.nav_slug),
    label: row.label == null ? null : String(row.label),
    description: row.description == null ? null : String(row.description),
    serie_slugs: Array.isArray(row.serie_slugs)
      ? (row.serie_slugs as unknown[])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
      : [],
    product_count: Number(row.product_count ?? 0) || 0,
    sort_order: Number(row.sort_order ?? 0) || 0,
    thumbnail_path:
      row.thumbnail_path == null ? null : String(row.thumbnail_path),
    is_fallback: row.is_fallback === true,
  })).filter((row) => row.family_slug.length > 0);
}


/**
 * Aggregierte boolesche Facetten-Counts für die aktuell ausgewählten
 * Kategorien (und optional Serien). Wahrheitsquelle für UI-Pills, die
 * sonst clientseitig aus der Trefferliste rekonstruiert würden — wodurch
 * 0-Werte verloren gingen.
 *
 * `true` und `false` sind beide immer gesetzt, auch bei Count 0.
 */
export interface BooleanFacetCounts {
  /** Anzahl Artikel mit Wert `true`. */
  readonly true: number;
  /** Anzahl Artikel mit Wert `false`. */
  readonly false: number;
}

export interface SerieFacets {
  /** IP-Gateway-Counts aus `ip_gateway_counts`. */
  readonly ip_gateway: BooleanFacetCounts;
  /** SmartStick-kompatibel-Counts aus `smart_stick_counts`. */
  readonly smart_stick: BooleanFacetCounts;
}

/**
 * Lädt die Facetten-Zeilen aus `api_v1_filter_facets_by_serie` und
 * aggregiert die booleschen `*_counts`-Felder über die übergebenen
 * Kategorien/Serien. Read-only. Wenn keine Kategorien angegeben sind,
 * wird ein Null-Result geliefert (keine Aggregation möglich).
 */
export async function getFacetsForSelection(
  categorySlugs: readonly string[],
  serieSlugs: readonly string[] = [],
): Promise<SerieFacets | null> {
  if (!isSupabaseConfigured()) return null;
  if (categorySlugs.length === 0) return null;

  let q = supabase
    .from(CATALOG_VIEWS.apiFacetsBySerie)
    .select("category_slug, serie_slug, ip_gateway_counts, smart_stick_counts")
    .in("category_slug", categorySlugs as string[]);
  if (serieSlugs.length > 0) {
    q = q.in("serie_slug", serieSlugs as string[]);
  }
  const { data, error } = await q;
  if (error) throw error;

  let ipTrue = 0;
  let ipFalse = 0;
  let ssTrue = 0;
  let ssFalse = 0;
  const readCounts = (val: unknown): [number, number] => {
    if (!val || typeof val !== "object") return [0, 0];
    const rec = val as Record<string, unknown>;
    const t = Number(rec["true"] ?? 0);
    const f = Number(rec["false"] ?? 0);
    return [Number.isFinite(t) ? t : 0, Number.isFinite(f) ? f : 0];
  };
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const [it, ifa] = readCounts(row.ip_gateway_counts);
    ipTrue += it;
    ipFalse += ifa;
    const [st, sf] = readCounts(row.smart_stick_counts);
    ssTrue += st;
    ssFalse += sf;
  }
  return {
    ip_gateway: { true: ipTrue, false: ipFalse },
    smart_stick: { true: ssTrue, false: ssFalse },
  };
}


/**
 * Farbzuordnung eines Artikels (Etappe `catalog-color-filter-1`).
 * Quelle: read-only View `api_v1_product_colors` der zentralen
 * Produktdatenbank. Ein Artikel kann mehrere Farben haben.
 * Es wird nichts aus Produktnamen oder Freitext abgeleitet.
 */
export interface ProductColorAssignment {
  /** Weitere Spalten der View (u. a. künftige Sprachspalten). */
  readonly [key: string]: unknown;
  readonly artikel_nr: string;
  readonly color_key: string;
  readonly label_de: string | null;
  readonly label_en: string | null;
  readonly hex_code: string | null;
  readonly sort_order: number | null;
}

/**
 * Lädt die Farbzuordnungen für eine Menge von Artikelnummern
 * (Basis: bereits über den Kanalvertrag geladene Produkte).
 * Read-only, chunked, damit die `in`-Liste nicht zu lang wird.
 */
export async function getProductColorsForArticles(
  artikelNrs: readonly string[],
): Promise<ProductColorAssignment[]> {
  if (!isSupabaseConfigured()) return [];
  const unique = Array.from(
    new Set(artikelNrs.map((a) => String(a ?? "").trim()).filter(Boolean)),
  );
  if (unique.length === 0) return [];

  const CHUNK = 200;
  const out: ProductColorAssignment[] = [];
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from(CATALOG_VIEWS.apiProductColors)
      // `*`: siehe `getSeriesForCategories` (alle Sprachspalten mitnehmen).
    .select("*")
      .in("artikel_nr", chunk);
    if (error) throw error;
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      out.push({
        ...row,
        artikel_nr: String(row.artikel_nr ?? ""),
        color_key: String(row.color_key ?? ""),
        label_de: row.label_de == null ? null : String(row.label_de),
        label_en: row.label_en == null ? null : String(row.label_en),
        hex_code: row.hex_code == null ? null : String(row.hex_code),
        sort_order:
          row.sort_order == null ? null : Number(row.sort_order),
      });
    }
  }
  return out;
}

/** Globale Farbdefinition aus `api_v1_product_color_facets`. */
export interface ProductColorFacet {
  /** Weitere Spalten der View (u. a. künftige Sprachspalten). */
  readonly [key: string]: unknown;
  readonly color_key: string;
  readonly label_de: string | null;
  readonly label_en: string | null;
  readonly hex_code: string | null;
  readonly sort_order: number | null;
  readonly product_count: number;
}

/** Lädt die globalen Farbdefinitionen (Labels, Hex, Reihenfolge). Read-only. */
export async function getProductColorFacets(): Promise<ProductColorFacet[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from(CATALOG_VIEWS.apiProductColorFacets)
    // `*`: siehe `getSeriesForCategories` (alle Sprachspalten mitnehmen).
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    color_key: String(row.color_key ?? ""),
    label_de: row.label_de == null ? null : String(row.label_de),
    label_en: row.label_en == null ? null : String(row.label_en),
    hex_code: row.hex_code == null ? null : String(row.hex_code),
    sort_order: row.sort_order == null ? null : Number(row.sort_order),
    product_count: Number(row.product_count ?? 0) || 0,
  }));
}
