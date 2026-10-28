/**
 * Produkte-Hub — Übersicht der drei Produktbereiche
 * (Türkommunikation, Zutrittskontrolle, Eingangslösungen).
 *
 * Eine Wahrheit (Runde 12): Diese Seite enthält KEINEN lokalen Karten-
 * Renderpfad mehr. Top-Level-Sections kommen vollständig über
 * `renderPageSectionByType` in DB-`sort_order`. Die Karten-Section
 * (`cards`, jetzt `cards_v1`) wird vom Standardrenderer `CardsSectionV1`
 * bedient — link_1/2/3, Chips, Bullets, Icon-Resolver wirken wie auf
 * jeder anderen Standardkarte.
 */
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { useTranslation } from "react-i18next";

const PAGE_KEY = "produkte.hub";

const ProduktHubPage = () => {
  const { i18n } = useTranslation();
  const loc = normalizeLocale(i18n.language);
  const cms = useCmsPageContent(PAGE_KEY);

  const headline = cms.text("cards", "headline", loc, "Unsere Produktbereiche");
  const intro = cms.text(
    "cards",
    "intro",
    loc,
    "Drei Wege zu unseren Produkten.",
  );

  const topLevelSections = cms.sections.filter((s) => !s.parent_section_key);

  const dbSectionCount = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero",
  ).length;

  return (
    <>
      <CmsPageLayout
        pageKey={PAGE_KEY}
        label=""
        headline={headline}
        intro={intro}
        heroImage=""
        showHeroImage={false}
        fullWidth
      >
        {topLevelSections.map((section) => {
          const rendered = renderPageSectionByType({
            pageKey: PAGE_KEY,
            sectionKey: section.section_key,
            sectionType: section.section_type,
            cms,
            locale: loc,
          });
          return rendered ? <div key={section.section_key}>{rendered}</div> : null;
        })}
      </CmsPageLayout>
      <CmsSourceBadge
        pageKey={PAGE_KEY}
        source={cms.hasDbContent ? "db" : "fallback"}
        sectionCount={dbSectionCount}
      />
    </>
  );
};

export default ProduktHubPage;
