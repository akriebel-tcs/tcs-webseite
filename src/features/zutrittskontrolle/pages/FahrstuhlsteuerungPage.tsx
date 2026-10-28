import PageLayout, { ContentSection } from "@/components/PageLayout";
import SiblingNav from "@/components/SiblingNav";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";

import { Layers, ShieldCheck, Building2, Wifi } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { CARD_ICON_CLASS, CARD_ICON_STROKE } from "@/features/cms/lib/cardIcon";
import { resolveCardIcon, resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";
import { learnMoreFallback } from "@/i18n/uiFallbacks";


/**
 * Dokumentierter Code-Fallback für die Vorteile-Karten. Aktive Quelle ist
 * die DB (Kind-Sections von `benefits` mit `section_type='card_v1'`).
 * Greift nur, wenn die DB-Struktur fehlt.
 */
const BENEFIT_ITEMS_FALLBACK = [
  { key: "etagenfreigabe", icon: Building2, iconName: "building-2" },
  { key: "skalierbar", icon: Layers, iconName: "layers" },
  { key: "onlineOffline", icon: Wifi, iconName: "wifi" },
  { key: "integration", icon: ShieldCheck, iconName: "shield-check" },
] as const;

const ZutrittFahrstuhl = () => {
  const { t, cms, loc } = useCmsI18n("zutrittskontrolle.fahrstuhlsteuerung", "zutrittskontrolle", "fahrstuhlsteuerung");
  const shortIdMap = useShortIdResolver();
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Batch 17: Section-Gates — `overview`/`benefits` respektieren nun is_active.
  const overviewActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "overview");
  const benefitsActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "benefits");

  const benefitCards = cms.sections.filter(
    (s) => s.parent_section_key === "benefits" && s.section_type === "card_v1",
  );

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

  return (
    <CmsPageLayout pageKey="zutrittskontrolle.fahrstuhlsteuerung"
      label={t("shared.label")}
      headline={t("fahrstuhlsteuerung.hero.headline")}
      intro={t("fahrstuhlsteuerung.hero.intro")}
      heroImage={cms.asset("hero", "image", "")}
      fullWidth
    >
      {/* Überblick */}
      {overviewActive && (
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto">
          <ContentSection
            label={t("shared.sections.overview")}
            title={t("fahrstuhlsteuerung.overview.title")}
          >
            <p className="text-muted-foreground leading-relaxed mb-10 max-w-3xl">
              {t("fahrstuhlsteuerung.overview.text")}
            </p>
          </ContentSection>
        </div>
      </section>
      )}

      {/* Vorteile */}
      {benefitsActive && (
      <section className="py-16 lg:py-24 bg-section-muted">
        <div className="container mx-auto">
          <ContentSection
            label={t("shared.sections.benefits")}
            title={t("fahrstuhlsteuerung.benefits.title")}
          >
            {(() => {
              const items = benefitCards.length > 0
                ? benefitCards.map((card, i) => ({ kind: "db" as const, card, fallback: BENEFIT_ITEMS_FALLBACK[i] }))
                : BENEFIT_ITEMS_FALLBACK.map((item) => ({ kind: "fallback" as const, item }));
              return (
                <div className={cardGridClass("benefits", "")} data-cms-section="benefits">
                  {items.map((entry, i) => {
                    const itemClass = cardGridItemClass("benefits", items.length, i);
                    if (entry.kind === "db") {
                      const sk = entry.card.section_key;
                      const fallback = entry.fallback;
                      const iconName = cms.text(sk, "icon", loc, fallback?.iconName ?? "shield-check");
                      const Icon = resolveCardIcon(cms, sk, loc, resolveIcon, fallback?.icon ?? ShieldCheck);
                      const title = cms.text(sk, "title", loc, fallback ? t(`fahrstuhlsteuerung.benefits.items.${fallback.key}.title`) : "");
                      const description = cms.text(sk, "description", loc, fallback ? t(`fahrstuhlsteuerung.benefits.items.${fallback.key}.desc`) : "");
                      const extras = buildCardExtras(sk, "benefits");
                      return (
                        <div key={sk} data-cms-section={sk} className={`${itemClass} border border-border p-6`}>
                          <span data-cms-field="icon">
                            {Icon && <Icon className={CARD_ICON_CLASS} strokeWidth={CARD_ICON_STROKE} />}
                          </span>
                          <h3 data-cms-field="title" className="text-lg font-heading font-normal text-foreground mb-2">
                            {title}
                          </h3>
                          <p data-cms-field="description" className="text-muted-foreground text-sm leading-relaxed">
                            {description}
                          </p>
                          {extras.bullets.length > 0 && (
                            <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary" data-cms-field="bullets">
                              {extras.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                            </ul>
                          )}
                          {extras.chips.length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-1.5" data-cms-field="chips">
                              {extras.chips.map((c, ci) => (
                                <li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>
                              ))}
                            </ul>
                          )}
                          {extras.links.length > 0 && (
                            <div className="mt-3 flex flex-col gap-1" data-cms-field="links">
                              {extras.links.map((l) => (
                                <a key={l.n} href={l.href} className="text-sm text-primary hover:underline self-start">{l.label} →</a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    const item = entry.item;
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className={`${itemClass} border border-border p-6`}>
                        {Icon && <Icon className={CARD_ICON_CLASS} strokeWidth={CARD_ICON_STROKE} />}
                        <h3 className="text-lg font-heading font-normal text-foreground mb-2">
                          {t(`fahrstuhlsteuerung.benefits.items.${item.key}.title`)}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {t(`fahrstuhlsteuerung.benefits.items.${item.key}.desc`)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </ContentSection>
        </div>
      </section>
      )}

    <CmsTailFaq pageKey="zutrittskontrolle.fahrstuhlsteuerung" />
    <CmsSourceBadge
      pageKey="zutrittskontrolle.fahrstuhlsteuerung"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
      <SiblingNav pageKey="zutrittskontrolle.fahrstuhlsteuerung" />
    </CmsPageLayout>
  );
};

export default ZutrittFahrstuhl;
