import PageLayout, { FeatureBlock, ContentSection } from "@/components/PageLayout";
import SiblingNav from "@/components/SiblingNav";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
// Redaktionelle Hero-Bilder kommen vollständig aus cms_assets
// (page_key='gebaeudemanagement.root', section_key='hero', field_key='image',
// viewport=desktop|tablet|mobile). Daher keine Code-Fallback-Imports mehr.
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { Teaser2ColV1 } from "@/features/cms/components/sections/Teaser2ColV1";

/** Legacy-Fallback, falls die neuen teaser_2col_v1-Sections (B-647…B-651) fehlen. */
const functionKeys = [
  "digitaleNamensanzeige",
  "zufahrtssteuerung",
  "digitalSignage",
  "reservierenBuchen",
  "alarmanlagenkopplung",
] as const;




const Gebaeudemanagement = () => {
  const { t, cms, loc } = useCmsI18n("gebaeudemanagement.root", "gebaeudemanagement", "root");
  const heroImage = cms.asset("hero", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  // Spiegel-Regel: ALLE aktiven teaser_2col_v1-Sections rendern, sortiert nach sort_order.
  // Kein Hardcoding von section_keys — Admin-Reihenfolge/Sichtbarkeit schlägt 1:1 durch.
  const teaserSections = cms.sections
    .filter((s) => !s.parent_section_key && s.section_type === "teaser_2col_v1")
    .sort((a, b) => a.sort_order - b.sort_order);
  // Batch 14: Section-Gate `bcm` — Admin-Schalter wirkt jetzt public.
  const bcmActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "bcm");


  return (
    <CmsPageLayout pageKey="gebaeudemanagement.root"
      label={t("shared.label")}
      headline={t("root.hero.headline")}
      intro={t("root.hero.intro")}
      heroImage={heroImage}
      heroImageDesktop={undefined}
      heroImageMobile={undefined}
    >
                {bcmActive && (
                  <ContentSection label={t("root.bcm.label")} title={t("root.bcm.title")}>
                    <p className="text-muted-foreground leading-relaxed mb-10 max-w-3xl">
                      {t("root.bcm.text")}
                    </p>
                  </ContentSection>
                )}

          {teaserSections.length > 0 ? (
            teaserSections.map((sec) => (
              <Teaser2ColV1
                key={sec.section_key}
                {...{
                  pageKey: "gebaeudemanagement.root",
                  cms,
                  locale: loc,
                  sectionKey: sec.section_key,
                  children: [],
                }}
              />
            ))
          ) : (
            <ContentSection label={t("root.functions.label")} title={t("root.functions.title")}>
              <div className="space-y-12">
                {functionKeys.map((key) => (
                  <FeatureBlock
                    key={key}
                    headline={t(`root.functions.items.${key}.headline`)}
                    text={t(`root.functions.items.${key}.text`)}
                  />
                ))}
              </div>
            </ContentSection>
          )}
      <CmsSourceBadge
        pageKey="gebaeudemanagement.root"
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
          <SiblingNav pageKey="gebaeudemanagement.root" />
    </CmsPageLayout>
  );
};

export default Gebaeudemanagement;
