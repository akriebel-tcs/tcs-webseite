/**
 * CmsProductSolutionShell — Renderer für T05-Produktlösungsseiten
 * (z. B. /zutrittskontrolle/bcm-mini-cloud).
 *
 * Warum eine eigene Shell?
 *   Die Inhalte dieser Seiten leben in der DB mit einer einheitlichen Form
 *   (hero / vorteile|produkte / anwendungen / cta), nutzen aber Feld-Schlüssel
 *   wie `subline`, `introText`, `ctaBeratung`, `items.N.title`,
 *   `items.N.description`, `items.N.vorteile.M`, die der generische
 *   CmsBodyRenderer (content_v1 = title/text/label) nicht versteht.
 *   Damit die Spiegel-Regel weiter gilt, mappen wir hier ausschließlich die
 *   Render-Logik auf die existierenden Feld-Schlüssel — Inhalte bleiben in
 *   `cms_section_fields`/`cms_assets` und werden im Admin gepflegt.
 *
 *   Keine Inhalte hartcodiert. Kein Re-Implement alter React-Seiten.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, FileText, CheckCircle2, Mail, Phone, type LucideIcon } from "lucide-react";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import SiblingNav from "@/components/SiblingNav";
import { useCmsPreviewHighlight } from "@/shared/hooks/useCmsPreviewHighlight";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { CARD_ICON_CLASS, CARD_ICON_STROKE } from "@/features/cms/lib/cardIcon";
import {
  useCmsPageContent,
  normalizeLocale,
  type CmsPageContent,
} from "@/features/cms/hooks/useCmsPageContent";
import { CARD_DIVIDER_CLASS, resolveCardDividers, useGlobalCardDividers } from "@/features/cms/lib/cardDividers";
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";
import { RENDERERS as CMS_RENDERERS, normalizeType, type Locale } from "@/features/cms/components/CmsBodyRenderer";
import type { AppLocale } from "@/i18n/locale";

// Hinweis: Item-Links (`items.N.href`), Datenblatt-URLs (`hero.datasheetUrl`)
// sowie Icons/Bilder pro Karte (`items.N.icon`, `items.N.image`) liegen in
// `cms_section_fields` / `cms_assets` und werden im Admin gepflegt —
// keine Inhalts-Maps im Code.

// Positions-Defaults für Anwendungen-Sektionen (entspricht 1:1 dem alten
// hartcodierten Verhalten der Content_V1-Seiten). Greift nur, wenn weder
// `items.N.icon` noch `items.N.image` in der DB gepflegt ist.
const ANWENDUNGEN_DEFAULT_ICONS = ["building-2", "briefcase", "hotel", "graduation-cap"] as const;


function HeroPlaceholderGraphic({ label }: { label: string }) {
  return (
    <div role="img" aria-label={label} className="w-full h-full min-h-[320px] bg-secondary/40 flex items-center justify-center p-8 lg:p-12">
      <svg viewBox="0 0 600 450" className="w-full h-auto max-h-[420px] text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none">
        <rect x="112" y="78" width="376" height="294" rx="20" stroke="currentColor" strokeWidth="10" opacity="0.45" />
        <rect x="166" y="132" width="268" height="186" rx="12" stroke="currentColor" strokeWidth="6" opacity="0.35" />
        <path d="M198 270 266 208l56 48 52-38 60 52" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        <circle cx="250" cy="188" r="22" fill="currentColor" opacity="0.28" />
      </svg>
    </div>
  );
}

interface Props {
  pageKey: string;
  /**
   * Optionaler Link für den primären Hero-CTA ("Projektanfrage senden").
   * Default: /kontakt — der projektweite Kontaktpfad.
   */
  contactHref?: string;
}

type Loc = AppLocale;

/** Liest item-N-Daten.
 *  Lesereihenfolge (Tranche 1 — Karten-Modellierung):
 *    1. Echte Kind-Sections (parent_section_key === sectionKey), sortiert
 *       nach sort_order — neue Modellierung als cards_v1 + card_v1.
 *       Felder pro Kind: title, description, icon, Asset-Slot image.
 *    2. Fallback auf alte `items.N.*` Felder im Parent (Legacy-Pfad).
 *  Beides liefert dieselbe Item-Struktur, damit das Public-Layout während
 *  der Übergangsphase identisch bleibt.
 */
function readItems(
  cms: CmsPageContent,
  sectionKey: string,
  loc: Loc,
): Array<{
  sectionKey: string;
  title: string;
  description: string;
  bullets: string[];
  href?: string;
  icon?: string;
  image?: string;
  imageAlt?: string;
}> {
  // 1) Neue Modellierung: Kind-Sections lesen, falls vorhanden.
  const children = cms.sections
    .filter((s) => s.parent_section_key === sectionKey)
    .sort((a, b) => a.sort_order - b.sort_order);
  if (children.length > 0) {
    const out: Array<{
      sectionKey: string;
      title: string;
      description: string;
      bullets: string[];
      href?: string;
      icon?: string;
      image?: string;
      imageAlt?: string;
    }> = [];
    for (const child of children) {
      const ck = child.section_key;
      const title = cms.text(ck, "title", loc, "");
      const description = cms.text(ck, "description", loc, "");
      // Canonical-first: link_1_href (Standardkarten-Vertrag), dann Legacy.
      const href = cms.text(ck, "link_1_href", loc, "")
        || cms.text(ck, "href", loc, "")
        || cms.text(ck, "cta_href", loc, "");
      const icon = cms.text(ck, "icon", loc, "") || cms.text(ck, "icon", "de", "");
      const image = cms.asset(ck, "image", "");
      const imageAlt = image ? cms.assetAlt(ck, "image", loc, title) : "";
      // Bulletpoints canonical-first: `bullets.N`, Fallback Legacy `features.N`.
      const bulletIndices = cms
        .fieldKeys(ck)
        .filter((k) => /^(bullets|features)\.\d+$/.test(k))
        .map((k) => Number(k.split(".")[1]))
        .filter((n) => Number.isInteger(n))
        .reduce<number[]>((acc, n) => (acc.includes(n) ? acc : [...acc, n]), [])
        .sort((a, b) => a - b);
      const bullets = bulletIndices
        .map((i) => cms.text(ck, `bullets.${i}`, loc, "") || cms.text(ck, `features.${i}`, loc, ""))
        .filter(Boolean);
      if (title || description || bullets.length > 0) {
        out.push({
          sectionKey: ck,
          title,
          description,
          bullets,
          href: href || undefined,
          icon: icon || undefined,
          image: image || undefined,
          imageAlt: imageAlt || undefined,
        });
      }
    }
    if (out.length > 0) return out;
  }

  // 2) Legacy-Fallback: items.N.* im Parent.
  const keys = cms.fieldKeys(sectionKey);
  const indices = new Set<number>();
  for (const k of keys) {
    const m = k.match(/^items\.(\d+)\./);
    if (m) indices.add(Number(m[1]));
  }
  const out: Array<{
    sectionKey: string;
    title: string;
    description: string;
    bullets: string[];
    href?: string;
    icon?: string;
    image?: string;
    imageAlt?: string;
  }> = [];
  for (const i of Array.from(indices).sort((a, b) => a - b)) {
    const title = cms.text(sectionKey, `items.${i}.title`, loc, "")
      || cms.text(sectionKey, `items.${i}.headline`, loc, "");
    const description = cms.text(sectionKey, `items.${i}.description`, loc, "");
    const href = cms.text(sectionKey, `items.${i}.href`, loc, "")
      || cms.text(sectionKey, `items.${i}.url`, loc, "");
    const icon = cms.text(sectionKey, `items.${i}.icon`, loc, "")
      || cms.text(sectionKey, `items.${i}.icon`, "de", "");
    const image = cms.asset(sectionKey, `items.${i}.image`, "");
    const imageAlt = image ? cms.assetAlt(sectionKey, `items.${i}.image`, loc, title) : "";
    const bullets: string[] = [];
    for (let m = 0; m < 12; m += 1) {
      const v = cms.text(sectionKey, `items.${i}.vorteile.${m}`, loc, "");
      if (!v) break;
      bullets.push(v);
    }
    if (title || description || bullets.length) {
      out.push({
        sectionKey,
        title,
        description,
        bullets,
        href: href || undefined,
        icon: icon || undefined,
        image: image || undefined,
        imageAlt: imageAlt || undefined,
      });
    }
  }
  return out;
}


const CmsProductSolutionShell = ({ pageKey, contactHref = "/kontakt/bcm" }: Props) => {
  const { t, i18n } = useTranslation();
  const cms = useCmsPageContent(pageKey);
  const globalDividers = useGlobalCardDividers();
  const loc: Loc = normalizeLocale(i18n.language);
  useCmsPreviewHighlight();

  const dbSectionCount = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero",
  ).length;

  // Hero-Felder (alle aus DB).
  const heroEyebrow = cms.text("hero", "eyebrow", loc, "") || cms.text("hero", "label", loc, "");
  const heroHeadline = cms.text("hero", "headline", loc, "");
  const heroSubline = cms.text("hero", "subline", loc, "");
  const heroDescription = cms.text("hero", "description", loc, "");
  const heroIntroText = cms.text("hero", "introText", loc, "") || cms.text("hero", "intro", loc, "");
  const heroImage = cms.asset("hero", "image", "");
  const heroAlt = cms.assetAlt("hero", "image", loc, heroHeadline);
  const heroSet = cms.assetSet("hero", "image");
  const heroPlaceholderLabel = heroAlt || heroHeadline || "Produktbild-Platzhalter";
  // Bilddarstellung im Seitenkopf, redaktionell über `hero.image_fit`:
  //   "cover"  = formatfüllend (Rahmen komplett ausgefüllt), Hintergrund weiß
  //   sonst    = bisheriges Verhalten (Bild vollständig sichtbar, grauer Rahmen)
  const heroImageCover =
    cms.text("hero", "image_fit", "de", "").trim().toLowerCase() === "cover";
  const heroImageFrameClass = heroImageCover
    ? "bg-background flex items-center justify-center overflow-hidden aspect-[4/3] lg:aspect-auto lg:min-h-[420px]"
    : "bg-secondary/40 flex items-center justify-center p-8 lg:p-12 aspect-[4/3] lg:aspect-auto lg:min-h-[420px]";
  const heroImageClass = heroImageCover
    ? "h-full w-full object-cover"
    : "w-full h-auto object-contain max-h-[420px]";

  // Hero-CTAs (Texte aus DB).
  const ctaPrimary = cms.text("hero", "ctaBeratung", loc, "");
  const ctaSecondary = cms.text("hero", "ctaDatenblatt", loc, "");
  const datasheetUrl = cms.text("hero", "datasheetUrl", loc, "") || cms.text("hero", "datasheetUrl", "de", "");

  // Body-Sections: vorteile|produkte|anwendungen werden über `section_key`
  // adressiert (Typ ist überall content_v1).
  const bodySections = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_key !== "hero" && s.section_key !== "cta",
  );

  return (
    <div data-cms-page={pageKey}>
      {/* Breadcrumb nutzt die Headline ("BCM MiniCloud") als Fallback-Label,
          nicht den Eyebrow ("Ein System – viele Anwendungen"). */}
      <AutoBreadcrumb fallbackLabel={heroHeadline} />

      {/* Hero: 2-spaltig mit Produktbild links und Text rechts.
          Fallen Image oder Variants weg, klappt der Bildbereich automatisch zu. */}
      <section data-cms-section="hero" className="bg-background">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid gap-10 lg:gap-14 items-start lg:grid-cols-2"
          >
            <div className={heroImageFrameClass}>
              {heroImage ? (
                (heroSet.desktop || heroSet.tablet || heroSet.mobile) ? (
                  <picture className={heroImageCover ? "block h-full w-full" : undefined}>
                    {heroSet.tablet && (
                      <source media="(min-width: 768px) and (max-width: 1023px)" srcSet={heroSet.tablet} />
                    )}
                    {heroSet.desktop && (
                      <source media="(min-width: 1024px)" srcSet={heroSet.desktop} />
                    )}
                    {heroSet.mobile && (
                      <source media="(max-width: 767px)" srcSet={heroSet.mobile} />
                    )}
                    <img src={heroImage} alt={heroAlt} className={heroImageClass} />
                  </picture>
                ) : (
                  <img src={heroImage} alt={heroAlt} className={heroImageClass} />
                )
              ) : (
                <HeroPlaceholderGraphic label={heroPlaceholderLabel} />
              )}
            </div>
            <div>
              {heroEyebrow && (
                <span className="block text-xs tracking-wide mb-4 text-muted-foreground">
                  {heroEyebrow}
                </span>
              )}
              {heroHeadline && (
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-normal leading-tight mb-4">
                  {heroHeadline}
                </h1>
              )}
              {heroSubline && (
                <p className="text-lg text-primary mb-6">{heroSubline}</p>
              )}
              {heroDescription && (
                <p className="text-base text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
                  {heroDescription}
                </p>
              )}
              {heroIntroText && (
                <p className="text-base text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
                  {heroIntroText}
                </p>
              )}
              {(ctaPrimary || ctaSecondary) && (
                <div className="flex flex-wrap gap-3 mt-6">
                  {ctaPrimary && (
                    <Link
                      to={contactHref}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      {ctaPrimary} <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                  {ctaSecondary && (
                    datasheetUrl ? (
                      <a
                        href={datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        {ctaSecondary} <FileText className="w-4 h-4" />
                      </a>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="inline-flex items-center gap-2 border border-border text-muted-foreground px-6 py-3 text-sm font-medium cursor-not-allowed"
                      >
                        {ctaSecondary} <FileText className="w-4 h-4" />
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {bodySections.map((sec) => {
        const sk = sec.section_key;
        const divCls = resolveCardDividers(cms.text(sk, "card_dividers", "de", ""), globalDividers) ? CARD_DIVIDER_CLASS : "";

        // Sprint „Standardkarten-Vertrag" (2026-06-04):
        // Bekannte zentrale Section-Typen werden NICHT mehr lokal in der
        // Shell ausgespielt, sondern an den zentralen Renderer delegiert.
        // Damit gilt eine Wahrheit für Cards/Scroller/Showcase-Listen.
        const normalized = normalizeType(sec.section_type);
        if (normalized && CMS_RENDERERS[normalized]) {
          const childList = cms.sections
            .filter((c) => c.parent_section_key === sk)
            .map((c) => ({ section_key: c.section_key, section_type: c.section_type ?? null }));
          return (
            <div key={`delegated-${sk}`}>
              {CMS_RENDERERS[normalized]({
                pageKey,
                cms,
                locale: loc as Locale,
                sectionKey: sk,
                children: childList,
              })}
            </div>
          );
        }

        const eyebrow = cms.text(sk, "eyebrow", loc, "") || cms.text(sk, "label", loc, "");
        const headline = cms.text(sk, "headline", loc, "") || cms.text(sk, "title", loc, "");
        const intro = cms.text(sk, "introText", loc, "")
          || cms.text(sk, "description", loc, "")
          || cms.text(sk, "subline", loc, "");
         const items = readItems(cms, sk, loc);

        if (!headline && !intro && items.length === 0) return null;

        return (
          <section key={sk} className="py-16 lg:py-24 bg-background even:bg-section-muted">
            <div className="container mx-auto" data-cms-section={sk}>
              {eyebrow && (
                <span className="text-xs text-muted-foreground tracking-wide mb-2 block">
                  {eyebrow}
                </span>
              )}
              {headline && (
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-normal text-foreground mb-4 max-w-3xl">
                  {headline}
                </h2>
              )}
              {intro && (
                <p className="text-muted-foreground leading-relaxed max-w-3xl mb-10 whitespace-pre-line">
                  {intro}
                </p>
              )}

              {items.length > 0 && (() => {
                // Produkt-Showcase: gestapelte Karten mit Bild links und
                // Titel + Häkchen-Liste rechts (siehe Biometrie / Zufahrtskontrolle).
                const isShowcase =
                  sec.section_type === "product_scroller_v1" || /produkte/i.test(sk);
                if (isShowcase) {
                  return (
                    <div className="mt-8 flex flex-col gap-6">
                      {items.map((it, i) => (
                        <article
                          key={`${sk}-${i}`}
                          data-cms-section={it.sectionKey ?? `${sk}_${i + 1}`}
                          className="border border-border bg-card p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-10 items-start"
                        >
                          <div className="w-full sm:w-48 md:w-56 lg:w-64 shrink-0 flex items-center justify-center" data-cms-field="image">
                            {it.image ? (
                              <img
                                src={it.image}
                                alt={it.imageAlt ?? it.title ?? ""}
                                className="w-full max-w-[220px] h-auto object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full aspect-square max-w-[180px] bg-secondary/40" aria-hidden="true" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {it.title && (
                              <h3 className="text-xl md:text-2xl font-heading font-normal text-foreground mb-4">
                                {it.title}
                              </h3>
                            )}
                            {it.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
                                {it.description}
                              </p>
                            )}
                            {it.bullets.length > 0 && (
                              <ul className="space-y-3">
                                {it.bullets.map((b, m) => (
                                  <li key={m} className="flex gap-3 text-sm text-foreground">
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {it.href && (
                              <div className={divCls || "mt-4"} data-cms-field="links"><Link to={it.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                {t("common:ui.learnMore")} <ArrowRight className="w-4 h-4" />
                              </Link></div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  );
                }
                return (
                <div className={cardGridClass(sk, "mt-8", items.length)}>
                  {items.map((it, i) => {
                    // Sektions-Default-Icon: für anwendungs-artige Sektionen
                    // 1:1 wie auf der alten Webseite positionsbasiert
                    // (building-2 / briefcase / hotel / graduation-cap),
                    // sonst Checkmark.
                    const isAnwendungenSection = /anwendung/i.test(sk) || /einsatz/i.test(sk);
                    const defaultIconName = isAnwendungenSection
                      ? ANWENDUNGEN_DEFAULT_ICONS[i % ANWENDUNGEN_DEFAULT_ICONS.length]
                      : undefined;
                    // Eine-Wahrheit-Etappe: `icon` leer = Icon aus. Kein
                    // automatisches Default-Icon mehr (außer der positions-
                    // basierte Anwendungen-Default als Bereichs-Bild-Ersatz).
                    const iconKey = (it.icon ?? defaultIconName) ?? "";
                    const IconCmp: LucideIcon | null = iconKey
                      ? resolveIcon(iconKey)
                      : null;
                    return (
                      <div
                        key={`${sk}-${i}`}
                        data-cms-section={it.sectionKey ?? `${sk}_${i + 1}`}
                        className={`${cardGridItemClass(sk, items.length, i)} border border-border bg-card p-6 flex flex-col`}
                      >
                        {it.image ? (
                          <div data-cms-field="image">
                            <img
                              src={it.image}
                              alt={it.imageAlt ?? it.title ?? ""}
                              className="w-10 h-10 object-contain mb-3"
                              loading="lazy"
                            />
                          </div>
                        ) : IconCmp ? (
                          <IconCmp
                            className={CARD_ICON_CLASS}
                            strokeWidth={CARD_ICON_STROKE}
                            aria-hidden="true"
                          />
                        ) : null}
                        {it.title && (
                          <h3 className="text-base font-heading font-medium text-foreground mb-2">
                            {it.title}
                          </h3>
                        )}
                        {it.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
                            {it.description}
                          </p>
                        )}
                        {it.bullets.length > 0 && (
                          <ul className="space-y-2 mt-auto">
                            {it.bullets.map((b, m) => (
                              <li key={m} className="flex gap-2 text-sm text-foreground">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {it.href && (
                          <div className={divCls || "mt-4"} data-cms-field="links"><Link to={it.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                            {t("common:ui.learnMore")} <ArrowRight className="w-4 h-4" />
                          </Link></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                );
              })()}

            </div>
          </section>
        );
      })}

      {/* Kontakt-Block (section_key = "cta"). */}
      <CtaContactBlock cms={cms} loc={loc} contactHref={contactHref} />

      <SiblingNav pageKey={pageKey} />


      <CmsSourceBadge
        pageKey={pageKey}
        source={cms.hasDbContent ? "db" : "fallback"}
        sectionCount={dbSectionCount}
      />
    </div>
  );
};

interface CtaProps {
  cms: CmsPageContent;
  loc: Loc;
  contactHref: string;
}

function CtaContactBlock({ cms, loc, contactHref }: CtaProps) {
  const eyebrow = cms.text("cta", "eyebrow", loc, "") || cms.text("cta", "label", loc, "");
  const claim = cms.text("cta", "claim", loc, "") || cms.text("cta", "headline", loc, "");
  const subtext = cms.text("cta", "subtext", loc, "") || cms.text("cta", "description", loc, "");
  const phone = cms.text("cta", "phone", "de", "");
  const email = cms.text("cta", "email", "de", "");
  const ctaLabel = cms.text("cta", "ctaBeratung", loc, "") || cms.text("cta", "cta_label", loc, "");

  if (!claim && !subtext && !phone && !email && !ctaLabel) return null;

  return (
    <section className="py-16 lg:py-24 bg-foreground text-background">
      <div className="container mx-auto" data-cms-section="cta">
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="text-xs text-background/70 tracking-wide mb-2 block uppercase">
              {eyebrow}
            </span>
          )}
          {claim && (
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-normal mb-4">
              {claim}
            </h2>
          )}
          {subtext && (
            <p className="text-background/80 leading-relaxed mb-8 whitespace-pre-line">
              {subtext}
            </p>
          )}
          <div className="flex flex-wrap gap-4 mb-8">
            {phone && (
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-2 text-background hover:text-background/80 transition-colors">
                <Phone className="w-4 h-4" /> <span className="text-sm">{phone}</span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="inline-flex items-center gap-2 text-background hover:text-background/80 transition-colors">
                <Mail className="w-4 h-4" /> <span className="text-sm">{email}</span>
              </a>
            )}
          </div>
          {ctaLabel && (
            <Link
              to={contactHref}
              className="inline-flex items-center gap-2 bg-background text-foreground px-6 py-3 text-sm font-medium hover:bg-background/90 transition-colors"
            >
              {ctaLabel} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default CmsProductSolutionShell;
