import type { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { isCardIconVisible, type CardIconVisibility } from "@/features/cms/lib/cardVisibility";
import type { AppLocale } from "@/i18n/locale";

/**
 * Service-Hub Karten-Helfer (Tranche 7c, 2026-05-24).
 *
 * Liest Kindsections vom Pattern `<parent>_item_<key>` (Typ `card_v1`)
 * DB-first und fällt auf das alte flache Feldmodell zurück:
 *   - `items.<key>.<legacy>` (Default, `itemsPrefix=true`)
 *   - `<key>.<legacy>` (z. B. `service.downloads.quickLinks`)
 *
 * Layout-neutral. Wenn keine Kindsections existieren, ändert sich nichts.
 */
type Cms = ReturnType<typeof useCmsPageContent>;

export function listCardItems(
  cms: Cms,
  parentSection: string,
  fallback: readonly string[],
): string[] {
  const prefix = `${parentSection}_item_`;
  const children = cms.sections
    .filter(
      (s) =>
        s.section_key.startsWith(prefix) && s.section_type === "card_v1",
    )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.section_key.slice(prefix.length));
  return children.length > 0 ? children : [...fallback];
}

export function txCardItem(
  cms: Cms,
  loc: AppLocale,
  parentSection: string,
  itemKey: string,
  newField: string,
  fallback: string,
  legacyField?: string,
  itemsPrefix: boolean = true,
): string {
  const childKey = `${parentSection}_item_${itemKey}`;
  const hasChild = cms.sections.some((s) => s.section_key === childKey);
  if (hasChild) {
    // Canonical-first für CTA: `link_1_label` schlägt `cta_label` (Sprint
    // „card_v1 Abschluss"). Sonst Verhalten wie bisher.
    if (newField === "cta_label" || newField === "cta_href") {
      const canonicalField = newField === "cta_label" ? "link_1_label" : "link_1_href";
      const canonical = cms.text(childKey, canonicalField, loc, "").trim();
      if (canonical) return canonical;
    }
    return cms.text(childKey, newField, loc, fallback);
  }
  const legacyName = legacyField ?? newField;
  const legacyKey = itemsPrefix
    ? `items.${itemKey}.${legacyName}`
    : `${itemKey}.${legacyName}`;
  return cms.text(parentSection, legacyKey, loc, fallback);
}

/**
 * Toggle-bewusster Icon-Sichtbarkeits-Check für das Service-Hub-Pattern.
 *
 * Spiegelt `txCardItem`: existiert eine `<parent>_item_<itemKey>`-Kindsection,
 * wird `icon` + `icon_enabled` dort gelesen; sonst aus dem Eltern-Container
 * über `items.<itemKey>.icon` (oder `<itemKey>.icon` bei `itemsPrefix=false`).
 *
 * Liefert `{ visible, name }`. Mit `icon_enabled=0` ist `visible=false`,
 * der Name bleibt erhalten — Aufrufer kann `<Icon>` einfach weglassen.
 */
export function isCardItemIconVisible(
  cms: Cms,
  loc: AppLocale,
  parentSection: string,
  itemKey: string,
  itemsPrefix: boolean = true,
): CardIconVisibility {
  const childKey = `${parentSection}_item_${itemKey}`;
  const hasChild = cms.sections.some((s) => s.section_key === childKey);
  if (hasChild) {
    return isCardIconVisible(cms, childKey, loc);
  }
  const fieldKey = itemsPrefix
    ? `items.${itemKey}.icon`
    : `${itemKey}.icon`;
  return isCardIconVisible(cms, parentSection, loc, fieldKey);
}
