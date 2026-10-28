import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { Teaser2ColV1 } from "@/features/cms/components/sections/Teaser2ColV1";
import { listChildItems, txChildField } from "@/features/cms/utils/cmsItemHelpers";
import { resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { learnMoreFallback } from "@/i18n/uiFallbacks";


const FALLBACK_PILLAR_KEYS = ["derEingang", "herstellerGewerke", "lifecycle"] as const;


/** DB-first Wechselteaser (sieben Karten) — Reihenfolge folgt cms_sections.sort_order. */
const TEASER_SECTION_KEYS = [
  "teaser_design",
  "teaser_funktionalitaet",
  "teaser_material",
  "teaser_integrationsformen",
  "teaser_referenzen",
  "teaser_standards",
  "teaser_beratung",
];



const downloadItems = [
  {
    key: "entryExpose",
    url: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/Publikationen/20241105_Entry-Expose_V1_9.pdf",
  },
  {
    key: "broschuereSonderbau",
    url: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/Publikationen/VF9687_Broschu__re_Sonderbau_Web_lowres.pdf",
  },
  {
    key: "datenblattUnterputz",
    url: "https://www.tcs-entry.de/app/download/8046559354/Entry_Standards_SerieAMI_Unterputzmontage_Datenblatt_de.pdf?t=1606823914",
  },
  {
    key: "datenblattInputz",
    url: "https://www.tcs-entry.de/app/download/8046561254/Entry_Standards_SerieAMI_Inputzmontage_Datenblatt_de.pdf?t=1606823914",
  },
  {
    key: "datenblattZubehoer",
    url: "https://www.tcs-entry.de/app/download/8046561154/Entry_Standards_SerieAMI_Datenblatt_Zubeh%C3%B6r_de.pdf?t=1606823914",
  },
] as const;

const EntrySystem = () => {
  const { t, cms, loc } = useCmsI18n("eingangssysteme.root", "eingangssysteme", "root");
  const shortIdMap = useShortIdResolver();
  const heroSet = cms.assetSet("hero", "image");

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


  const teaserSections = cms.sections
    .filter((s) => s.section_type === "teaser_2col_v1" && TEASER_SECTION_KEYS.includes(s.section_key))
    .sort((a, b) => a.sort_order - b.sort_order);
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // D2b.3 / Batch 3 Sichtbarkeits-Bindung (HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING)
  const ctaActive = cms.sections.some(s => s.section_key === "cta");
  const pillarsActive = cms.sections.some(s => s.section_key === "pillars");
  const downloadsActive = cms.sections.some(s => s.section_key === "downloads");

  return (
    <CmsPageLayout pageKey="eingangssysteme.root"
      label={t("root.hero.label")}
      headline={t("root.hero.headline")}
      intro={t("root.hero.intro")}
      heroImage={heroSet.desktop ?? heroSet.any ?? ""}
      heroImageDesktop={heroSet.desktop ?? ""}
      heroImageTablet={heroSet.tablet ?? ""}
      heroImageMobile={heroSet.mobile ?? ""}
      fullWidth
      darkHero
    >

      {/* Three Pillars — DB-first pillars_item_<key> (card_v1) */}
      {pillarsActive && (
      <section className="py-16 lg:py-24 bg-neutral-900 text-neutral-200" data-cms-page="eingangssysteme.root">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {listChildItems(cms, "pillars", "card_v1", FALLBACK_PILLAR_KEYS).map((key, i) => {
              const label = txChildField(cms, loc, "pillars", key, "subtitle", t(`root.pillars.${key}.label`, { defaultValue: "" }));
              const title = txChildField(cms, loc, "pillars", key, "title", t(`root.pillars.${key}.title`, { defaultValue: key }));
              const text = txChildField(cms, loc, "pillars", key, "description", t(`root.pillars.${key}.text`, { defaultValue: "" }));
              const extras = buildCardExtras(`pillars_item_${key}`, "pillars");
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="space-y-3"
                  data-cms-section={`pillars_item_${key}`}
                >
                  <span className="text-xs text-neutral-400 tracking-wide uppercase" data-cms-field="subtitle">{label}</span>
                  <h3 className="text-lg font-heading font-semibold text-neutral-100" data-cms-field="title">{title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed" data-cms-field="description">{text}</p>
                  {extras.bullets.length > 0 && (<ul className="mt-2 space-y-1 text-sm text-neutral-400 list-disc pl-5 marker:text-primary" data-cms-field="bullets">{extras.bullets.map((b, bi) => <li key={bi}>{b}</li>)}</ul>)}
                  {extras.chips.length > 0 && (<ul className="mt-2 flex flex-wrap gap-1.5" data-cms-field="chips">{extras.chips.map((c, ci) => (<li key={ci} className="inline-flex items-center rounded-full bg-neutral-800 text-neutral-300 px-2.5 py-0.5 text-[11px]">{c}</li>))}</ul>)}
                  {extras.links.length > 0 && (<div className="mt-2 flex flex-col gap-1" data-cms-field="links">{extras.links.map((l) => (<a key={l.n} href={l.href} className="text-sm text-primary hover:underline self-start">{l.label} →</a>))}</div>)}
                </motion.div>
              );
            })}

          </div>
        </div>
      </section>
      )}


      {/* Entry entdecken — DB-first Wechselteaser (sieben Karten) */}
      {teaserSections.length > 0 && (
        <section className="py-12 lg:py-16 bg-background">
          <div className="container mx-auto mb-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mb-4"
            >
              <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-2">
                {t("root.discover.title")}
              </h2>
              <p className="text-muted-foreground max-w-2xl">{t("root.discover.intro")}</p>
            </motion.div>
          </div>
          {teaserSections.map((sec) => (
            <Teaser2ColV1
              key={sec.section_key}
              {...{
                pageKey: "eingangssysteme.root",
                cms,
                locale: loc,
                sectionKey: sec.section_key,
                children: [],
              }}
            />
          ))}
        </section>
      )}


      {/* Downloads */}
      {downloadsActive && (
      <section className="py-16 lg:py-24 bg-section-muted">
        <div className="container mx-auto">
          <h2 className="text-2xl font-heading font-normal text-foreground mb-6">
            {t("root.downloads.title")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl text-sm">
            {t("root.downloads.intro")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {downloadItems.map((dl) => {
              const label = txChildField(cms, loc, "downloads", dl.key, "title", t(`root.downloads.items.${dl.key}.label`, { defaultValue: dl.key }));
              return (
                <a
                  key={dl.key}
                  href={dl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors text-sm text-foreground hover:text-primary"
                  data-cms-section={`downloads_item_${dl.key}`}
                  data-cms-field="title"
                >
                  <span className="shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    PDF
                  </span>
                  {label}
                </a>
              );
            })}
          </div>

        </div>
      </section>
      )}

      {/* CTA — HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING (D2b.3) */}
      {ctaActive && (
        <section className="py-16 lg:py-24 bg-primary/5 border-t border-primary/20">
          <div className="container mx-auto text-center">
            <h2 className="text-2xl font-heading font-normal text-foreground mb-3">
              {t("root.cta.title")}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-sm">
              {t("root.cta.text")}
            </p>
            <Link
              to="/kontakt"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t("root.cta.cta")}
            </Link>
          </div>
        </section>
      )}

    <CmsSourceBadge
      pageKey="eingangssysteme.root"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default EntrySystem;
