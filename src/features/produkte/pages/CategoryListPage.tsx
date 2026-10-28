/**
 * Kategorien-Karten für Produktbereiche (Zutrittskontrolle, Eingangslösungen).
 *
 * Aufbau:
 *  1. Hero/Intro aus CMS (`cms_pages.<pageKey>`).
 *  2. Karten-Grid mit Kategorien (DB-Sektionen `category-grid.*`):
 *     Thumbnail (falls in `cms_assets` hinterlegt) + Titel + Untertitel.
 *     Spaltenzahl tariert sich automatisch (2 auf md, 3 auf lg).
 *  3. Klick führt später in den jeweiligen Online-Katalog — bis dahin
 *     reine Übersicht.
 *
 * Inhalte (Titel/Untertitel/Reihenfolge/Bilder) werden zu 100 % im `/admin`
 * gepflegt.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";
import { learnMoreFallback } from "@/i18n/uiFallbacks";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";

interface CategoryCard {
  key: string;
  title: string;
  subtitle: string;
  thumb: string;
  thumbAlt: string;
}

interface ExternalAction {
  href: string;
  label: { de: string; en: string };
}

interface CategoryListPageProps {
  pageKey: string;
  fallbackHeadline: string;
  fallbackIntro?: string;
  /**
   * Map vom vollen Section-Key (z. B. "category-grid.online-leser") auf
   * eine bestehende interne Route. Karten ohne Eintrag bleiben nicht
   * verlinkt (kein Klick, keine falsche Erwartung).
   */
  linkMap?: Record<string, string>;
  /**
   * Optionales CTA-Label je Sprache (z. B. { de: "Mehr erfahren" }).
   * Ohne Eintrag fuer die aktive Sprache greift `common:ui.learnMore`,
   * damit neue Sprachen nicht stumm auf Deutsch zurueckfallen.
   */
  ctaLabel?: Partial<Record<string, string>>;
  /**
   * Optionaler zweiter Tool-Link je Karte (z. B. externer Konfigurator).
   * Wenn gesetzt, wird die Karte mit zwei expliziten Aktions-Links
   * gerendert statt als ganzflächiger Link, damit beide Ziele erreichbar
   * sind. Externe Links werden mit `target="_blank"` + `rel="noopener noreferrer"` geöffnet.
   */
  externalActionMap?: Record<string, ExternalAction>;
}

const CategoryListPage = ({
  pageKey,
  fallbackHeadline,
  fallbackIntro = "",
  linkMap = {},
  ctaLabel = {},
  externalActionMap = {},
}: CategoryListPageProps) => {
  const { t, i18n } = useTranslation();
  const cms = useCmsPageContent(pageKey);
  const loc = normalizeLocale(i18n.language);
  const cta = ctaLabel[loc] ?? learnMoreFallback(loc);

  const headline = cms.text("hero", "headline", loc, fallbackHeadline);
  const intro = cms.text("hero", "intro", loc, fallbackIntro);

  const cards: CategoryCard[] = useMemo(() => {
    return cms.sections
      .filter((s) => s.parent_section_key === "category-grid")
      .map<CategoryCard>((s) => ({
        key: s.section_key,
        title: cms.text(s.section_key, "title", loc, s.section_key),
        subtitle: cms.text(s.section_key, "subtitle", loc, ""),
        thumb: cms.asset(s.section_key, "thumbnail", ""),
        thumbAlt: cms.assetAlt(s.section_key, "thumbnail", loc, ""),
      }));
  }, [cms, loc]);

  const topLevelSections = cms.sections.filter((s) => !s.parent_section_key);

  const dbSectionCount = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero",
  ).length;

  return (
    <>
      <CmsPageLayout
        pageKey={pageKey}
        label=""
        headline={headline}
        intro={intro}
        heroImage=""
        showHeroImage={false}
        fullWidth
      >
        {topLevelSections.map((section) => {
          if (section.section_key === "category-grid") {
            return (
              <section
                key={section.section_key}
                className="py-12 lg:py-20 bg-background"
                data-cms-section="category-grid"
              >
                <div className="container mx-auto">
                  {cards.length === 0 ? (
                    <p className="text-muted-foreground">
                      {t("common:ui.noCategories")}
                    </p>
                  ) : (
                    <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {cards.map((c, idx) => {
                        const href = linkMap[c.key];
                        const ext = externalActionMap[c.key];
                        const extLabel = ext ? (loc === "en" ? ext.label.en : ext.label.de) : "";
                        const hasTwoActions = Boolean(href && ext);

                        const cardInner = (
                          <>
                            {c.thumb ? (
                              <img
                                src={c.thumb}
                                alt={c.thumbAlt}
                                loading="lazy"
                                className="self-stretch w-24 sm:w-28 lg:w-32 object-cover flex-shrink-0"
                                data-cms-field="thumbnail"
                              />
                            ) : (
                              <div className="self-stretch w-24 sm:w-28 lg:w-32 bg-muted flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0 p-5 lg:p-6 flex flex-col">
                              <h3 className="text-base md:text-lg font-heading font-normal text-foreground leading-tight group-hover:text-accent transition-colors" data-cms-field="title">
                                {c.title}
                              </h3>
                              {c.subtitle && (
                                <p className="mt-1 text-sm text-muted-foreground leading-snug" data-cms-field="subtitle">
                                  {c.subtitle}
                                </p>
                              )}
                              {hasTwoActions ? (
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                                  <Link
                                    to={href!}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                                  >
                                    {cta}
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Link>
                                  <a
                                    href={ext!.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-accent hover:underline"
                                  >
                                    {extLabel}
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              ) : href ? (
                                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent" data-cms-field="cta">
                                  {cta}
                                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </span>
                              ) : ext ? (
                                <a
                                  href={ext.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                                >
                                  {extLabel}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                            </div>
                          </>
                        );

                        const baseClasses =
                          "group flex h-full min-h-[7rem] lg:min-h-[8rem] border border-border bg-card overflow-hidden transition-colors hover:border-accent/60 hover:bg-warm/40";

                        return (
                          <motion.div
                            key={c.key}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.4, delay: idx * 0.05 }}
                            data-cms-section={c.key}
                          >
                            {hasTwoActions ? (
                              <div className={baseClasses}>{cardInner}</div>
                            ) : href ? (
                              <Link to={href} className={baseClasses}>
                                {cardInner}
                              </Link>
                            ) : (
                              <div className={baseClasses}>{cardInner}</div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          }

          const rendered = renderPageSectionByType({
            pageKey,
            sectionKey: section.section_key,
            sectionType: section.section_type,
            cms,
            locale: loc,
          });

          return rendered ? <div key={section.section_key}>{rendered}</div> : null;
        })}
      </CmsPageLayout>
      <CmsSourceBadge
        pageKey={pageKey}
        source={cms.hasDbContent ? "db" : "fallback"}
        sectionCount={dbSectionCount}
      />
    </>
  );
};

export default CategoryListPage;
