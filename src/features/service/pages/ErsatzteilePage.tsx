import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import { ShoppingCart, Package, Tag, Key, ExternalLink, Truck, CheckCircle, Settings, Smartphone, FileText } from "lucide-react";

import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { listCardItems, txCardItem } from "@/features/service/shared/cmsCardHelpers";
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";

const ERSATZ_ITEM_KEYS = ["netzteile", "kamera", "audio", "gehaeuse"] as const;
const BESCHRIFT_CARD_KEYS = ["namensschilder", "klingeltableau", "briefkasten"] as const;
const BESCHRIFT_FEATURE_KEYS = ["f1", "f2", "f3"] as const;
const FREISCHALT_CARD_KEYS = ["bcm", "app", "system"] as const;
const FREISCHALT_CARD_ICONS: Record<(typeof FREISCHALT_CARD_KEYS)[number], typeof Settings> = {
  bcm: Settings,
  app: Smartphone,
  system: FileText,
};
const FREISCHALT_STEP_KEYS = ["s1", "s2", "s3", "s4"] as const;
const VORTEIL_KEYS = ["online", "versand", "qualitaet", "freischaltung"] as const;
const VORTEIL_ICONS: Record<(typeof VORTEIL_KEYS)[number], typeof ShoppingCart> = {
  online: ShoppingCart,
  versand: Truck,
  qualitaet: Package,
  freischaltung: Key,
};

const Ersatzteile = () => {
  const { t, cms, loc } = useCmsI18n("service.ersatzteile", "service", "seiten.ersatzteile");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const base = "seiten.ersatzteile";

  // Tranche 7c: DB-first Kartenlisten, Legacy bleibt Fallback.
  const ersatzKeys = listCardItems(cms, "ersatzteile", ERSATZ_ITEM_KEYS);
  const vorteilKeys = listCardItems(cms, "vorteile", VORTEIL_KEYS);

  return (
    <CmsPageLayout pageKey="service.ersatzteile"
      label={t(`${base}.hero.label`)}
      headline={t(`${base}.hero.headline`)}
      intro={t(`${base}.hero.intro`)}
      heroImage={cms.asset("hero", "image", "")}
      fullWidth
    >
      {/* Ersatzteile */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-7 h-7 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t(`${base}.ersatzteile.headline`)}</h2>
          </div>
          <p className="text-muted-foreground mb-10 max-w-3xl">
            {t(`${base}.ersatzteile.intro`)}
          </p>
          <div className={cardGridClass("useCases", "mb-10")}>
            {ersatzKeys.map((key, i) => {
              const titleFb = t(`${base}.ersatzteile.items.${key}.title`, { defaultValue: key });
              const descFb = t(`${base}.ersatzteile.items.${key}.desc`, { defaultValue: "" });
              const title = txCardItem(cms, loc, "ersatzteile", key, "title", titleFb);
              const desc = txCardItem(cms, loc, "ersatzteile", key, "description", descFb, "desc");
              return (
                <div key={key} className={`${cardGridItemClass("useCases", ersatzKeys.length, i)} border border-border p-6`} data-cms-page="service.ersatzteile" data-cms-section={`ersatzteile_item_${key}`} data-cms-field="title">
                  <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://tcs24.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              {t(`${base}.ersatzteile.cta`)}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Beschriftung */}
      <section className="bg-section-muted py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="w-7 h-7 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t(`${base}.beschriftung.headline`)}</h2>
          </div>
          <p className="text-muted-foreground mb-10 max-w-3xl">
            {t(`${base}.beschriftung.intro`)}
          </p>
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {BESCHRIFT_CARD_KEYS.map((cardKey) => (
              <div key={cardKey} className="bg-background border border-border p-8">
                <h3 className="text-lg font-semibold text-foreground mb-3">{t(`${base}.beschriftung.cards.${cardKey}.title`)}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t(`${base}.beschriftung.cards.${cardKey}.desc`)}
                </p>
                <ul className="space-y-2">
                  {BESCHRIFT_FEATURE_KEYS.map((fKey) => (
                    <li key={fKey} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                      {t(`${base}.beschriftung.cards.${cardKey}.features.${fKey}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <a
            href="https://tcs24.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            {t(`${base}.beschriftung.cta`)}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Freischaltcodes */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-7 h-7 text-foreground" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t(`${base}.freischaltcodes.headline`)}</h2>
          </div>
          <p className="text-muted-foreground mb-10 max-w-3xl">
            {t(`${base}.freischaltcodes.intro`)}
          </p>
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {FREISCHALT_CARD_KEYS.map((cardKey) => {
              const Icon = FREISCHALT_CARD_ICONS[cardKey];
              return (
                <div key={cardKey} className="border border-border p-8">
                  <Icon className="w-8 h-8 text-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t(`${base}.freischaltcodes.cards.${cardKey}.title`)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`${base}.freischaltcodes.cards.${cardKey}.desc`)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="bg-secondary border border-border p-8 mb-10">
            <h3 className="font-semibold text-foreground mb-3">{t(`${base}.freischaltcodes.ablauf.headline`)}</h3>
            <div className="grid md:grid-cols-4 gap-6">
              {FREISCHALT_STEP_KEYS.map((stepKey, idx) => (
                <div key={stepKey} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-foreground text-background text-sm font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-muted-foreground">{t(`${base}.freischaltcodes.ablauf.steps.${stepKey}`)}</p>
                </div>
              ))}
            </div>
          </div>
          <a
            href="https://tcs24.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            {t(`${base}.freischaltcodes.cta`)}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Vorteile */}
      <section className="bg-section-muted py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-12">
            {t(`${base}.vorteile.headline`)}
          </h2>
          <div className={cardGridClass("useCases", "")}>
            {vorteilKeys.map((key, i) => {
              const Icon = VORTEIL_ICONS[key as (typeof VORTEIL_KEYS)[number]] ?? ShoppingCart;
              const titleFb = t(`${base}.vorteile.items.${key}.title`, { defaultValue: key });
              const descFb = t(`${base}.vorteile.items.${key}.desc`, { defaultValue: "" });
              const title = txCardItem(cms, loc, "vorteile", key, "title", titleFb);
              const desc = txCardItem(cms, loc, "vorteile", key, "description", descFb, "desc");
              return (
                <div key={key} className={`${cardGridItemClass("useCases", vorteilKeys.length, i)} flex items-start gap-4`} data-cms-page="service.ersatzteile" data-cms-section={`vorteile_item_${key}`} data-cms-field="title">
                  <Icon className="w-6 h-6 text-foreground mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t(`${base}.cta.headline`)}
          </h2>
          <p className="text-background/70 mb-8 max-w-lg mx-auto">
            {t(`${base}.cta.text`)}
          </p>
          <a
            href="https://tcs24.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-background text-foreground px-8 py-3 text-sm font-medium hover:bg-background/90 transition-colors"
          >
            {t(`${base}.cta.button`)}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      <CmsTailFaq pageKey="service.ersatzteile" />

    <CmsSourceBadge
      pageKey="service.ersatzteile"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default Ersatzteile;
