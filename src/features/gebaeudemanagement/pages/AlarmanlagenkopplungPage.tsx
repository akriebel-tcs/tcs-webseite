import PageLayout, { ContentSection } from "@/components/PageLayout";
import SiblingNav from "@/components/SiblingNav";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";

import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

/**
 * Platzhalterseite für Alarmanlagenkopplung (Etappe 14e-1).
 *
 * Hintergrund: Der Menüpunkt `gebaeudemanagement.alarm` in der Hauptnavigation
 * zeigte bisher auf `/gebaeudemanagement` (Top-Level der Domain) und besaß
 * keine eigene Zielroute. Diese Seite stellt eine eigenständige Platzhalter-
 * URL `/gebaeudemanagement/alarmanlagenkopplung` bereit, damit der Menüpunkt
 * nicht mehr fälschlich auf die Domain-Übersicht verweist.
 *
 * Inhalt wird in einer späteren Etappe ergänzt. Keine neuen Assets,
 * keine Layout-Experimente.
 *
 * Etappe 19a-1: Texte nach i18n-Namespace `gebaeudemanagement` migriert.
 */
const AlarmanlagenkopplungPage = () => {
  const { t, cms, loc } = useCmsI18n("gebaeudemanagement.alarmanlagenkopplung", "gebaeudemanagement", "alarmanlagenkopplung");
  const heroImage = cms.asset("hero", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 14: Section-Gate — Admin-Schalter `is_active=false` auf
  // `placeholder` blendet den Block public sichtbar aus.
  const placeholderActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "placeholder");

  return (
    <CmsPageLayout pageKey="gebaeudemanagement.alarmanlagenkopplung"
      label={t("shared.label")}
      headline={t("alarmanlagenkopplung.hero.headline")}
      intro={t("alarmanlagenkopplung.hero.intro")}
      heroImage={heroImage}
    >
      {placeholderActive && (
        <section className="py-16 lg:py-24 bg-background" data-cms-section="placeholder">
          <div className="container mx-auto">
            <ContentSection
              label={t("alarmanlagenkopplung.placeholder.label")}
              title={t("alarmanlagenkopplung.placeholder.title")}
            >
              <p className="text-muted-foreground leading-relaxed max-w-3xl">
                {t("alarmanlagenkopplung.placeholder.text")}
              </p>
            </ContentSection>
          </div>
        </section>
      )}
      <CmsTailFaq pageKey="gebaeudemanagement.alarmanlagenkopplung" />
      <CmsSourceBadge
        pageKey="gebaeudemanagement.alarmanlagenkopplung"
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
          <SiblingNav pageKey="gebaeudemanagement.alarmanlagenkopplung" />
    </CmsPageLayout>
  );
};

export default AlarmanlagenkopplungPage;
