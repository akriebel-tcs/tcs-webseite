import { motion } from "framer-motion";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsBodyRenderer from "@/features/cms/components/CmsBodyRenderer";
import SiblingNav from "@/components/SiblingNav";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const itemKeys = [
  { key: "tuerkommunikation", image: "", hasFeatures: true },
  { key: "accessControl", image: "", hasFeatures: true },
  { key: "verwahrung", image: "", hasFeatures: false },
  { key: "gebaeudesicherheit", image: "", hasFeatures: true },
  { key: "wayfinding", image: "", hasFeatures: true },
  { key: "beleuchtung", image: "", hasFeatures: false },
  { key: "service", image: "", hasFeatures: false },
] as const;

const EntryFunktionalitaet = () => {
  const { t, cms, loc } = useCmsI18n("eingangssysteme.funktionalitaet", "eingangssysteme", "funktionalitaet");
  const heroImage = cms.asset("hero", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 3 HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING
  const itemsActive = cms.sections.some(s => s.section_key === "items");
  const navActive = cms.sections.some(s => s.section_key === "nav");

  return (
    <CmsPageLayout pageKey="eingangssysteme.funktionalitaet"
      label={t("funktionalitaet.hero.label")}
      headline={t("funktionalitaet.hero.headline")}
      intro={t("funktionalitaet.hero.intro")}
      heroImage={heroImage}
      fullWidth
    >
      {cms.sections.some(s => s.section_type === "cards_v1" && s.section_key === "items") ? (
        <CmsBodyRenderer pageKey="eingangssysteme.funktionalitaet" cms={cms} />
      ) : itemsActive ? (
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto space-y-16">
            {itemKeys.map((item, i) => {
              const features = item.hasFeatures
                ? (t(`funktionalitaet.items.${item.key}.features`, { returnObjects: true }) as string[])
                : null;
              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? "md:direction-rtl" : ""}`}
                >
                  <div className={`aspect-[4/3] rounded-lg overflow-hidden bg-secondary ${i % 2 === 1 ? "md:order-2" : ""}`}>
                    <img src={cms.asset("items", `${item.key}.image`, item.image ?? "") || item.image}
                      alt={t(`funktionalitaet.items.${item.key}.imageAlt`)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className={i % 2 === 1 ? "md:order-1" : ""}>
                    <span className="text-xs text-muted-foreground block mb-1">
                      {t(`funktionalitaet.items.${item.key}.subtitle`)}
                    </span>
                    <h3 className="text-lg font-heading font-semibold text-foreground mb-3">
                      {t(`funktionalitaet.items.${item.key}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {t(`funktionalitaet.items.${item.key}.text`)}
                    </p>
                    {features && Array.isArray(features) && (
                      <ul className="space-y-1.5">
                        {features.map((f) => (
                          <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      ) : null}

      {navActive && <SiblingNav pageKey="eingangssysteme.funktionalitaet" className="pb-16" />}


    <CmsSourceBadge
      pageKey="eingangssysteme.funktionalitaet"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default EntryFunktionalitaet;
