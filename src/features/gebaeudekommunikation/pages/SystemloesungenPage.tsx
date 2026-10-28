import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CardsSectionV1 } from "@/features/cms/components/sections/CardsSectionV1";
import { Teaser2ColV1 } from "@/features/cms/components/sections/Teaser2ColV1";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Systemloesungen = () => {
  const { t, cms, loc } = useCmsI18n("gebaeudekommunikation.systemloesungen", "gebaeudekommunikation", "systemloesungen");
  const heroImage = cms.asset("hero", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  // Spiegel-Treue: ALLE aktiven Top-Level-Container werden in
  // DB-`sort_order` gerendert — Kartenraster (`cards_v1`) immer über den
  // Standard-Renderer `CardsSectionV1` (zentrale Raster-Regel + einheitliche
  // Außenabstände), Wechselteaser über `Teaser2ColV1`. Es gibt hier keine
  // seiteneigenen Sonder-Layouts mehr (früher: `vorteile`, `fachplanung`).
  const topLevelCardsSections = cms.sections
    .filter(
      (s) =>
        !s.parent_section_key &&
        (s.section_type === "cards_v1" || s.section_type === "teaser_2col_v1"),
    )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const renderGenericCards = (sectionKey: string) => {
    const children = cms.sections
      .filter((c) => c.parent_section_key === sectionKey)
      .map((c) => ({ section_key: c.section_key, section_type: c.section_type ?? null }));
    return (
      <CardsSectionV1
        key={sectionKey}
        pageKey="gebaeudekommunikation.systemloesungen"
        cms={cms}
        locale={loc}
        sectionKey={sectionKey}
        children={children}
      />
    );
  };

  return (
    <CmsPageLayout pageKey="gebaeudekommunikation.systemloesungen"
      label={cms.text("hero", "eyebrow", loc, t("systemloesungen.hero.label"))}
      headline={t("systemloesungen.hero.headline")}
      intro={t("systemloesungen.hero.intro")}
      heroImage={heroImage}
    >
      {topLevelCardsSections.map((s) => {
        if (s.section_type === "teaser_2col_v1") {
          return (
            <Teaser2ColV1
              key={s.section_key}
              pageKey="gebaeudekommunikation.systemloesungen"
              cms={cms}
              locale={loc}
              sectionKey={s.section_key}
              children={[]}
            />
          );
        }
        return renderGenericCards(s.section_key);
      })}

    <CmsSourceBadge
      pageKey="gebaeudekommunikation.systemloesungen"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
    </CmsPageLayout>
  );
};

export default Systemloesungen;
