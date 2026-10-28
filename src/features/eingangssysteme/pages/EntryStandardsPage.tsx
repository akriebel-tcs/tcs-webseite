import { motion } from "framer-motion";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsBodyRenderer from "@/features/cms/components/CmsBodyRenderer";
import SiblingNav from "@/components/SiblingNav";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const itemKeys = ["unterputzmontage", "inputzmontage", "funktionsmoduleAmi"] as const;

const itemImages: Record<(typeof itemKeys)[number], string> = {
  unterputzmontage: "",
  inputzmontage: "",
  funktionsmoduleAmi: "",
};

const downloadKeys = ["unterputzAmi", "inputzAmi", "zubehoerAmi"] as const;

const downloadUrls: Record<(typeof downloadKeys)[number], string> = {
  unterputzAmi:
    "https://www.tcs-entry.de/app/download/8046559354/Entry_Standards_SerieAMI_Unterputzmontage_Datenblatt_de.pdf?t=1606823914",
  inputzAmi:
    "https://www.tcs-entry.de/app/download/8046561254/Entry_Standards_SerieAMI_Inputzmontage_Datenblatt_de.pdf?t=1606823914",
  zubehoerAmi:
    "https://www.tcs-entry.de/app/download/8046561154/Entry_Standards_SerieAMI_Datenblatt_Zubeh%C3%B6r_de.pdf?t=1606823914",
};

const EntryStandards = () => {
  const { t, cms, loc } = useCmsI18n("eingangssysteme.standards", "eingangssysteme", "standards");
  const heroImage = cms.asset("hero", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 3 HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING
  const itemsActive = cms.sections.some(s => s.section_key === "items");
  const downloadsActive = cms.sections.some(s => s.section_key === "downloads");
  const navActive = cms.sections.some(s => s.section_key === "nav");

  return (
    <CmsPageLayout pageKey="eingangssysteme.standards"
      label={t("standards.hero.label")}
      headline={t("standards.hero.headline")}
      intro={t("standards.hero.intro")}
      heroImage={heroImage}
      fullWidth
    >
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto">
          {/* Downloads */}
          {downloadsActive && (
          <div className="mb-12">
            <h2 className="text-lg font-heading font-semibold text-foreground mb-4">
              {t("standards.downloads.title")}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {downloadKeys.map((key) => (
                <a
                  key={key}
                  href={downloadUrls[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors text-sm text-foreground hover:text-primary"
                >
                  <span className="shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">PDF</span>
                  {t(`standards.downloads.items.${key}.label`)}
                </a>
              ))}
            </div>
          </div>
          )}

          {/* Standards Grid — DB-first */}
          {cms.sections.some(s => s.section_type === "cards_v1" && s.section_key === "items") ? (
            <CmsBodyRenderer pageKey="eingangssysteme.standards" cms={cms} />
          ) : itemsActive ? (
            <div className="grid md:grid-cols-3 gap-8">
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
                      alt={t(`standards.items.${key}.imageAlt`)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <span className="text-xs text-muted-foreground block">
                      {t(`standards.items.${key}.subtitle`)}
                    </span>
                    <h3 className="text-base font-heading font-semibold text-foreground">
                      {t(`standards.items.${key}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`standards.items.${key}.text`)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}

          {navActive && <SiblingNav pageKey="eingangssysteme.standards" className="mt-12" />}

        </div>
      </section>

    <CmsSourceBadge
      pageKey="eingangssysteme.standards"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default EntryStandards;
