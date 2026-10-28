import type { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import type { AppLocale } from "@/i18n/locale";

/**
 * Generischer Karten-/Stat-Helfer (Tranche 7d-renderer, 2026-05-24).
 *
 * Liest Kindsections vom Muster `<parent>_item_<key>` DB-first (Typ
 * `card_v1` oder `stat_v1`). Reihenfolge folgt `sort_order`.
 * Wenn keine Kindsections existieren, fällt der Renderer auf den
 * mitgegebenen Legacy-/i18n-Fallback zurück.
 *
 * Bewusst klein gehalten: ergänzt — ersetzt nicht — den service-
 * spezifischen Helfer in `src/features/service/shared/cmsCardHelpers.ts`
 * (Tranche 7c), der zusätzlich legacy `items.<key>.*`-Feldnamen kennt.
 */
type Cms = ReturnType<typeof useCmsPageContent>;
type Loc = AppLocale;

export function listChildItems(
  cms: Cms,
  parentSection: string,
  expectedType: "card_v1" | "stat_v1",
  fallback: readonly string[],
): string[] {
  const prefix = `${parentSection}_item_`;
  const children = cms.sections
    .filter(
      (s) => s.section_key.startsWith(prefix) && s.section_type === expectedType,
    )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.section_key.slice(prefix.length));
  return children.length > 0 ? children : [...fallback];
}

/**
 * Liest ein Feld aus der Kindsection `<parent>_item_<itemKey>`. Wenn das
 * Kind existiert und ein nicht-leerer Wert vorhanden ist: dieser Wert.
 * Sonst: `fallback` (typischerweise `t(...)` oder ein bestehender
 * `cms.text(...)`-Aufruf auf die Legacy-Parent-Section).
 */
export function txChildField(
  cms: Cms,
  loc: Loc,
  parentSection: string,
  itemKey: string,
  newField: string,
  fallback: string,
): string {
  const childKey = `${parentSection}_item_${itemKey}`;
  const hasChild = cms.sections.some((s) => s.section_key === childKey);
  if (hasChild) {
    const v = cms.text(childKey, newField, loc, "");
    if (v) return v;
  }
  return fallback;
}

/** Praktischer Shortcut für `stat_v1`-Felder (`value`, `label`). */
export function txStatField(
  cms: Cms,
  loc: Loc,
  parentSection: string,
  itemKey: string,
  field: "value" | "label",
  fallback: string,
): string {
  return txChildField(cms, loc, parentSection, itemKey, field, fallback);
}
