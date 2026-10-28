/**
 * Eingangssysteme → Materialien.
 *
 * Spiegel-Regel: Inhalt der 6 Material-Karten kommt 1:1 aus der DB
 * (`cms_sections` items/cards_v1 + 6× card_v1 + `cms_assets`).
 * Im Admin /admin sind die Karten als bearbeitbare Blöcke sichtbar
 * (Titel, Eyebrow/Subline, Beschreibung, Merkmals-Liste, Bild).
 * Code-Fallback (i18n + Hardcode) greift nur, wenn die DB leer ist.
 */
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsBodyRenderer from "@/features/cms/components/CmsBodyRenderer";
import SiblingNav from "@/components/SiblingNav";
import { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { motion } from "framer-motion";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const PAGE_KEY = "eingangssysteme.material";

const itemKeys = [
  "aluminium",
  "edelstahl",
  "messingSatiniert",
  "bronzeBaubronze",
  "pulverbeschichtung",
  "mineralwerkstoff",
] as const;

const itemImages: Record<(typeof itemKeys)[number], string> = {
  aluminium: "",
  edelstahl: "",
  messingSatiniert: "",
  bronzeBaubronze: "",
  pulverbeschichtung: "",
  mineralwerkstoff: "",
};

const EntryMaterial = () => {
  const { t, loc } = useCmsI18n("eingangssysteme.material", "eingangssysteme", "material");
  const cms = useCmsPageContent(PAGE_KEY);
  const heroImage = cms.asset("hero", "image", "");

  // Spiegel-Regel: Wenn die DB strukturierte Karten enthält, rendert der CMS-Body
  // (CardsSectionV1) die Karten. Sonst greift der i18n-Code-Fallback.
  const hasDbCards = cms.sections.some(
    s => s.section_type === "cards_v1" && s.section_key === "items",
  );
  const dbSectionCount = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero",
  ).length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 3 HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING
  const itemsActive = cms.sections.some(s => s.section_key === "items");
  const navActive = cms.sections.some(s => s.section_key === "nav");

  return (
    <CmsPageLayout
      pageKey={PAGE_KEY}
      label={t("material.hero.label")}
      headline={t("material.hero.headline")}
      intro={t("material.hero.intro")}
      heroImage={heroImage}
      fullWidth
    >
      {hasDbCards ? (
        <CmsBodyRenderer pageKey={PAGE_KEY} cms={cms} />
      ) : itemsActive ? (
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {itemKeys.map((key, i) => {
                const features = t(`material.items.${key}.features`, {
                  returnObjects: true,
                }) as string[];
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="bg-card border border-border rounded-lg overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-secondary overflow-hidden">
                      <img
                        src={itemImages[key]}
                        alt={t(`material.items.${key}.imageAlt`)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-5 space-y-3">
                      <span className="text-xs text-muted-foreground block">
                        {t(`material.items.${key}.subtitle`)}
                      </span>
                      <h3 className="text-base font-heading font-semibold text-foreground">
                        {t(`material.items.${key}.title`)}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t(`material.items.${key}.text`)}
                      </p>
                      <ul className="space-y-1">
                        {features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {navActive && <SiblingNav pageKey="eingangssysteme.material" className="pb-16" />}


      <CmsSourceBadge
        pageKey={PAGE_KEY}
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
    </CmsPageLayout>
  );
};

export default EntryMaterial;
