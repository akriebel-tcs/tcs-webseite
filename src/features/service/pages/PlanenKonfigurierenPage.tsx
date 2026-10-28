import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, Settings, Download, Cpu, BookOpen, Wrench, LayoutGrid, ExternalLink } from "lucide-react";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsRenderRegistryProvider } from "@/features/cms/components/CmsRenderRegistry";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import CmsTailCta from "@/features/cms/components/CmsTailCta";

import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { listCardItems, txCardItem } from "@/features/service/shared/cmsCardHelpers";
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";


const HOAI_KEYS = ["p12", "p35", "p67", "p8"] as const;
const HOAI_TOOL_KEYS: Record<(typeof HOAI_KEYS)[number], readonly string[]> = {
  p12: ["referenzprojekte", "produktkonfigurator", "entryBeratung"],
  p35: ["ausschreibungstexte", "tcsplan", "cadBim"],
  p67: ["montageanleitungen", "schaltplaene", "installationstechniken"],
  p8: ["firmware", "konfigurationssoftware", "uebergabeprotokolle"],
};
const PLANNING_KEYS = ["dwg", "bim", "gaeb", "datenblatt", "topologie", "leitfaden"] as const;
const CONFIGURATOR_KEYS = ["paket", "produkt", "ktu", "entry", "beschriftung", "einstein"] as const;
const SHOP_KEYS = ["tcs24", "mobile", "signage", "versteckdose"] as const;
const ORDER_KEYS = ["fachhandel", "online", "beratung"] as const;
const AUSSCHREIBUNG_KEYS = ["proProdukt", "komplettexport"] as const;

const PlanenKonfigurieren = () => {
  const { t, cms, loc, i18n } = useCmsI18n("service.planen-konfigurieren", "service", "seiten.planenKonfigurieren");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const base = "seiten.planenKonfigurieren";
  // Batch 17: Section-Gate — `hero` Block respektiert nun is_active.
  const heroActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "hero");

  // Tranche 7c: DB-first Kartenlisten, Legacy bleibt Fallback.
  const planningKeys = listCardItems(cms, "planungsdaten", PLANNING_KEYS);
  const configuratorKeys = listCardItems(cms, "konfiguratoren", CONFIGURATOR_KEYS);
  const shopKeys = listCardItems(cms, "shops", SHOP_KEYS);
  const orderKeys = listCardItems(cms, "bestellwege", ORDER_KEYS);
  const ausschreibungKeys = listCardItems(cms, "ausschreibung", AUSSCHREIBUNG_KEYS);

  return (
    <CmsRenderRegistryProvider>
      <AutoBreadcrumb />
      {/* Hero */}
      {heroActive && (
      <section className="bg-background">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="block text-xs text-muted-foreground tracking-wide mb-4">{t(`${base}.hero.label`)}</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-normal leading-tight max-w-3xl mb-6">
              {t(`${base}.hero.headline`)}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
              {t(`${base}.hero.intro`)}
            </p>
          </motion.div>
        </div>
        <img src={cms.asset("hero", "image", "")} alt={t(`${base}.hero.imageAlt`)} className="w-full h-[40vh] lg:h-[55vh] object-cover" data-cms-section="hero" data-cms-field="image" />
      </section>
      )}

      {/* Anlagenplaner Highlight */}
      <section className="border-y border-border bg-section-muted">
        <div className="container mx-auto py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{t(`${base}.anlagenplaner.label`)}</span>
              <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">{t(`${base}.anlagenplaner.headline`)}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {t(`${base}.anlagenplaner.intro`)}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><FileText className="w-4 h-4" /> {t(`${base}.anlagenplaner.features.gaeb`)}</li>
                <li className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> {t(`${base}.anlagenplaner.features.stueckliste`)}</li>
                <li className="flex items-center gap-2"><Download className="w-4 h-4" /> {t(`${base}.anlagenplaner.features.export`)}</li>
                <li className="flex items-center gap-2"><Settings className="w-4 h-4" /> {t(`${base}.anlagenplaner.features.sprache`)}</li>
              </ul>
              <span aria-disabled="true" className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground text-sm cursor-not-allowed">
                {t(`${base}.anlagenplaner.cta`)} <ExternalLink className="w-4 h-4" />
              </span>
            </motion.div>
            <div className="bg-muted h-64 lg:h-80 flex items-center justify-center">
              <Cpu className="w-16 h-16 text-muted-foreground/30" />
            </div>
          </div>
        </div>
      </section>

      {/* HOAI Phasen */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto">
          <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{t(`${base}.hoai.label`)}</span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-10">{t(`${base}.hoai.headline`)}</h2>
          <div className={cardGridClass("useCases", "")}>
            {HOAI_KEYS.map((key, i) => (
              <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className={`${cardGridItemClass("useCases", HOAI_KEYS.length, i)} border border-border p-6`}>
                <span className="text-2xl font-heading text-foreground/20">{t(`${base}.hoai.phasen.${key}.phase`)}</span>
                <h3 className="text-base font-heading font-normal text-foreground mt-3 mb-2">{t(`${base}.hoai.phasen.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t(`${base}.hoai.phasen.${key}.text`)}</p>
                <div className="flex flex-wrap gap-2">
                  {HOAI_TOOL_KEYS[key].map((toolKey) => (
                    <span key={toolKey} className="text-xs bg-muted px-2 py-1 text-muted-foreground">{t(`${base}.hoai.phasen.${key}.tools.${toolKey}`)}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Planungsdaten */}
      <section className="py-16 lg:py-24 bg-section-muted">
        <div className="container mx-auto">
          <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{t(`${base}.planungsdaten.label`)}</span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-10">{t(`${base}.planungsdaten.headline`)}</h2>
          <div className={cardGridClass("default", "")}>
            {planningKeys.map((key, i) => {
              const titleFb = t(`${base}.planungsdaten.items.${key}.title`, { defaultValue: key });
              const textFb = t(`${base}.planungsdaten.items.${key}.text`, { defaultValue: "" });
              const title = txCardItem(cms, loc, "planungsdaten", key, "title", titleFb);
              const text = txCardItem(cms, loc, "planungsdaten", key, "description", textFb, "text");
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${cardGridItemClass("default", planningKeys.length, i)} border border-border bg-background p-6`} data-cms-page="service.planen-konfigurieren" data-cms-section={`planungsdaten_item_${key}`} data-cms-field="title">
                  <h3 className="text-base font-heading font-normal text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Konfiguratoren */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto">
          <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{t(`${base}.konfiguratoren.label`)}</span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">{t(`${base}.konfiguratoren.headline`)}</h2>
          <p className="text-muted-foreground max-w-2xl mb-10">{t(`${base}.konfiguratoren.intro`)}</p>
          <div className={cardGridClass("default", "")}>
            {configuratorKeys.map((key, i) => {
              const titleFb = t(`${base}.konfiguratoren.items.${key}.title`, { defaultValue: key });
              const textFb = t(`${base}.konfiguratoren.items.${key}.text`, { defaultValue: "" });
              const title = txCardItem(cms, loc, "konfiguratoren", key, "title", titleFb);
              const text = txCardItem(cms, loc, "konfiguratoren", key, "description", textFb, "text");
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${cardGridItemClass("default", configuratorKeys.length, i)} border border-border p-6 hover:border-foreground/20 transition-colors`} data-cms-page="service.planen-konfigurieren" data-cms-section={`konfiguratoren_item_${key}`} data-cms-field="title">
                  <Wrench className="w-5 h-5 text-muted-foreground mb-3" />
                  <h3 className="text-base font-heading font-normal text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{text}</p>
                  <span className="text-xs text-foreground inline-flex items-center gap-1 hover:text-muted-foreground cursor-pointer">
                    {t(`${base}.konfiguratoren.openLabel`)} <ExternalLink className="w-3 h-3" />
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Shops */}
      <section className="py-16 lg:py-24 bg-section-muted">
        <div className="container mx-auto">
          <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{t(`${base}.shops.label`)}</span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">{t(`${base}.shops.headline`)}</h2>
          <p className="text-muted-foreground max-w-2xl mb-10">{t(`${base}.shops.intro`)}</p>
          <div className={cardGridClass("useCases", "")}>
            {shopKeys.map((key, i) => {
              const titleFb = t(`${base}.shops.items.${key}.title`, { defaultValue: key });
              const textFb = t(`${base}.shops.items.${key}.text`, { defaultValue: "" });
              const title = txCardItem(cms, loc, "shops", key, "title", titleFb);
              const text = txCardItem(cms, loc, "shops", key, "description", textFb, "text");
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${cardGridItemClass("useCases", shopKeys.length, i)} border border-border bg-background p-6`} data-cms-page="service.planen-konfigurieren" data-cms-section={`shops_item_${key}`} data-cms-field="title">
                  <h3 className="text-base font-heading font-normal text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{text}</p>
                  <span className="text-xs text-foreground inline-flex items-center gap-1 hover:text-muted-foreground cursor-pointer">
                    {t(`${base}.shops.openLabel`)} <ExternalLink className="w-3 h-3" />
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bestellwege */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto">
          <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{t(`${base}.bestellwege.label`)}</span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-10">{t(`${base}.bestellwege.headline`)}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {orderKeys.map((key) => {
              const titleFb = t(`${base}.bestellwege.items.${key}.title`, { defaultValue: key });
              const textFb = t(`${base}.bestellwege.items.${key}.text`, { defaultValue: "" });
              const badgeKey = `${base}.bestellwege.items.${key}.badge`;
              const badgeFb = i18n.exists(`service:${badgeKey}`) ? t(badgeKey) : "";
              const title = txCardItem(cms, loc, "bestellwege", key, "title", titleFb);
              const text = txCardItem(cms, loc, "bestellwege", key, "description", textFb, "text");
              const badge = txCardItem(cms, loc, "bestellwege", key, "subtitle", badgeFb, "badge");
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="border border-border p-6 relative" data-cms-page="service.planen-konfigurieren" data-cms-section={`bestellwege_item_${key}`} data-cms-field="title">
                  {badge && (
                    <span className="absolute top-4 right-4 text-[10px] bg-foreground text-background px-2 py-0.5 uppercase tracking-wide">{badge}</span>
                  )}
                  <h3 className="text-base font-heading font-normal text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ausschreibungstexte */}
      <section className="py-16 lg:py-24 bg-section-muted">
        <div className="container mx-auto">
          <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{t(`${base}.ausschreibung.label`)}</span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-6">{t(`${base}.ausschreibung.headline`)}</h2>
          <p className="text-muted-foreground max-w-2xl mb-10">{t(`${base}.ausschreibung.intro`)}</p>
          <div className="grid md:grid-cols-2 gap-8">
            {ausschreibungKeys.map((key, idx) => {
              const titleFb = t(`${base}.ausschreibung.items.${key}.title`, { defaultValue: key });
              const textFb = t(`${base}.ausschreibung.items.${key}.text`, { defaultValue: "" });
              const title = txCardItem(cms, loc, "ausschreibung", key, "title", titleFb);
              const text = txCardItem(cms, loc, "ausschreibung", key, "description", textFb, "text");
              return (
                <div key={key} className="border border-border p-6" data-cms-page="service.planen-konfigurieren" data-cms-section={`ausschreibung_item_${key}`} data-cms-field="title">
                  {idx === 0 ? (
                    <BookOpen className="w-5 h-5 text-muted-foreground mb-3" />
                  ) : (
                    <Download className="w-5 h-5 text-muted-foreground mb-3" />
                  )}
                  <h3 className="text-base font-heading font-normal text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CmsTailFaq pageKey="service.planen-konfigurieren" />
      <CmsTailCta pageKey="service.planen-konfigurieren" />


      <CmsSourceBadge
        pageKey="service.planen-konfigurieren"
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
    </CmsRenderRegistryProvider>
  );
};

export default PlanenKonfigurieren;
