import { motion } from "framer-motion";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsBodyRenderer from "@/features/cms/components/CmsBodyRenderer";
import SiblingNav from "@/components/SiblingNav";
import { useCmsText } from "@/features/cms/hooks/useCmsText";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const cardKeys = ["tableausTerminals", "gestaltungsbaender"] as const;

const cardImages: Record<(typeof cardKeys)[number], string> = {
  tableausTerminals: "",
  gestaltungsbaender: "",
};

const EntryDesign = () => {
  const { t, cms, loc } = useCmsI18n("eingangssysteme.design", "eingangssysteme", "design");
  const tcms = useCmsText(cms, "eingangssysteme");
  const heroImage = cms.asset("hero", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 3 HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING
  const cardsActive = cms.sections.some(s => s.section_key === "cards");
  const navActive = cms.sections.some(s => s.section_key === "nav");

  return (
    <CmsPageLayout pageKey="eingangssysteme.design"
      label={t("design.hero.label")}
      headline={t("design.hero.headline")}
      intro={t("design.hero.intro")}
      heroImage={heroImage}
      fullWidth
    >
      {cms.sections.some(s => s.section_type === "cards_v1" && s.section_key === "cards") ? (
        <CmsBodyRenderer pageKey="eingangssysteme.design" cms={cms} />
      ) : cardsActive ? (
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              {cardKeys.map((key, i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="space-y-4"
                >
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-secondary">
                    <img
                      src={cardImages[key]}
                      alt={tcms("cards", `${key}.imageAlt`, `design.cards.${key}.imageAlt`)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground block">
                    {tcms("cards", `${key}.subtitle`, `design.cards.${key}.subtitle`)}
                  </span>
                  <h3 className="text-lg font-heading font-semibold text-foreground">
                    {tcms("cards", `${key}.title`, `design.cards.${key}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tcms("cards", `${key}.text`, `design.cards.${key}.text`)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {navActive && <SiblingNav pageKey="eingangssysteme.design" className="pb-16" />}


    <CmsSourceBadge
      pageKey="eingangssysteme.design"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default EntryDesign;
