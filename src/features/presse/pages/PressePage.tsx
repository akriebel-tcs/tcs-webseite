import { Calendar, Download, Mail } from "lucide-react";
import { motion } from "framer-motion";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { learnMoreFallback } from "@/i18n/uiFallbacks";


const Presse = () => {
  const { t, cms, loc } = useCmsI18n("presse.root", "presse");
  const shortIdMap = useShortIdResolver();
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;

  // Batch 47 — card_v1-Vertrag in Sonderpfaden: Bullets/Chips/Links zentral.
  const buildCardExtras = (sectionKey: string, parentSectionKey: string) => {
    const vis = resolveCardVisibility({
      valueFor: (fk, l) => cms.text(sectionKey, fk, l, "") || null,
      hasImage: !!cms.asset(sectionKey, "image", ""),
      hasThumbnail: false,
      hasIconImage: !!cms.asset(sectionKey, "icon_image", ""),
      parentSectionType: "cards_v1",
      parentSectionKey,
    });
    const bullets = [0,1,2,3,4].filter(i => vis.bulletsVisible[i])
      .map(i => cms.text(sectionKey, `bullets.${i}`, loc, "") || cms.text(sectionKey, `features.${i}`, loc, ""))
      .filter(Boolean);
    const chips = [0,1,2,3,4].filter(i => vis.chipsVisible[i])
      .map(i => cms.text(sectionKey, `chips.${i}`, loc, "")).filter(Boolean);
    const links = vis.linksVisible.map((visible, idx) => {
      if (!visible) return null;
      const n = idx + 1;
      const r = resolveHref(cms.text(sectionKey, `link_${n}_href`, loc, ""), shortIdMap);
      if (!r.valid) return null;
      return { n, label: cms.text(sectionKey, `link_${n}_label`, loc, "") || learnMoreFallback(loc), href: r.href };
    }).filter((l): l is { n: number; label: string; href: string } => l !== null);
    return { bullets, chips, links };
  };


  // Tranche 12-renderer: card_v1-Kindsections unter `releases` DB-first lesen,
  // i18n bleibt Fallback (date/categories liegen weiterhin nur in i18n).
  const releaseCards = cms.sections
    .filter((s) => s.parent_section_key === "releases" && s.section_type === "card_v1")
    .sort((a, b) => a.sort_order - b.sort_order);
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 14: Section-Gate `releases` — Admin-Schalter wirkt jetzt public.
  const releasesActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "releases");

  const pressReleases = [
    { key: "bcm2025", categoryKey: "produkt" },
    { key: "lightBuilding2025", categoryKey: "messe" },
    { key: "rekordumsatz2024", categoryKey: "unternehmen" },
    { key: "appleHomeKey", categoryKey: "produkt" },
    { key: "akademie2024", categoryKey: "unternehmen" },
  ] as const;

  return (
    <>
      <AutoBreadcrumb />
      <CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />
      <section className="bg-background">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-sm text-muted-foreground tracking-wide uppercase mb-4">{t("hero.label")}</p>
            <h1 className="text-3xl lg:text-5xl font-heading font-semibold tracking-tight leading-tight max-w-3xl mb-6">
              {t("hero.headline")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {t("hero.intro")}
            </p>
          </motion.div>
        </div>
      </section>

      {releasesActive && (
      <section className="container mx-auto py-16 lg:py-24" data-cms-section="releases">
        <h2 className="text-2xl font-heading font-semibold mb-10">{t("releases.title")}</h2>
        <div className="space-y-6 max-w-4xl">
          {(releaseCards.length > 0
            ? releaseCards.map((c) => {
                const legacyKey = c.section_key.replace(/^releases__/, "");
                const meta = pressReleases.find((r) => r.key === legacyKey);
                return {
                  sectionKey: c.section_key,
                  legacyKey,
                  categoryKey: meta?.categoryKey ?? "produkt",
                };
              })
            : pressReleases.map((r) => ({
                sectionKey: `releases__${r.key}`,
                legacyKey: r.key,
                categoryKey: r.categoryKey,
              }))
          ).map((release) => {
            const title = cms.text(
              release.sectionKey, "title", loc,
              t(`releases.items.${release.legacyKey}.title`, { defaultValue: "" }),
            );
            const date = cms.text(
              release.sectionKey, "subtitle", loc,
              t(`releases.items.${release.legacyKey}.date`, { defaultValue: "" }),
            );
            const extras = buildCardExtras(release.sectionKey, "releases");
            const downloadLink = extras.links[0];
            return (
              <article key={release.sectionKey} data-cms-section={release.sectionKey} className="border-b border-border pb-6 last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  <span data-cms-field="subtitle" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {date}
                  </span>
                  <span className="text-xs bg-secondary px-2.5 py-0.5 text-muted-foreground">
                    {t(`releases.categories.${release.categoryKey}`)}
                  </span>
                </div>
                <h3 data-cms-field="title" className="text-lg font-medium mb-2 hover:text-muted-foreground transition-colors cursor-pointer">
                  {title}
                </h3>
                {extras.bullets.length > 0 && (
                  <ul className="mt-2 mb-2 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary" data-cms-field="bullets">
                    {extras.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                  </ul>
                )}
                {extras.chips.length > 0 && (
                  <ul className="mt-2 mb-2 flex flex-wrap gap-1.5" data-cms-field="chips">
                    {extras.chips.map((c, ci) => (
                      <li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>
                    ))}
                  </ul>
                )}
                {downloadLink ? (
                  <a
                    href={downloadLink.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    data-cms-field="links"
                  >
                    <Download className="w-3.5 h-3.5" /> {downloadLink.label}
                  </a>
                ) : (
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> {t("releases.downloadPdf")}
                  </button>
                )}
              </article>
            );
          })}

        </div>
      </section>
      )}


      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />
      <section className="bg-section-muted">
        <div className="container mx-auto py-16 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-heading font-semibold mb-6">{t("pressContact.title")}</h2>
            <p className="text-muted-foreground mb-8">
              {t("pressContact.intro")}
            </p>
            <div className="bg-background border border-border p-8">
              <p className="font-medium mb-1">{t("pressContact.name")}</p>
              <p className="text-sm text-muted-foreground mb-4">{t("pressContact.address")}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Mail className="w-4 h-4" /> presse@tcsag.de
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="w-4 h-4" />
                <button className="hover:text-foreground transition-colors">{t("pressContact.downloadKit")}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

    <CmsSourceBadge
      pageKey="presse.root"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
    </>
  );
};

export default Presse;
