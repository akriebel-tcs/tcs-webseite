import { motion } from "framer-motion";
import { usePersonaCms } from "@/features/personas/shared/usePersonaCms";
import { PersonaBodyRenderer } from "@/features/personas/shared/PersonaBodyRenderer";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { Teaser2ColV1 } from "@/features/cms/components/sections/Teaser2ColV1";

const statKeysFallback = ["twoWire", "experience", "made", "hotline"] as const;
const PAGE_KEY = "personas.handwerk";

const HandwerkContent = () => {
  const { cms, tx, txItem, listItems, loc } = usePersonaCms("handwerk");
  const teaserSections = cms.sections
    .filter((s) => s.section_type === "teaser_2col_v1" && s.section_key.startsWith("solution_teaser_"))
    .sort((a, b) => a.sort_order - b.sort_order);
  // Sichtbarkeits-Bindung: RLS liefert nur aktive Sections. Ist der Block
  // `solutions` im Admin ausgeblendet, entfaellt der Wrapper komplett.
  const solutionsActive = cms.sections.some((s) => s.section_key === "solutions");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // CMS-Schalter: Ist die Seite aus der DB geladen, zeigt RLS nur aktive
  // Sections. Fehlt hero/stats dort, ist der Block ausgeblendet.
  const isShown = (key: string) => !cms.hasDbContent || cms.sections.some((s) => s.section_key === key);
  const statKeys = listItems("stats", statKeysFallback);

  return (
    <>
      {isShown("hero") && (
      <section className="bg-background" data-cms-section="hero">
        <div className="container mx-auto pt-16 pb-12 lg:pt-24 lg:pb-16">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-sm text-muted-foreground mb-6">{tx("hero", "eyebrow")}</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-normal leading-[1.15] text-foreground max-w-4xl">{tx("hero", "headline")}</motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mt-8">{tx("hero", "intro")}</motion.p>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="w-full">
          <img data-cms-field="image" src={cms.asset("hero", "image", "")} alt={tx("hero", "imageAlt")} className="w-full h-[50vh] lg:h-[70vh] object-cover" width={1920} height={1080} />
        </motion.div>
      </section>
      )}

      {isShown("stats") && (
      <section className="py-16 lg:py-20 border-b border-border" data-cms-section="stats">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {statKeys.map((key, i) => (
              <motion.div key={key} data-cms-section={`stats_item_${key}`} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} className="text-center">
                <div data-cms-field="value" className="text-2xl md:text-3xl font-heading text-foreground mb-1">{txItem("stats", key, "value")}</div>
                <div data-cms-field="label" className="text-xs md:text-sm text-muted-foreground">{txItem("stats", key, "label")}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {solutionsActive && teaserSections.length > 0 && (
        <section className="py-20 lg:py-28 bg-section-muted" id="loesungen" data-cms-section="solutions">
          <div className="container mx-auto">
            <div className="mb-16 lg:mb-20">
              <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-heading font-normal text-foreground leading-tight max-w-2xl">{tx("solutions", "headline")}</h2>
              <p className="text-muted-foreground mt-5 max-w-xl text-base">{tx("solutions", "intro")}</p>
            </div>
            <div className="space-y-0">
              {teaserSections.map((sec) => (
                <Teaser2ColV1 key={sec.section_key} pageKey={PAGE_KEY} cms={cms} locale={loc} sectionKey={sec.section_key} children={[]} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Body — DB-getriebene Reihenfolge (highlights, tips, faq, standard_cta). */}
      <PersonaBodyRenderer pageKey={PAGE_KEY} cms={cms} locale={loc} />

      <CmsSourceBadge pageKey={PAGE_KEY} source={hasRichContent ? "db" : "fallback"} sectionCount={hasRichContent ? dbSectionCount : undefined} />
    </>
  );
};

export default HandwerkContent;
