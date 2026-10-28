/**
 * cardCanonical — Canonical-first Reader für `card_v1`-Standardfelder.
 *
 * Sprint „card_v1 Abschluss — B-538-Standard auf alle Standardkarten
 * durchsetzen": Lokale Page-Renderer dürfen die alten Felder `tags`,
 * `cta_label`, `cta_href`, `href`, `features.N` nicht mehr direkt
 * öffentlich rendern. Sie lesen über diese Helfer canonical-first
 * (`chips.*`, `bullets.*`, `link_1..3_*`) und nutzen die Legacy-Felder
 * nur noch als letzten Fallback im Resolver.
 *
 * Erweiterung 2026-06-03: Linkauflösung unterstützt vier Zielarten:
 *   - interner Pfad (`/…`)
 *   - externe URL (`http://`, `https://`, `mailto:`, `tel:`)
 *   - Kurz-ID Seite (`P-265`)   → über `ShortIdMap.pages`
 *   - Kurz-ID Baustein (`B-357`) → über `ShortIdMap.sections`
 *
 * Ungültige Ziele (`#`, leer, unaufgelöste Kurz-ID) liefern `visible=false`,
 * werden also öffentlich gar nicht erst gerendert. Kein `href="#"` mehr.
 */

import type { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import type { AppLocale } from "@/i18n/locale";

type Cms = ReturnType<typeof useCmsPageContent>;
type Locale = AppLocale;

function readAny(cms: Cms, sectionKey: string, fieldKey: string, loc: Locale): string {
  const a = (cms.text(sectionKey, fieldKey, loc, "") ?? "").trim();
  if (a) return a;
  return (cms.text(sectionKey, fieldKey, loc === "de" ? "en" : "de", "") ?? "").trim();
}

/**
 * Chips (graue Pillen) canonical-first.
 *
 *  1. `chips.0..4` (neuer Karten-Vertrag)
 *  2. Legacy `tags` (CSV) — nur Fallback, wenn `chips.*` leer
 *  3. optional i18n-Fallback-Liste
 */
export function canonicalChips(
  cms: Cms,
  sectionKey: string,
  loc: Locale,
  i18nFallback: string[] = [],
): string[] {
  const chips = [0, 1, 2, 3, 4]
    .map((i) => readAny(cms, sectionKey, `chips.${i}`, loc))
    .filter((s) => s.length > 0);
  if (chips.length > 0) return chips;
  const legacy = readAny(cms, sectionKey, "tags", loc);
  if (legacy) return legacy.split(",").map((s) => s.trim()).filter(Boolean);
  return i18nFallback;
}

/**
 * Bullets (Aufzählungspunkte) canonical-first.
 */
export function canonicalBullets(
  cms: Cms,
  sectionKey: string,
  loc: Locale,
  i18nFallback: string[] = [],
): string[] {
  const bullets = [0, 1, 2, 3, 4]
    .map((i) => readAny(cms, sectionKey, `bullets.${i}`, loc))
    .filter((s) => s.length > 0);
  if (bullets.length > 0) return bullets;
  const legacy = [0, 1, 2, 3, 4]
    .map((i) => readAny(cms, sectionKey, `features.${i}`, loc))
    .filter((s) => s.length > 0);
  if (legacy.length > 0) return legacy;
  return i18nFallback;
}

export interface CanonicalLink {
  href: string;
  label: string;
  visible: boolean;
  /** Status für Admin-Tools: ok = sauber aufgelöst; broken = ungültig/leer. */
  status: "ok" | "broken";
}

/** Kurz-ID-Map: page_no → route_path, section_uid → {pageRoute, anchor}. */
export interface ShortIdMap {
  pages: Map<number, string>;
  sections: Map<number, { route: string; anchor?: string }>;
}

const EMPTY_MAP: ShortIdMap = { pages: new Map(), sections: new Map() };

/**
 * resolveHref — wandelt jedes Karten-Ziel in eine öffentlich nutzbare URL um.
 * Liefert `{ href, valid }`. Ungültig: leer, `#`, unaufgelöste Kurz-IDs.
 */
export function resolveHref(
  raw: string,
  map: ShortIdMap = EMPTY_MAP,
): { href: string; valid: boolean } {
  const v = (raw ?? "").trim();
  if (!v || v === "#") return { href: "", valid: false };

  // Externe URL / mailto / tel → durchreichen.
  if (/^(https?:|mailto:|tel:)/i.test(v)) return { href: v, valid: true };
  // Anker auf gleicher Seite → durchreichen.
  if (v.startsWith("#") && v.length > 1) return { href: v, valid: true };
  // Interner Pfad → durchreichen.
  if (v.startsWith("/")) return { href: v, valid: true };

  // Kurz-ID Seite: P-265 → route_path
  const pMatch = v.match(/^P-(\d+)$/i);
  if (pMatch) {
    const route = map.pages.get(Number(pMatch[1]));
    return route ? { href: route, valid: true } : { href: "", valid: false };
  }
  // Kurz-ID Baustein: B-357 → route_path + Anker
  const bMatch = v.match(/^B-(\d+)$/i);
  if (bMatch) {
    const target = map.sections.get(Number(bMatch[1]));
    if (!target) return { href: "", valid: false };
    return {
      href: target.anchor ? `${target.route}#${target.anchor}` : target.route,
      valid: true,
    };
  }

  // Alles andere (z. B. „kontakt" ohne führenden Slash) gilt als ungültig.
  return { href: "", valid: false };
}

/**
 * Karten-CTA canonical-first.
 *
 *  1. `link_N_*` (mit `link_N_enabled !== "0"`)
 *  2. Legacy `cta_href` + `cta_label`
 *  3. Legacy `href` (Karten-Klick-Ziel)
 *  4. `fallbackHref` / `fallbackLabel`
 *
 * Optional: `shortIdMap` löst Kurz-IDs auf. Ohne Map sind P-/B-Werte ungültig
 * und werden NICHT gerendert (kein `href="#"`).
 */
export function canonicalLink(
  cms: Cms,
  sectionKey: string,
  loc: Locale,
  opts: {
    index?: 1 | 2 | 3;
    fallbackHref?: string;
    fallbackLabel?: string;
    shortIdMap?: ShortIdMap;
  } = {},
): CanonicalLink {
  const idx = opts.index ?? 1;
  const fbHref = opts.fallbackHref ?? "";
  const fbLabel = opts.fallbackLabel ?? "";
  const map = opts.shortIdMap ?? EMPTY_MAP;

  const enabled = readAny(cms, sectionKey, `link_${idx}_enabled`, loc);
  const isOn = enabled !== "0";
  const linkHrefRaw = readAny(cms, sectionKey, `link_${idx}_href`, loc);
  const linkLabel = readAny(cms, sectionKey, `link_${idx}_label`, loc);

  if (isOn && linkHrefRaw) {
    const r = resolveHref(linkHrefRaw, map);
    if (r.valid) {
      return { href: r.href, label: linkLabel || fbLabel, visible: true, status: "ok" };
    }
    // href gepflegt, aber Kurz-ID konnte nicht aufgelöst werden → nicht rendern.
    return { href: "", label: linkLabel || fbLabel, visible: false, status: "broken" };
  }

  // Fallback 2: Legacy CTA
  const ctaHrefRaw = readAny(cms, sectionKey, "cta_href", loc);
  const ctaLabel = readAny(cms, sectionKey, "cta_label", loc);
  if (ctaHrefRaw) {
    const r = resolveHref(ctaHrefRaw, map);
    if (r.valid) {
      return { href: r.href, label: ctaLabel || fbLabel, visible: true, status: "ok" };
    }
    return { href: "", label: ctaLabel || fbLabel, visible: false, status: "broken" };
  }

  // Fallback 3: Legacy href
  const legacyHrefRaw = readAny(cms, sectionKey, "href", loc);
  if (legacyHrefRaw) {
    const r = resolveHref(legacyHrefRaw, map);
    if (r.valid) {
      return { href: r.href, label: fbLabel, visible: Boolean(fbLabel), status: "ok" };
    }
    return { href: "", label: fbLabel, visible: false, status: "broken" };
  }

  // Fallback 4: Code-Fallback (nur wenn er ein gültiger Pfad ist).
  if (fbHref) {
    const r = resolveHref(fbHref, map);
    if (r.valid) return { href: r.href, label: fbLabel, visible: Boolean(fbLabel), status: "ok" };
  }
  return { href: "", label: fbLabel, visible: false, status: "broken" };
}
