/**
 * Hilfsfunktionen für PDP-Renderer.
 *
 * Vertrag (catalog-contract.json §media, §gallery; CATALOG.md §4.5):
 * Bilder und Dokumente werden ausschließlich mit der von der DB gelieferten
 * URL gerendert (`primary_image_public_url` im Listing, `images[].public_url`
 * und `documents[].public_url` in der PDP). Es werden KEINE Bucket-Strings
 * im Frontend verwendet, KEINE Pfade konstruiert und KEIN
 * `storage.from(...).getPublicUrl(...)`-Fallback gebaut.
 *
 * Wenn die DB einen relativen Storage-Pfad liefert (`/storage/v1/...`), wird
 * er an die Supabase-Base-URL angehängt; das ist reine URL-Resolution,
 * keine fachliche Heuristik.
 */

import { getEffectiveProductSupabaseUrl } from "@/lib/supabase/client";

// Relative Produkt-Asset-URLs werden ausschließlich gegen die effektive
// Produktdatenbank-URL aufgelöst – niemals gegen die CMS-Light-/Lovable-Cloud-URL.
const SUPABASE_BASE_URL = getEffectiveProductSupabaseUrl();

export interface PdpAsset {
  readonly [key: string]: unknown;
}

/** Liefert einen nicht-leeren String aus einem Wert oder null. */
export function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length ? t : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** Liefert einen endlichen Number-Wert oder null. */
export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Liefert einen boolean oder null. */
export function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

/**
 * Resolved die öffentliche URL eines PDP-Assets aus dem von der DB
 * gelieferten URL-Feld. Bevorzugt `public_url` (Vertrag), fällt auf `url`
 * zurück. Es werden keine Buckets/Pfade selbst zusammengesetzt.
 */
export function resolvePublicUrl(
  asset: PdpAsset | null | undefined,
): string | null {
  if (!asset || typeof asset !== "object") return null;
  const direct = asString(asset.public_url) ?? asString(asset.url);
  if (!direct) return null;
  if (/^https?:\/\//i.test(direct)) return direct;
  if (direct.startsWith("/")) return `${SUPABASE_BASE_URL}${direct}`;
  return direct;
}

/** Liest ein Array-Feld defensiv. */
export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
