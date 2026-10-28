/**
 * OeffentlicheHandPage (P-060) — Batch 36.
 *
 * Rendert die Seite vollständig DB-first aus den in Batch 36 angelegten
 * Standard-Sections:
 *   - hero (hero_v1)            → via CmsPageLayout
 *   - cards_standard (cards_v1) → Themenkarten Behörden / Feuerwehr /
 *                                  Schwimmbad (card_v1)
 *   - standard_cta (cta_v1)     → via CmsTailCta in CmsPageLayout
 *
 * Alte Sondercontainer `section` und `cards` (content_v1) sind ab Batch
 * 36 inaktiv (Backup) und werden von RLS nicht mehr ausgeliefert.
 */
import { useTranslation } from "react-i18next";
import SiblingNav from "@/components/SiblingNav";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

const PAGE_KEY = "anwendungen.oeffentliche-hand";
const TOP_SECTIONS = ["cards_standard"];

const OeffentlicheHand = () => {
  const cms = useCmsPageContent(PAGE_KEY);
  const { i18n } = useTranslation();
  const loc = normalizeLocale(i18n.language);

  const renderTopSection = (sectionKey: string) => {
    const sec = cms.sections.find(
      (s) => !s.parent_section_key && s.section_key === sectionKey,
    );
    if (!sec) return null;
    return renderPageSectionByType({
      pageKey: PAGE_KEY,
      sectionKey,
      sectionType: sec.section_type ?? null,
      cms,
      locale: loc,
    });
  };

  const dbSectionCount = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero" && s.section_type !== "hero_v1",
  ).length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  return (
    <CmsPageLayout
      pageKey={PAGE_KEY}
      label=""
      headline=""
      intro=""
      heroImage=""
      fullWidth
    >
      {TOP_SECTIONS.map((sk) => (
        <div key={sk}>{renderTopSection(sk)}</div>
      ))}

      <CmsSourceBadge
        pageKey={PAGE_KEY}
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
      <SiblingNav pageKey={PAGE_KEY} />
    </CmsPageLayout>
  );
};

export default OeffentlicheHand;
