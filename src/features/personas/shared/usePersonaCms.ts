import { useTranslation } from "react-i18next";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";

/**
 * Persona-Komfort-Hook.
 *
 * Liefert:
 * - `tx(section, fieldPath)`: DB-first Text-Lookup mit i18n-Fallback
 *   (`personas.<personaKey>.<section>.<fieldPath>`).
 * - `listItems(section, fallback)`: Tranche 7b — gibt geordnete Item-Keys
 *   einer Liste zurück. Existieren Kind-Sections vom Pattern
 *   `<section>_item_<key>` (Typ `card_v1` oder `stat_v1`), kommen sie aus
 *   der DB (sort_order). Sonst Code-Fallback.
 * - `txItem(section, itemKey, newField, legacyField?)`: liest erst aus der
 *   Kind-Section (falls vorhanden), fällt auf das alte
 *   `items.<itemKey>.<legacyField>` und schließlich auf i18n zurück.
 *
 * So bleibt das Public-Layout unverändert, während Inhalte im Admin über
 * Kind-Sections pflegbar sind.
 */
export function usePersonaCms(personaKey: string) {
  const cms = useCmsPageContent(`personas.${personaKey}`);
  const { t, i18n } = useTranslation("personas");
  const loc = normalizeLocale(i18n.language);

  const tx = (sectionKey: string, fieldPath: string): string => {
    const fallback = t(`${personaKey}.${sectionKey}.${fieldPath}`, { defaultValue: "" });
    return cms.text(sectionKey, fieldPath, loc, fallback);
  };

  const listItems = (sectionKey: string, fallback: readonly string[]): string[] => {
    const prefix = `${sectionKey}_item_`;
    const children = cms.sections
      .filter(
        (s) =>
          s.section_key.startsWith(prefix) &&
          (s.section_type === "card_v1" || s.section_type === "stat_v1"),
      )
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => s.section_key.slice(prefix.length));
    return children.length > 0 ? children : [...fallback];
  };

  const txItem = (
    parentSection: string,
    itemKey: string,
    newField: string,
    legacyField?: string,
  ): string => {
    const legacy = legacyField ?? newField;
    const childKey = `${parentSection}_item_${itemKey}`;
    const hasChild = cms.sections.some((s) => s.section_key === childKey);
    const fallback = t(`${personaKey}.${parentSection}.items.${itemKey}.${legacy}`, {
      defaultValue: "",
    });
    if (hasChild) {
      return cms.text(childKey, newField, loc, fallback);
    }
    return cms.text(parentSection, `items.${itemKey}.${legacy}`, loc, fallback);
  };

  return { cms, tx, txItem, listItems, loc, t };
}
