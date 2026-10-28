/**
 * Technischer Support (N-037 / P-082) — DB-first-Loop.
 *
 * Reihenfolge und Sichtbarkeit kommen strikt aus `cms_sections`
 * (`sort_order`, `is_active`). Die bisherigen Sonderlayouts (Kanäle, RMA,
 * Ersatzteile, Ansprechpartner) bleiben erhalten, hängen aber an ihrer
 * CMS-Position. Blöcke ohne Sonderlayout (z. B. `standard_cta`) laufen über
 * den zentralen Section-Renderer, FAQ über `CmsTailFaq`.
 *
 * Überschriften, Karteninhalte und Kartenlinks sind DB-first; i18n bleibt
 * nur Fallback.
 */
import { Fragment } from "react";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, ExternalLink, ClipboardList, Settings, ShoppingCart, FileText, HelpCircle, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

import { CARD_DIVIDER_CLASS, resolveCardDividers, useGlobalCardDividers } from "@/features/cms/lib/cardDividers";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { listCardItems, txCardItem, isCardItemIconVisible } from "@/features/service/shared/cmsCardHelpers";
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

const PAGE_KEY = "service.technischer-support";

const CHANNEL_KEYS = ["telefon", "email", "tcsplan", "downloads"] as const;
const CHANNEL_META: Record<string, { icon: typeof Phone; href?: string }> = {
  telefon: { icon: Phone },
  email: { icon: Mail },
  tcsplan: { icon: MessageSquare, href: "https://tcsplan.de/" },
  downloads: { icon: FileText, href: "/downloads" },
};

const RMA_META: Record<string, { icon: typeof Phone; href?: string }> = {
  rma: { icon: ClipboardList },
  garantie: { icon: Settings, href: "https://garantie.tcsapps.de/" },
  support: { icon: Phone, href: "/kontakt" },
};

const ERSATZ_META: Record<string, { icon: typeof Phone; href?: string }> = {
  ersatzteile: { icon: ShoppingCart, href: "https://tcs24.com/" },
  beschriftung: { icon: FileText },
  freischaltcodes: { icon: Settings },
};

const TechnischerSupport = () => {
  const { t, cms, loc, i18n } = useCmsI18n(PAGE_KEY, "service", "seiten.technischerSupport");
  const globalDividers = useGlobalCardDividers();
  const shortIdMap = useShortIdResolver();
  const base = "seiten.technischerSupport";

  const topLevel = cms.sections
    .filter((s) => !s.parent_section_key)
    .filter((s) => s.section_key !== "hero" && s.section_type !== "hero_v1")
    .filter((s) => s.section_key !== "faq")
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const dbSectionCount = topLevel.length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  /** Überschrift/Intro DB-first, i18n nur Fallback. */
  const head = (sectionKey: string, field: "headline" | "intro") =>
    cms.text(sectionKey, field, loc, t(`${base}.${sectionKey}.${field}`, { defaultValue: "" }) as string);

  /** Kartenlink DB-first (`link_1_href`), sonst der bekannte Code-Pfad. */
  const cardHref = (parent: string, key: string, fallbackHref?: string) => {
    const raw = txCardItem(cms, loc, parent, key, "cta_href", "", "href");
    const resolved = resolveHref(raw, shortIdMap);
    return resolved.valid ? resolved.href : (fallbackHref ?? "");
  };

  const isExternal = (href: string) => /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");

  const renderChannels = () => {
    const keys = listCardItems(cms, "channels", CHANNEL_KEYS);
    const headline = head("channels", "headline");
    const intro = head("channels", "intro");
    return (
      <section className="py-16 bg-section-muted" data-cms-section="channels">
        <div className="container mx-auto px-4">
          {headline && <h2 className="text-3xl font-bold text-foreground mb-4" data-cms-field="headline">{headline}</h2>}
          {intro && <p className="text-muted-foreground mb-8" data-cms-field="intro">{intro}</p>}
          <div className={cardGridClass("useCases", "")}>
            {keys.map((key, i) => {
              const meta = CHANNEL_META[key] ?? { icon: Phone };
              const labelFb = t(`${base}.channels.items.${key}.label`, { defaultValue: key });
              const descFb = t(`${base}.channels.items.${key}.desc`, { defaultValue: "" });
              const detailKey = `${base}.channels.items.${key}.detail`;
              const detailFb = i18n.exists(`service:${detailKey}`) ? (t(detailKey) as string) : "";
              const iv = isCardItemIconVisible(cms, loc, "channels", key);
              const Icon = iv.name ? (iv.visible ? resolveIcon(iv.name, meta.icon) : null) : meta.icon;
              const label = txCardItem(cms, loc, "channels", key, "title", labelFb, "label");
              const desc = txCardItem(cms, loc, "channels", key, "description", descFb, "desc");
              const detail = txCardItem(cms, loc, "channels", key, "subtitle", detailFb, "detail");
              const href = cardHref("channels", key, meta.href);
              const itemCls = cardGridItemClass("useCases", keys.length, i);
              const inner = (
                <Card className="hover:shadow-lg transition-shadow h-full" data-cms-page={PAGE_KEY} data-cms-section={`channels_item_${key}`} data-cms-field="icon">
                  <CardContent className="p-6 flex flex-col gap-3">
                    {Icon && <Icon className="w-8 h-8 text-primary" />}
                    <h3 className="text-lg font-semibold text-foreground">{label}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                    {detail && <p className="text-xs font-medium text-primary mt-auto">{detail}</p>}
                  </CardContent>
                </Card>
              );
              if (href && isExternal(href)) {
                return <a key={key} className={itemCls} href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
              }
              if (href) return <Link key={key} className={itemCls} to={href}>{inner}</Link>;
              return <div key={key} className={itemCls}>{inner}</div>;
            })}
          </div>
        </div>
      </section>
    );
  };

  const renderCardBlock = (
    sectionKey: "rma" | "ersatzteile",
    meta: Record<string, { icon: typeof Phone; href?: string }>,
    fallbackKeys: string[],
    sectionClass: string,
  ) => {
    const keys = listCardItems(cms, sectionKey, fallbackKeys);
    const headline = head(sectionKey, "headline");
    const intro = head(sectionKey, "intro");
    return (
      <section className={sectionClass} data-cms-section={sectionKey}>
        <div className="container mx-auto px-4">
          {headline && <h2 className="text-3xl font-bold text-foreground mb-4" data-cms-field="headline">{headline}</h2>}
          {intro && <p className="text-muted-foreground mb-8" data-cms-field="intro">{intro}</p>}
          <div className="grid md:grid-cols-3 gap-6">
            {keys.map((key) => {
              const entry = meta[key] ?? { icon: Settings };
              const titleFb = t(`${base}.${sectionKey}.items.${key}.title`, { defaultValue: key });
              const textFb = t(`${base}.${sectionKey}.items.${key}.text`, { defaultValue: "" });
              const buttonFb = t(`${base}.${sectionKey}.items.${key}.button`, { defaultValue: "" });
              const iv = isCardItemIconVisible(cms, loc, sectionKey, key);
              const Icon = iv.name ? (iv.visible ? resolveIcon(iv.name, entry.icon) : null) : entry.icon;
              const title = txCardItem(cms, loc, sectionKey, key, "title", titleFb);
              const text = txCardItem(cms, loc, sectionKey, key, "description", textFb, "text");
              const button = txCardItem(cms, loc, sectionKey, key, "cta_label", buttonFb, "button");
              const href = cardHref(sectionKey, key, entry.href);
              return (
                <Card key={key} className="hover:shadow-lg transition-shadow" data-cms-page={PAGE_KEY} data-cms-section={`${sectionKey}_item_${key}`} data-cms-field="icon">
                  <CardContent className="p-6">
                    {Icon && <Icon className="w-8 h-8 text-primary mb-3" />}
                    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{text}</p>
                    {button && href && (
                      <div className={resolveCardDividers(cms.text(sectionKey, "card_dividers", "de", ""), globalDividers) ? CARD_DIVIDER_CLASS : ""} data-cms-field="links">
                      <Button variant="outline" size="sm" asChild>
                        {isExternal(href) ? (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            {button} <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        ) : (
                          <Link to={href}>{button}</Link>
                        )}
                      </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const renderAnsprechpartner = () => {
    // Kanonische Felder (`title`/`text`) haben Vorrang, damit der Block auch
    // generisch pflegbar bleibt; sonst greifen die Sonderfelder.
    const headline =
      cms.text("ansprechpartner", "title", loc, "") ||
      cms.text("ansprechpartner", "headline", loc, t(`${base}.ansprechpartner.headline`) as string);
    const name =
      cms.text("ansprechpartner", "text", loc, "") ||
      cms.text("ansprechpartner", "name", loc, t(`${base}.ansprechpartner.name`) as string);
    const experience = cms.text("ansprechpartner", "experience", loc, t(`${base}.ansprechpartner.experience`) as string);
    const button = cms.text("ansprechpartner", "button", loc, t(`${base}.ansprechpartner.button`) as string);
    const hrefRaw = cms.text("ansprechpartner", "cta_href", "de", "");
    const resolved = resolveHref(hrefRaw, shortIdMap);
    const href = resolved.valid ? resolved.href : "/kontakt";
    return (
      <section className="py-16 bg-section-muted" data-cms-section="ansprechpartner">
        <div className="container mx-auto px-4 text-center">
          <HelpCircle className="w-10 h-10 text-primary mx-auto mb-4" />
          {headline && <h2 className="text-2xl font-bold text-foreground mb-2" data-cms-field="title">{headline}</h2>}
          {name && <p className="text-sm text-muted-foreground mb-1" data-cms-field="text">{name}</p>}
          {experience && <p className="text-xs text-muted-foreground mb-6">{experience}</p>}
          {button && (
            <Button asChild>
              {isExternal(href) ? (
                <a href={href} target="_blank" rel="noopener noreferrer">{button}</a>
              ) : (
                <Link to={href}>{button}</Link>
              )}
            </Button>
          )}
        </div>
      </section>
    );
  };

  const INLINE_RENDERERS: Record<string, () => JSX.Element> = {
    channels: renderChannels,
    rma: () => renderCardBlock("rma", RMA_META, ["rma", "garantie", "support"], "py-20 bg-section-muted"),
    ersatzteile: () => renderCardBlock("ersatzteile", ERSATZ_META, ["ersatzteile", "beschriftung", "freischaltcodes"], "py-20"),
    ansprechpartner: renderAnsprechpartner,
  };

  return (
    <CmsPageLayout
      pageKey={PAGE_KEY}
      label={t(`${base}.hero.label`)}
      headline={t(`${base}.hero.headline`)}
      intro={t(`${base}.hero.intro`)}
      heroImage={cms.asset("hero", "image", "")}
      fullWidth
    >
      {topLevel.map((sec) => {
        const inline = INLINE_RENDERERS[sec.section_key];
        return (
          <Fragment key={sec.section_key}>
            {inline
              ? inline()
              : renderPageSectionByType({
                  pageKey: PAGE_KEY,
                  sectionKey: sec.section_key,
                  sectionType: sec.section_type ?? "",
                  cms,
                  locale: loc,
                })}
          </Fragment>
        );
      })}

      <CmsTailFaq pageKey={PAGE_KEY} />
      <CmsSourceBadge
        pageKey={PAGE_KEY}
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
    </CmsPageLayout>
  );
};

export default TechnischerSupport;
