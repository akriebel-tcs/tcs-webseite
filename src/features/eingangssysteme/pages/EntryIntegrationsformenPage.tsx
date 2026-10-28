/**
 * Eingangssysteme → Integrationsformen.
 * Spiegel-Regel: Karten kommen 1:1 aus DB (cards_v1 + 4× card_v1).
 * Code-Fallback nur bei leerer DB.
 */
import { motion } from "framer-motion";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsBodyRenderer from "@/features/cms/components/CmsBodyRenderer";
import SiblingNav from "@/components/SiblingNav";
import { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const PAGE_KEY = "eingangssysteme.integrationsformen";
const itemKeys = ["inPutz", "unterPutz", "aufPutz", "freistehend"] as const;
const itemImages: Record<(typeof itemKeys)[number], string> = {
  inPutz: "",
  unterPutz: "",
  aufPutz: "",
  freistehend: "",
};

const EntryIntegrationsformen = () => {
  const { t, loc } = useCmsI18n("eingangssysteme.integrationsformen", "eingangssysteme", "integrationsformen");
  const cms = useCmsPageContent(PAGE_KEY);
  const heroImage = cms.asset("hero", "image", "");
  const hasDbCards = cms.sections.some(s => s.section_type === "cards_v1" && s.section_key === "items");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 3 HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING
  const itemsActive = cms.sections.some(s => s.section_key === "items");
  const navActive = cms.sections.some(s => s.section_key === "nav");

  return (
    <CmsPageLayout
      pageKey={PAGE_KEY}
      label={t("integrationsformen.hero.label")}
      headline={t("integrationsformen.hero.headline")}
      intro={t("integrationsformen.hero.intro")}
      heroImage={heroImage}
      fullWidth
    >
      {hasDbCards ? (
        <CmsBodyRenderer pageKey={PAGE_KEY} cms={cms} />
      ) : itemsActive ? (
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto">
            <div className="grid sm:grid-cols-2 gap-8">
              {itemKeys.map((key, i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-secondary overflow-hidden">
                    <img
                      src={itemImages[key]}
                      alt={t(`integrationsformen.items.${key}.imageAlt`)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <span className="text-xs text-muted-foreground block">{t(`integrationsformen.items.${key}.subtitle`)}</span>
                    <h3 className="text-base font-heading font-semibold text-foreground">{t(`integrationsformen.items.${key}.title`)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(`integrationsformen.items.${key}.text`)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {navActive && <SiblingNav pageKey={PAGE_KEY} className="pb-16" />}


      <CmsSourceBadge pageKey={PAGE_KEY} source={hasRichContent ? "db" : "fallback"} sectionCount={hasRichContent ? dbSectionCount : undefined} />
    </CmsPageLayout>
  );
};

export default EntryIntegrationsformen;
