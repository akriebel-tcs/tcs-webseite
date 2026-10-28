/**
 * CmsOnlyShell — Schlanke Seite, die *ausschließlich* aus dem CMS rendert.
 *
 * Verwendung in Routen:
 *   <Route path="/foo" element={<CmsOnlyShell pageKey="foo.bar" />} />
 *
 * Hero, Sektionen und Bilder kommen 1:1 aus der Datenbank
 * (cms_pages + cms_sections + cms_section_fields + cms_assets).
 * Es gibt keinen i18n-/Code-Fallback — der Eintrag im /admin ist die
 * alleinige Quelle. Damit ist die Spiegel-Regel automatisch erfüllt.
 */
import { useTranslation } from "react-i18next";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsBodyRenderer from "@/features/cms/components/CmsBodyRenderer";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import SiblingNav from "@/components/SiblingNav";
import { useCmsPageContent, normalizeLocale } from "@/features/cms/hooks/useCmsPageContent";

interface Props {
  pageKey: string;
}

const CmsOnlyShell = ({ pageKey }: Props) => {
  const { i18n } = useTranslation();
  const cms = useCmsPageContent(pageKey);
  const loc = normalizeLocale(i18n.language);

  // Fallback-Label aus Hero-Section (falls vorhanden) — CmsPageLayout greift
  // intern bereits auf "hero" zu, daher reicht uns hier ein leerer Default.
  const titleFallback = cms.text("hero", "headline", loc, "");

  const dbSectionCount = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero",
  ).length;

  return (
    <>
      <CmsPageLayout
        pageKey={pageKey}
        label=""
        headline={titleFallback}
        intro=""
        heroImage=""
      >
        <CmsBodyRenderer pageKey={pageKey} cms={cms} />
        <SiblingNav pageKey={pageKey} />
      </CmsPageLayout>
      <CmsSourceBadge
        pageKey={pageKey}
        source={cms.hasDbContent ? "db" : "fallback"}
        sectionCount={dbSectionCount}
      />
    </>
  );
};

export default CmsOnlyShell;
