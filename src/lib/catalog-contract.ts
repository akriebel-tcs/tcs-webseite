/**
 * Catalog Contract – Manifest & Typen für die Anbindung an die externe
 * TCS-Produktdatenbank (Etappe `catalog-contract-sync-manifest-v1.2-safe-1`).
 *
 * Wahrheit ist das Manifest `api_v1_catalog_manifest` (Mindestversion 1.2).
 * Das Frontend liest read-only über die dort gelisteten Endpunkte:
 *
 *  - rpc_get_channel_product_listing    (Listing, Kanal `pdp_de`)
 *  - rpc_get_channel_product_pdp        (PDP-Aggregat inkl.
 *                                        `technical_specs_display`)
 *  - rpc_get_channel_product_datasheet  (Datenblatt, Kanal `datenblatt_de`)
 *  - api_v1_images                      (Bilder, public_url)
 *  - api_v1_documents                   (Dokumente, public_url)
 *  - api_v1_paket_komponenten           (Paketkomponenten)
 *  - api_v1_product_capability_claims   (Capability-Pills)
 *  - api_v1_navigation                  (Navigation)
 *  - api_v1_filters                     (Filter-Optionen)
 *
 * Strikte Regeln (siehe Manifest `rules`):
 *  - Bilder/Dokumente NUR über `public_url`.
 *  - Niemals Storage-Pfade selbst bauen, kein `supabase.storage.from(...)`.
 *  - Keine Frontend-Heuristiken (kein Slug, kein Präfix, kein Status).
 *  - Default-Status `approved` wird DB-seitig gesetzt; Frontend setzt nichts.
 *  - Pakete erkennt das Frontend ausschliesslich an `paket_klasse != null`
 *    (plus tatsächlich gelieferten Paketkomponenten), nie an `artikel_nr`.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const MANIFEST_VIEW = "api_v1_catalog_manifest" as const;
const MIN_MANIFEST_VERSION = "1.2" as const;

/** Endpoints, die das Frontend tatsächlich nutzt (Manifest-Schlüssel). */
export const USED_MANIFEST_ENDPOINTS = [
  "product_listing",
  "product_pdp",
  "product_specs_display",
  "product_datasheet",
  "images",
  "documents",
  "paket_komponenten",
  "capability_claims",
  "navigation",
  "filters",
] as const;

/**
 * Sprachcode der Produktdaten. Dynamisch (beliebige aktive Sprache);
 * Normalisierung und Rückfallkette liegen in
 * `src/features/service/catalog/lib/productLocale.ts`.
 */
export type CatalogLocale = string;

export interface ManifestEndpoint {
  readonly kind: "view" | "rpc";
  readonly name: string;
  readonly purpose?: string | null;
}

export interface CatalogManifest {
  readonly manifest_version: string;
  readonly generated_at?: string;
  readonly project?: Record<string, unknown>;
  readonly rules?: Record<string, string>;
  readonly conventions?: Record<string, unknown>;
  readonly endpoints: Record<string, ManifestEndpoint>;
  readonly gaps?: readonly unknown[];
  readonly changelog?: readonly { version: string; note?: string }[];
}

export interface ManifestCheckResult {
  readonly ok: boolean;
  readonly version: string | null;
  readonly gaps: readonly unknown[];
  readonly missingEndpoints: readonly string[];
  readonly manifest: CatalogManifest | null;
  readonly error: string | null;
}

/* ────────────────────────────── Payload-Typen ──────────────────────────── */

export interface ProductListingRow {
  readonly artikel_nr: string;
  readonly title?: string | null;
  readonly teaser?: string | null;
  readonly serie?: string | null;
  readonly system_typ?: string | null;
  readonly paket_klasse?: string | null;
  readonly montageart?: string | null;
  readonly drahtanzahl?: string | null;
  readonly wohneinheiten?: number | null;
  readonly tastenanzahl?: number | null;
  readonly ip_gateway?: boolean | null;
  readonly preis?: number | null;
  readonly waehrung?: string | null;
  readonly primary_image_url?: string | null;
  readonly has_image?: boolean | null;
  readonly image_count?: number | null;
  readonly document_count?: number | null;
  readonly has_documents?: boolean | null;
  readonly technical_spec_count?: number | null;
  readonly has_technical_specs?: boolean | null;
  readonly badges?: readonly BadgeRow[] | null;
  readonly smartstick_status?: string | null;
  readonly pdp_artikel_nr?: string | null;
  readonly pdp_slug?: string | null;
  readonly total_count?: number | null;
}

export interface BadgeRow {
  readonly key?: string | null;
  readonly sort?: number | null;
  readonly tone?: string | null;
  readonly label_de?: string | null;
  readonly label_en?: string | null;
}

export interface ImageRow {
  readonly image_id?: string;
  readonly artikel_nr?: string;
  readonly title?: string | null;
  readonly alt_text?: string | null;
  readonly image_role?: string | null;
  readonly is_primary?: boolean | null;
  readonly sort_order?: number | null;
  readonly file_name?: string | null;
  /** Pflicht laut Vertrag – das Frontend rendert ausschließlich darüber. */
  readonly public_url: string;
}

export interface DocumentRow {
  readonly document_id?: string;
  readonly artikel_nr?: string;
  readonly title?: string | null;
  readonly file_name?: string | null;
  readonly category?: string | null;
  readonly mime_type?: string | null;
  readonly locale?: string | null;
  readonly link_status?: string | null;
  readonly file_size?: number | null;
  /** Pflicht laut Vertrag. */
  readonly public_url: string;
}

export interface FeatureRow {
  readonly text: string;
  readonly source?: string | null;
  readonly status?: string | null;
  readonly priority?: number | null;
  readonly group_key?: string | null;
  readonly icon_name?: string | null;
  readonly sort_order?: number | null;
  readonly feature_type?: string | null;
  readonly is_card_feature?: boolean | null;
}

export interface TechnicalSpecRow {
  readonly spec_key: string;
  readonly label?: string | null;
  readonly unit?: string | null;
  readonly status?: string | null;
  readonly data_type?: string | null;
  readonly group_key?: string | null;
  readonly sort_order?: number | null;
  readonly value_text?: string | null;
  readonly value_numeric?: number | null;
  readonly value_boolean?: boolean | null;
}

export interface ProductPdpPayload {
  readonly found?: boolean;
  readonly artikel_nr: string;
  readonly locale?: string;
  readonly headline?: string | null;
  readonly subheadline?: string | null;
  readonly eyebrow?: string | null;
  readonly serie?: string | null;
  readonly system_typ?: string | null;
  readonly paket_klasse?: string | null;
  readonly paket_klasse_info?: Record<string, unknown> | null;
  readonly kurztext?: string | null;
  readonly kurzbeschreibung?: string | null;
  readonly langbeschreibung?: string | null;
  readonly preis?: number | null;
  readonly waehrung?: string | null;
  readonly pdp_slug?: string | null;
  readonly is_published?: boolean | null;
  readonly badges?: readonly BadgeRow[];
  readonly images?: readonly ImageRow[];
  readonly documents?: readonly DocumentRow[];
  readonly features?: readonly FeatureRow[];
  readonly technical_specs?: readonly TechnicalSpecRow[];
  readonly lieferumfang?: readonly FeatureRow[];
  readonly produktinformationen?: readonly FeatureRow[];
  readonly technische_daten_features?: readonly FeatureRow[];
  readonly produkt_info?: Record<string, unknown> | null;
  readonly ausschreibung?: Record<string, unknown> | null;
  readonly has_images?: boolean;
  readonly has_documents?: boolean;
  readonly has_price?: boolean;
}

export interface CapabilityClaim {
  readonly artikel_nr: string;
  readonly capability_key?: string | null;
  readonly label_de?: string | null;
  readonly label_en?: string | null;
  readonly tone?: string | null;
  readonly sort?: number | null;
  readonly [key: string]: unknown;
}

export interface PaketKomponenteRow {
  readonly paket_artikel_nr?: string | null;
  readonly rolle?: string | null;
  readonly resolved_artikel_nr?: string | null;
  readonly resolved_title?: string | null;
  readonly anzahl?: number | null;
  readonly [key: string]: unknown;
}

export interface NavigationRow {
  readonly [key: string]: unknown;
}

export interface FilterRow {
  readonly [key: string]: unknown;
}

/* ────────────────────────────── Manifest I/O ───────────────────────────── */

let manifestCache: CatalogManifest | null = null;

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number(n) || 0);
  const pb = b.split(".").map((n) => Number(n) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export async function fetchCatalogManifest(): Promise<CatalogManifest | null> {
  if (manifestCache) return manifestCache;
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from(MANIFEST_VIEW)
    .select("manifest")
    .limit(1);
  if (error) throw error;
  const row = (data ?? [])[0] as { manifest?: CatalogManifest } | undefined;
  manifestCache = row?.manifest ?? null;
  return manifestCache;
}

export async function checkCatalogManifest(): Promise<ManifestCheckResult> {
  try {
    const manifest = await fetchCatalogManifest();
    if (!manifest) {
      return {
        ok: false,
        version: null,
        gaps: [],
        missingEndpoints: [...USED_MANIFEST_ENDPOINTS],
        manifest: null,
        error: "manifest_unavailable",
      };
    }
    const version = manifest.manifest_version ?? null;
    const versionOk =
      version !== null && compareSemver(version, MIN_MANIFEST_VERSION) >= 0;
    const gaps = manifest.gaps ?? [];
    const missingEndpoints = USED_MANIFEST_ENDPOINTS.filter(
      (k) => !manifest.endpoints?.[k],
    );
    return {
      ok: versionOk && gaps.length === 0 && missingEndpoints.length === 0,
      version,
      gaps,
      missingEndpoints,
      manifest,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      version: null,
      gaps: [],
      missingEndpoints: [...USED_MANIFEST_ENDPOINTS],
      manifest: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Dev-Mode Check: einmalig in der Konsole loggen. In Produktion still.
 */
let manifestCheckRan = false;
export function runDevManifestCheck(): void {
  if (!import.meta.env.DEV) return;
  if (manifestCheckRan) return;
  manifestCheckRan = true;
  void checkCatalogManifest().then((r) => {
    if (r.ok) {
      // eslint-disable-next-line no-console
      console.info(
        `[catalog-contract] Manifest v${r.version} geladen, keine offenen Gaps, alle genutzten Endpoints vorhanden.`,
      );
      return;
    }
    // eslint-disable-next-line no-console
    console.warn("[catalog-contract] Manifest-Check fehlgeschlagen:", {
      version: r.version,
      gaps: r.gaps,
      missingEndpoints: r.missingEndpoints,
      error: r.error,
    });
  });
}

/* ───────────────────── Capability-Claims (read-only) ───────────────────── */

const CAPABILITY_VIEW = "api_v1_product_capability_claims" as const;

export async function getCapabilityClaims(
  artikelNr: string,
): Promise<CapabilityClaim[]> {
  if (!isSupabaseConfigured()) return [];
  if (!artikelNr) return [];
  const { data, error } = await supabase
    .from(CAPABILITY_VIEW)
    .select("*")
    .eq("artikel_nr", artikelNr);
  if (error) throw error;
  return (data ?? []) as CapabilityClaim[];
}
