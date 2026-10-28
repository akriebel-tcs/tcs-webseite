/**
 * Beschilderung — vollständig CMS-light-fähig.
 * Texte: i18n-führend mit DB-Overlay; Bilder: Code-führend mit DB-Overlay.
 */


import PageLayout, { ContentSection } from "@/components/PageLayout";
import SiblingNav from "@/components/SiblingNav";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { useCmsPageFields, pickCmsOrFallback } from "@/features/cms/hooks/useCmsPageFields";

import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { Teaser2ColV1 } from "@/features/cms/components/sections/Teaser2ColV1";

const PAGE_KEY = "gebaeudekommunikation.beschilderung";


const Beschilderung = () => {
  const { t, loc } = useCmsI18n("signage.root", "gebaeudekommunikation", "beschilderung");
  const cms = useCmsPageContent(PAGE_KEY);
  const featureTeaserSections = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type === "teaser_2col_v1" && s.section_key.startsWith("feature_"),
  );
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const { fields } = useCmsPageFields(PAGE_KEY);
  const cmsOr = (key: string, fb: string) => pickCmsOrFallback(fields, key, fb);
  // Batch 14: Section-Gate — `features` Block respektiert nun is_active.
  const featuresActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "features");

  return (
    <CmsPageLayout pageKey="gebaeudekommunikation.beschilderung"
      label={cmsOr("hero.label", t("beschilderung.hero.label"))}
      headline={cmsOr("hero.headline", t("beschilderung.hero.headline"))}
      intro={cmsOr("hero.intro", t("beschilderung.hero.intro"))}
      heroImage={cms.asset("hero", "image", "")}
    >
      {featuresActive && (
        <ContentSection
          label={cmsOr("features.label", t("beschilderung.features.label"))}
          title={cmsOr("features.title", t("beschilderung.features.title"))}
        >
          <p className="text-muted-foreground leading-relaxed max-w-2xl mb-12">
            {cmsOr("features.intro", t("beschilderung.features.intro"))}
          </p>

          {featureTeaserSections.length > 0 && (
            // DB-first: einzelne teaser_2col_v1-Sections (feature_*)
            <div className="space-y-4">
              {featureTeaserSections.map((sec) => (
                <Teaser2ColV1
                  key={sec.section_key}
                  pageKey={PAGE_KEY}
                  cms={cms}
                  locale={loc}
                  sectionKey={sec.section_key}
                  children={[]}
                />
              ))}
            </div>
          )}

        </ContentSection>
      )}


      {/* Hinweis: Lokaler „Planen Sie ein neues Projekt?"-Block entfernt
          (Tranche „Doppelung Projektberatung"). Der globale Projekt-CTA
          unten in PageLayout/CTASection deckt diesen Inhalt bereits ab,
          und die neue DB-Section `standard_cta` (cta_v1) übernimmt die
          CMS-Pflege seitenweit. */}


    <CmsTailFaq pageKey="gebaeudekommunikation.beschilderung" />
    <CmsSourceBadge
      pageKey="gebaeudekommunikation.beschilderung"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
      <SiblingNav pageKey="gebaeudekommunikation.beschilderung" />
    </CmsPageLayout>
  );
};

export default Beschilderung;
