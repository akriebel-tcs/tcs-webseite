import { FeatureBlock, ContentSection } from "@/components/PageLayout";
import SiblingNav from "@/components/SiblingNav";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";

import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { learnMoreFallback } from "@/i18n/uiFallbacks";


const PRODUCT_KEYS = ["hausnummern", "farbvielfalt", "tuerschilder", "tuerklingeln"] as const;

const Signage = () => {
  const { t, cms, loc } = useCmsI18n("signage.root", "signage");
  const shortIdMap = useShortIdResolver();
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  // Tranche 12-renderer: card_v1-Kindsections unter `products` DB-first.
  const productCards = cms.sections
    .filter((s) => s.parent_section_key === "products" && s.section_type === "card_v1")
    .sort((a, b) => a.sort_order - b.sort_order);

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
    <CmsPageLayout pageKey="signage.root"
      label={t("hero.label")}
      headline={t("hero.headline")}
      intro={t("hero.intro")}
      heroImage={cms.asset("hero", "image", "")}
    >
      <ContentSection>
        <p className="text-muted-foreground leading-relaxed mb-10 max-w-3xl">
          {t("intro.text")}
        </p>
      </ContentSection>

      <ContentSection label={t("products.label")} title={t("products.title")}>
        <div className="space-y-12" data-cms-section="products">
          {(productCards.length > 0
            ? productCards.map((c) => ({
                sectionKey: c.section_key,
                legacyKey: c.section_key.replace(/^products__/, ""),
              }))
            : PRODUCT_KEYS.map((k) => ({
                sectionKey: `products__${k}`,
                legacyKey: k,
              }))
          ).map((item) => {
            const headline = cms.text(
              item.sectionKey, "title", loc,
              t(`products.items.${item.legacyKey}.headline`, { defaultValue: "" }),
            );
            const text = cms.text(
              item.sectionKey, "description", loc,
              t(`products.items.${item.legacyKey}.text`, { defaultValue: "" }),
            );
            const extras = buildCardExtras(item.sectionKey, "products");
            return (
              <div key={item.sectionKey} data-cms-section={item.sectionKey}>
                <FeatureBlock headline={headline} text={text} />
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
          })}

        </div>
      </ContentSection>


    <CmsSourceBadge
      pageKey="signage.root"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
      <SiblingNav pageKey="signage.root" />
    </CmsPageLayout>
  );
};

export default Signage;
