import { motion } from "framer-motion";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { FaqV1 } from "@/features/cms/components/sections/FaqV1";
import SiblingNav from "@/components/SiblingNav";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const itemKeys = [
  "forumMuseumsinsel",
  "pulse",
  "weidtParkCorner",
  "hamburgerFamiliendomizil",
  "fritzTower",
  "potsdamerWohnhaus",
] as const;

const EntryReferenzen = () => {
  const { t, cms, loc } = useCmsI18n("eingangssysteme.referenzen", "eingangssysteme", "referenzen");
  const heroImage = cms.asset("hero", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 3 HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING
  const itemsActive = cms.sections.some(s => s.section_key === "items");
  const labelsActive = cms.sections.some(s => s.section_key === "labels");
  const navActive = cms.sections.some(s => s.section_key === "nav");

  return (
    <CmsPageLayout pageKey="eingangssysteme.referenzen"
      label={t("referenzen.hero.label")}
      headline={t("referenzen.hero.headline")}
      intro={t("referenzen.hero.intro")}
      heroImage={heroImage}
      fullWidth
    >
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto space-y-16">
          {itemsActive && itemKeys.map((key, i) => {
            const scope = t(`referenzen.items.${key}.scope`, { returnObjects: true }) as string[];
            const itemImage = cms.asset("items", `${key}.image`, "");
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className={`grid md:grid-cols-2 gap-8 items-start ${i % 2 === 1 ? "" : ""}`}
              >
                <div className={`aspect-[4/3] rounded-lg overflow-hidden bg-secondary ${i % 2 === 1 ? "md:order-2" : ""}`}>
                  {itemImage ? (
                    <img
                      src={itemImage}
                      alt={cms.assetAlt("items", `${key}.image`, loc, t(`referenzen.items.${key}.imageAlt`))}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : ""}>
                  <span className="text-xs text-muted-foreground block mb-1">
                    {t(`referenzen.items.${key}.subtitle`)}
                  </span>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                    {t(`referenzen.items.${key}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {t(`referenzen.items.${key}.description`)}
                  </p>
                  {labelsActive && (
                  <div className="mb-4">
                    <span className="text-xs font-semibold text-foreground block mb-1">
                      {t("referenzen.labels.designWish")}
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`referenzen.items.${key}.design`)}
                    </p>
                  </div>
                  )}
                  {labelsActive && (
                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-2">
                      {t("referenzen.labels.scope")}
                    </span>
                    <ul className="space-y-1">
                      {scope.map((s) => (
                        <li key={s} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {navActive && <SiblingNav pageKey="eingangssysteme.referenzen" className="pt-8" />}

        </div>
      </section>

      {cms.sections.filter(s => s.section_type === "faq_v1" && !s.parent_section_key).map(s => (
        <FaqV1 key={s.section_key} pageKey="eingangssysteme.referenzen" cms={cms} locale={loc} sectionKey={s.section_key} children={[]} />
      ))}


    <CmsSourceBadge
      pageKey="eingangssysteme.referenzen"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default EntryReferenzen;
