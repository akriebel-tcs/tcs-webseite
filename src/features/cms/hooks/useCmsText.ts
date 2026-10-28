/**
 * useCmsText — Kleiner Helper für Page-Komponenten:
 *
 *   const tcms = useCmsText(cms, "kontakt");
 *   tcms("cards", "phone.title")
 *     → cms.text("cards", "phone.title", locale, t("cards.phone.title"))
 *
 * Damit lesen Seiten Karten-/Sektions-Texte automatisch DB-first und fallen auf
 * den i18n-Wert zurück, wenn der Datensatz noch leer ist. Das Layout der Seite
 * bleibt unangetastet.
 *
 * Konvention der Field-Keys (passend zur bestehenden Admin-Whitelist):
 *   field_key entspricht dem i18n-Pfad UNTERHALB des Section-Keys.
 *   Beispiel:  i18n "cards.phone.title"  →  section "cards", field "phone.title"
 *              i18n "design.cards.X.title"  →  section "design.cards", field "X.title"
 *
 * Optionaler i18nPrefix: Wenn der Section-Key im DB-Schema von dem i18n-Pfad
 * abweicht (z. B. DB-Section "categories" entspricht i18n "root.categories"),
 * gibt man den i18n-Prefix mit.
 */
import { useTranslation } from "react-i18next";
import {
  normalizeLocale,
  type CmsPageContent,
} from "@/features/cms/hooks/useCmsPageContent";

export interface CmsTextHelper {
  /**
   * Liest einen Section-Field-Wert DB-first; Fallback ist `t(<i18nKey>)` mit
   * `<i18nKey> = i18nPrefixOverride ?? sectionKey + "." + fieldKey`.
   */
  (sectionKey: string, fieldKey: string, i18nKeyOverride?: string): string;
}

export function useCmsText(
  cms: CmsPageContent,
  i18nNamespace?: string,
): CmsTextHelper {
  const { t, i18n } = useTranslation(i18nNamespace);
  const locale = normalizeLocale(i18n.language);

  return (sectionKey, fieldKey, i18nKeyOverride) => {
    const i18nKey = i18nKeyOverride ?? `${sectionKey}.${fieldKey}`;
    const fallback = t(i18nKey, { defaultValue: "" }) as string;
    return cms.text(sectionKey, fieldKey, locale, fallback);
  };
}
