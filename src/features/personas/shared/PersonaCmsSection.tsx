/**
 * PersonaCmsSection — rendert eine Top-Level-Sektion einer Persona-Seite
 * ausschließlich über den zentralen Standardbaustein-Renderer
 * (`renderPageSectionByType`).
 *
 * Zweck: „Eine Wahrheit" für Persona-Karten. Keine lokalen Card-Mappings,
 * keine hartcodierten Icons/Texte/Links, keine i18n-Karten als führende
 * Quelle. Wenn die Sektion in `cms_sections` nicht existiert oder vom
 * Renderer-Katalog nicht unterstützt wird, gibt die Komponente nichts
 * aus — das ist gewollt, damit die Spiegel-Regel (DB ⇔ Public) sichtbar
 * bleibt.
 *
 * Optionaler `wrapperClassName` erlaubt es, das persona-spezifische
 * Außen-Layout (z. B. `bg-warm`, Anchor-ID, Padding-Variante) zu behalten,
 * während die Inhalte aus dem zentralen Baustein kommen.
 */
import type { CmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import type { Locale } from "@/features/cms/components/CmsBodyRenderer";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

interface Props {
  pageKey: string;
  sectionKey: string;
  cms: CmsPageContent;
  locale: Locale;
  /** Optionales Outer-Layout (Anchor-ID, Hintergrund-Variante, Padding). */
  wrapperId?: string;
  wrapperClassName?: string;
}

export function PersonaCmsSection({
  pageKey,
  sectionKey,
  cms,
  locale,
  wrapperId,
  wrapperClassName,
}: Props) {
  const section = cms.sections.find((s) => s.section_key === sectionKey);
  if (!section || !section.section_type) return null;
  const normalizedType = section.section_type === "cta" ? "cta_v1" : section.section_type;
  const allowSkippedTypes = normalizedType === "cta_v1";

  const rendered = renderPageSectionByType({
    pageKey,
    sectionKey,
    sectionType: normalizedType,
    cms,
    locale,
    allowSkippedTypes,
  });
  if (!rendered) return null;

  if (wrapperId || wrapperClassName) {
    return (
      <div id={wrapperId} className={wrapperClassName} data-cms-section={sectionKey}>
        {rendered}
      </div>
    );
  }
  return <>{rendered}</>;
}
