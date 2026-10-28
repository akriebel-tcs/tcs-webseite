/**
 * GenericCmsPage — vollständig DB-getriebener Seitenrenderer.
 *
 * Iteriert über alle aktiven Top-Level-Sections der angegebenen Seite
 * (außer Hero) und gibt sie über `renderPageSectionByType` aus. Hero
 * kommt automatisch aus `CmsPageLayout` (label/headline/intro/image).
 *
 * Damit ist die „Eine Wahrheit"-Regel garantiert: Reihenfolge,
 * Sichtbarkeit und Inhalte aus Admin + DB → öffentliche Vorschau, ohne
 * lokale Sonderrenderer pro Seite.
 *
 * Verwendung: `<GenericCmsPage pageKey="…" />`.
 * Optionale Fallback-Strings nur, falls die DB für eine Seite noch keine
 * Hero-Felder enthält.
 */
import { Fragment } from "react";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";

import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

interface Props {
  pageKey: string;
  /** Optionaler Fallback, falls hero.label in der DB leer ist. */
  fallbackLabel?: string;
  /** Optionaler Fallback, falls hero.headline in der DB leer ist. */
  fallbackHeadline?: string;
  /** Optionaler Fallback, falls hero.intro in der DB leer ist. */
  fallbackIntro?: string;
  fullWidth?: boolean;
}

const GenericCmsPage = ({
  pageKey,
  fallbackLabel = "",
  fallbackHeadline = "",
  fallbackIntro = "",
  fullWidth = true,
}: Props) => {
  const { cms, loc } = useCmsI18n(pageKey, pageKey.split(".")[0]);

  const topSections = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero" && s.section_type !== "hero_v1",
  );
  const hasRichContent = cms.hasDbContent && topSections.length > 0;
  const heroSet = cms.assetSet("hero", "image");

  return (
    <CmsPageLayout
      pageKey={pageKey}
      label={fallbackLabel}
      headline={fallbackHeadline}
      intro={fallbackIntro}
      heroImage={heroSet.desktop ?? heroSet.any ?? ""}
      heroImageDesktop={heroSet.desktop ?? undefined}
      heroImageTablet={heroSet.tablet ?? undefined}
      heroImageMobile={heroSet.mobile ?? undefined}
      fullWidth={fullWidth}
    >
      {topSections.map((s) => (
        <Fragment key={s.section_key}>
          {renderPageSectionByType({
            pageKey,
            sectionKey: s.section_key,
            sectionType: s.section_type,
            cms,
            locale: loc,
          })}
        </Fragment>
      ))}

      <CmsSourceBadge
        pageKey={pageKey}
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? topSections.length : undefined}
      />
    </CmsPageLayout>
  );
};

export default GenericCmsPage;
