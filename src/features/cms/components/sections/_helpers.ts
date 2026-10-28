/**
 * Gemeinsame Helper für alle CMS-Section-Komponenten.
 * Sieh docs/02-architecture/section-typen-katalog.md für das Feld-Schema.
 */
import type { CmsSectionContext } from "../CmsBodyRenderer";

/** Liest ein Feld in aktueller Locale. */
export function f(ctx: CmsSectionContext, fieldKey: string, fallback = ""): string {
  return ctx.cms.text(ctx.sectionKey, fieldKey, ctx.locale, fallback);
}

/**
 * Liest ein technisches/sprachneutrales Feld (Layout-Schalter wie
 * `section_bg`, `image_position`, `background_variant`, `cta_enabled`,
 * `cta_kind`, `show_*`).
 *
 * Diese Werte beschreiben Darstellung, nicht Text — sie gelten deshalb für
 * ALLE Sprachen. Gepflegt werden sie in der Praxis meist nur in DE. Daher:
 * aktuelle Sprache → DE → EN. Damit wirkt eine Einstellung in der EN-Fassung
 * genauso wie in DE, ohne dass sie doppelt eingetragen werden muss.
 */
export function tf(ctx: CmsSectionContext, fieldKey: string, fallback = ""): string {
  const own = ctx.cms.text(ctx.sectionKey, fieldKey, ctx.locale, "");
  if (own.trim().length > 0) return own;
  const de = ctx.cms.text(ctx.sectionKey, fieldKey, "de", "");
  if (de.trim().length > 0) return de;
  const en = ctx.cms.text(ctx.sectionKey, fieldKey, "en", "");
  return en.trim().length > 0 ? en : fallback;
}

/** Liest ein Feld einer Kind-Section. */
export function cf(
  ctx: CmsSectionContext,
  childKey: string,
  fieldKey: string,
  fallback = "",
): string {
  return ctx.cms.text(childKey, fieldKey, ctx.locale, fallback);
}

/** Liest ein Asset (Bild) einer (Kind-)Section. */
export function img(ctx: CmsSectionContext, sectionKey: string, fieldKey = "image"): string {
  return ctx.cms.asset(sectionKey, fieldKey, "");
}

export function imgAlt(ctx: CmsSectionContext, sectionKey: string, fieldKey = "image"): string {
  return ctx.cms.assetAlt(sectionKey, fieldKey, ctx.locale, "");
}

/** Prüft, ob Section überhaupt renderbare Inhalte hat. */
export function hasAnyField(ctx: CmsSectionContext, fields: string[]): boolean {
  return fields.some((k) => f(ctx, k).length > 0);
}
