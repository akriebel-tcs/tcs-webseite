import { motion } from "framer-motion";
import { usePersonaCms } from "@/features/personas/shared/usePersonaCms";
import { PersonaBodyRenderer } from "@/features/personas/shared/PersonaBodyRenderer";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import WoWiHero from "./WoWiHero";

/**
 * Wohnungswirtschaft — DB-first ohne Sonder-Wrapper.
 *
 * Hero und Stats bleiben als Layout-Hüllen im JSX. Alle übrigen Blöcke
 * (Kartenraster `cards_v1`, Wechselteaser `teaser_2col_v1`, Inhalt, FAQ,
 * CTA) rendert `PersonaBodyRenderer` strikt in der Reihenfolge von
 * `cms_sections.sort_order` — die Admin-Sortierung im CMS-Light wirkt
 * damit 1:1 öffentlich (Spiegel-Regel).
 */

const statItemsFallback = ["experience", "projects", "made", "management"] as const;
const PAGE_KEY = "personas.wohnungswirtschaft";

const WohnungswirtschaftContent = () => {
  const { cms, txItem, listItems, loc } = usePersonaCms("wohnungswirtschaft");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // CMS-Schalter: Ist die Seite aus der DB geladen, zeigt RLS nur aktive
  // Sections. Fehlt hero/stats dort, ist der Block ausgeblendet.
  const isShown = (key: string) => !cms.hasDbContent || cms.sections.some((s) => s.section_key === key);
  const statKeys = listItems("stats", statItemsFallback);
  return (
    <>
      {/* Hero */}
      {isShown("hero") && <WoWiHero />}

      {/* Stats */}
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

      {/* Body — 1:1 DB-Reihenfolge (`cms_sections.sort_order`): Wechselteaser
          (`teaser_2col_v1`) und Kartenraster (`cards_v1`) stehen exakt dort,
          wo sie im CMS-Light sortiert sind. Kein Sonder-Wrapper mehr, der
          Teaser vorgruppiert hätte (Spiegel-Regel). */}
      <PersonaBodyRenderer
        pageKey={PAGE_KEY}
        cms={cms}
        locale={loc}
        skipKeys={["hero", "stats", "solutions"]}
        disableDefaultSkips
      />

      <CmsSourceBadge
        pageKey={PAGE_KEY}
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />

    </>
  );
};

export default WohnungswirtschaftContent;
