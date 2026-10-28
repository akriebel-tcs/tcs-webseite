import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import SiblingNav from "@/components/SiblingNav";
import { useCmsText } from "@/features/cms/hooks/useCmsText";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const Anwendungen = () => {
  const { cms, loc } = useCmsI18n("anwendungen.root", "anwendungen");
  const tcms = useCmsText(cms, "anwendungen");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  return (
    <CmsPageLayout
      pageKey="anwendungen.root"
      label={tcms("hero", "label", "root.hero.label")}
      headline={tcms("hero", "headline", "root.hero.headline")}
      intro={tcms("hero", "intro", "root.hero.intro")}
      heroImage=""
      fullWidth
    >

      {/* Sprint „card_v1 Abschluss" — Spiegel-Regel: ALLE aktiven Top-Level-
          Sections werden generisch über den zentralen Renderer ausgespielt
          (gleiche Wahrheit wie jede andere CMS-Seite). Damit rendern Karten
          link_1/link_2/link_3 konsistent als drei sichtbare Links, statt
          dem alten „Mehr erfahren →"-Einzellabel auf der ganzen Kachel. */}
      {cms.sections
        .filter((s) => !s.parent_section_key && s.section_type !== "hero" && s.section_type !== "hero_v1")
        .map((s) =>
          renderPageSectionByType({
            pageKey: "anwendungen.root",
            sectionKey: s.section_key,
            sectionType: s.section_type,
            cms,
            locale: loc,
          }),
        )}

    <CmsSourceBadge
      pageKey="anwendungen.root"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
      <SiblingNav pageKey="anwendungen.root" />
    </CmsPageLayout>

  );

};

export default Anwendungen;
