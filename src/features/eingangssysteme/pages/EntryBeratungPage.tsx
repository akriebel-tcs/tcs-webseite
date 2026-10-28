import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { FaqV1 } from "@/features/cms/components/sections/FaqV1";
import SiblingNav from "@/components/SiblingNav";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const EntryBeratung = () => {
  const { t, cms, loc } = useCmsI18n("eingangssysteme.beratung", "eingangssysteme", "beratung");
  const heroImage = cms.asset("hero", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // D2b.3 / Batch 3 Sichtbarkeits-Bindung (HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING)
  const ctaActive = cms.sections.some(s => s.section_key === "cta");
  const topicsActive = cms.sections.some(s => s.section_key === "topics");
  const navActive = cms.sections.some(s => s.section_key === "nav");

  const konzeptItems = t("beratung.topics.konzept.items", { returnObjects: true }) as string[];
  const technologieItems = t("beratung.topics.technologie.items", { returnObjects: true }) as string[];

  return (
    <CmsPageLayout pageKey="eingangssysteme.beratung"
      label={t("beratung.hero.label")}
      headline={t("beratung.hero.headline")}
      intro={t("beratung.hero.intro")}
      heroImage={heroImage}
      fullWidth
    >
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto">
          {topicsActive && (
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-heading font-semibold text-foreground">
                {t("beratung.topics.konzept.title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("beratung.topics.konzept.intro")}
              </p>
              <ul className="space-y-2">
                {konzeptItems.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-heading font-semibold text-foreground">
                {t("beratung.topics.technologie.title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("beratung.topics.technologie.intro")}
              </p>
              <ul className="space-y-2">
                {technologieItems.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
          )}

          {/* CTA — HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING (D2b.3) */}
          {ctaActive && (
            <div className="mt-16 bg-primary/5 border border-primary/20 rounded-lg p-8 max-w-2xl">
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                {t("beratung.cta.title")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("beratung.cta.text")}
              </p>
              <Link
                to="/kontakt"
                className="inline-flex items-center px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {t("beratung.cta.cta")}
              </Link>
            </div>
          )}

          {navActive && <SiblingNav pageKey="eingangssysteme.beratung" className="mt-12" />}

        </div>
      </section>

      {cms.sections.filter(s => s.section_type === "faq_v1" && !s.parent_section_key).map(s => (
        <FaqV1 key={s.section_key} pageKey="eingangssysteme.beratung" cms={cms} locale={loc} sectionKey={s.section_key} children={[]} />
      ))}


    <CmsSourceBadge
      pageKey="eingangssysteme.beratung"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default EntryBeratung;
