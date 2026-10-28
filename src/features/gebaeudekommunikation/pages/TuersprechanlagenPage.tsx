/**
 * Türsprechanlagen — Pilot für die Spiegel-Regel auf Unterseiten.
 *
 * Diese Seite rendert ihre Inhaltsblöcke NICHT mehr in fester Reihenfolge,
 * sondern iteriert über `cms.sections` aus der Datenbank. Damit greifen
 * Reorder, Ausblenden und „Block kopieren & einfügen" aus dem Admin-Tree
 * automatisch auch hier — analog zur Startseite.
 *
 * Texte und Bilder bleiben i18n/Code-führend mit DB-Overlay (keine i18n-
 * oder Asset-Migration). Wenn DB-Sections leer sind (z. B. Netzwerkfehler,
 * RLS), greift die Fallback-Reihenfolge aus FALLBACK_ORDER — das alte
 * Verhalten 1:1.
 */
import type { AppLocale } from "@/i18n/locale";
import { motion } from "framer-motion";
import SiblingNav from "@/components/SiblingNav";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ContentSection } from "@/components/PageLayout";

import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { useCmsPageFields, pickCmsOrFallback } from "@/features/cms/hooks/useCmsPageFields";
import { useCmsPageContent, type CmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { normalizeLocale } from "@/features/cms/hooks/useCmsPageContent";
import { RENDERERS as CMS_RENDERERS, SKIP_TYPES as CMS_SKIP_TYPES, normalizeType as cmsNormalizeType, type CmsSectionContext } from "@/features/cms/components/CmsBodyRenderer";
import ContentBlockItem from "@/components/ContentBlockItem";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";

// Bilder für die Außenstation-Karten kommen jetzt aus `cms_assets`
// (DB-first, J4b 2026-05-23). Frühere Code-Fallback-Imports (PES-PRO, Carus,
// Entry) sind entfernt — wenn ein Slot leer ist, bleibt das Bild leer.

import {
  Video,
  Smartphone,
  Accessibility,
  Network,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { normalizeAppLocale } from "@/i18n/locale";
import { learnMoreFallback } from "@/i18n/uiFallbacks";

import { CARD_DIVIDER_CLASS, useCardDividers } from "@/features/cms/lib/cardDividers";

const PAGE_KEY = "gebaeudekommunikation.tuersprechanlagen";

/** Reihenfolge, falls DB nichts liefert (Pixelidentisch zur Vor-Refactor-Version). */
const FALLBACK_ORDER = ["ueberblick", "aussenstationen", "innenstationen", "mobile_tk", "vorteile", "snipdoo"];

type ProduktCard = {
  /** i18n-Key der alten Variante (für Code-Fallback). */
  key: string;
  image: string;
  /** section_key des korrespondierenden card_v1-Blocks in der DB. */
  cardSectionKey: string;
};

const aussenstationenCards: ProduktCard[] = [
  { key: "pak",        image: "", cardSectionKey: "card_pak" },
  { key: "pespro",     image: "", cardSectionKey: "card_pespro" },
  { key: "ktuEnamen",  image: "", cardSectionKey: "card_ktu_enamen" },
  { key: "ami",        image: "", cardSectionKey: "card_ami" },
  { key: "tcuBka",     image: "", cardSectionKey: "card_tcu_bka" },
  { key: "argos",      image: "", cardSectionKey: "card_argos" },
  { key: "konfigKtu",  image: "", cardSectionKey: "card_konfig_ktu" },
  { key: "entry",      image: "", cardSectionKey: "card_entry" },
];

const innenstationenCards: ProduktCard[] = [
  { key: "tastaPro",  image: "",           cardSectionKey: "card_tasta_pro" },
  { key: "sensoPro",  image: "",           cardSectionKey: "card_senso_pro" },
  { key: "ipTasta",   image: "",           cardSectionKey: "card_ip_tasta" },
  { key: "tasta7",    image: "",           cardSectionKey: "card_tasta_7" },
  { key: "skyline10", image: "",           cardSectionKey: "card_skyline_10" },
  { key: "carusNext", image: "",           cardSectionKey: "card_carus_next" },
  { key: "seriesH",   image: "",           cardSectionKey: "card_series_h" },
];

const vorteileItems = [
  { key: "qualitaet", icon: Video, iconName: "video" },
  { key: "mobil", icon: Smartphone, iconName: "smartphone" },
  { key: "barrierefrei", icon: Accessibility, iconName: "accessibility" },
  { key: "skalierbar", icon: Network, iconName: "network" },
] as const;


/* ----------------------------- ProduktScroller ----------------------------- */

type ProduktScrollerProps = {
  label: string;
  title: string;
  description: string;
  cards: ProduktCard[];
  itemsKeyBase: string;
  /** DB-Lookup für Bild-Slots; fällt auf `card.image` zurück, wenn nichts in der DB liegt. */
  cmsContent: CmsPageContent;
  /** section_key, unter dem die Bild-Slots in `cms_assets` abgelegt sind. */
  sectionKey: string;
};

const ProduktScroller = ({ label, title, description, cards, itemsKeyBase, cmsContent, sectionKey }: ProduktScrollerProps) => {
  const { t, i18n } = useTranslation("gebaeudekommunikation");
  const loc = normalizeAppLocale(i18n.language);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showDividers = useCardDividers(sectionKey ? cmsContent.text(sectionKey, "card_dividers", "de", "") : "");

  // Spiegel-Regel: Wenn die Eltern-Section card_v1-Kinder hat, übernimmt die
  // DB Reihenfolge & Sichtbarkeit. Sonst Hardcode-Liste als Fallback.
  const dbChildKeys = cmsContent.sections
    .filter((s) => s.section_type === "card_v1" && s.parent_section_key === sectionKey)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.section_key);

  const fallbackByKey = new Map(cards.map((c) => [c.cardSectionKey, c]));
  const orderedCards: ProduktCard[] =
    dbChildKeys.length > 0
      ? dbChildKeys.map((k) => fallbackByKey.get(k) ?? { key: k, image: "", cardSectionKey: k })
      : cards;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.firstElementChild?.getBoundingClientRect().width ?? 300;
    scrollRef.current.scrollBy({ left: direction === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-10 flex items-end justify-between"
      >
        <div>
          <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{label}</span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        </div>
        <div className="hidden md:flex gap-2 shrink-0 ml-4">
          <button
            onClick={() => scroll("left")}
            className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors"
            aria-label={t("common:ui.scrollLeft")}
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors"
            aria-label={t("common:ui.scrollRight")}
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </motion.div>

      <div
        data-cms-section={sectionKey}
        ref={scrollRef}
        className="flex items-stretch gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {orderedCards.map((card, i) => {
          // Karten-Inhalte: bevorzugt aus cms_section_fields (card_v1), sonst i18n.
          // Wichtig: `defaultValue: ""` — sonst rendert i18next bei fehlenden
          // Übersetzungen den rohen Key (z. B. neue Karten ohne i18n-Eintrag).
          const i18nTitle = t(`${itemsKeyBase}.${card.key}.title`, { defaultValue: "" });
          const i18nSubtitle = t(`${itemsKeyBase}.${card.key}.subtitle`, { defaultValue: "" });
          const i18nDescription = t(`${itemsKeyBase}.${card.key}.description`, { defaultValue: "" });
          const cardFieldKeys = new Set(cmsContent.fieldKeys(card.cardSectionKey));
          // Canonical-first lt. card_v1-Textvertrag:
          // title || headline || i18n, description || beschreibung || i18n,
          // eyebrow || subtitle || i18n.
          const cardTitle =
            cmsContent.text(card.cardSectionKey, "title", loc, "") ||
            cmsContent.text(card.cardSectionKey, "headline", loc, "") ||
            i18nTitle;

          // Asset-Quellen für die zentrale Sichtbarkeits-Wahrheit.
          const dbImg = cmsContent.asset(card.cardSectionKey, "image", "");
          const legacyImg = cmsContent.asset(sectionKey, `image_${card.key}`, card.image);
          const hasImageAsset = !!(dbImg || legacyImg);
          const hasIconImageAsset = !!cmsContent.asset(card.cardSectionKey, "icon_image", "");

          // Eltern-Section-Typ für den Resolver (Spiegel-Regel: gleiche Wahrheit
          // wie generische Renderer/Admin-Workspace).
          const parentSec = cmsContent.sections.find((s) => s.section_key === sectionKey);
          const vis = resolveCardVisibility({
            valueFor: (fk, l) => cmsContent.text(card.cardSectionKey, fk, l, "") || null,
            hasImage: hasImageAsset,
            hasThumbnail: false,
            hasIconImage: hasIconImageAsset,
            parentSectionType: parentSec?.section_type ?? null,
            parentSectionKey: sectionKey,
          });

          const eyebrowCanonical = cmsContent.text(card.cardSectionKey, "eyebrow", loc, "");
          const eyebrowAlias = cmsContent.text(card.cardSectionKey, "subtitle", loc, "");
          const hasEyebrowField = cardFieldKeys.has("eyebrow") || cardFieldKeys.has("subtitle");
          const eyebrowEnabled = vis.eyebrowVisible || !hasEyebrowField;
          const cardEyebrow = eyebrowEnabled
            ? (eyebrowCanonical || eyebrowAlias || (hasEyebrowField ? "" : (i18nSubtitle ?? "")))
            : "";
          const descCanonical = cmsContent.text(card.cardSectionKey, "description", loc, "");
          const descAlias = cmsContent.text(card.cardSectionKey, "beschreibung", loc, "");
          const cardDescription = descCanonical || descAlias || (i18nDescription ?? "");


          // Bild: zuerst neuer Slot (card_*.image), dann alter Slot (parent.image_<key>), dann Code
          const imgSrc = vis.imageVisible ? (dbImg || legacyImg) : "";

          // Pilot B-026/B-027 + B-538 Rot-Fix: Bullets/Chips/Links über den
          // zentralen Resolver (gleiche Wahrheit wie Admin & E2E). Bullets
          // canonical-first (`bullets.N`, Fallback `features.N`).
          const features = [0, 1, 2, 3, 4]
            .filter((n) => vis.bulletsVisible[n])
            .map((n) => {
              const canon = cmsContent.text(card.cardSectionKey, `bullets.${n}`, loc, "").trim();
              if (canon.length > 0) return canon;
              return cmsContent.text(card.cardSectionKey, `features.${n}`, loc, "").trim();
            })
            .filter((v) => v.length > 0);
          const chips = [0, 1, 2, 3, 4]
            .filter((n) => vis.chipsVisible[n])
            .map((n) => cmsContent.text(card.cardSectionKey, `chips.${n}`, loc, "").trim())
            .filter((v) => v.length > 0);
          // Link gilt erst dann als aktiv, wenn Label + Ziel + Sichtbar-Schalter
          // gesetzt sind UND das Ziel öffentlich auflösbar ist. Kurz-IDs wie
          // `P-203`/`B-538` ohne aufgelöste URL bleiben unsichtbar (Admin
          // markiert sie als „Kurz-ID-Ziel noch nicht auflösbar").
          const isResolvableHref = (h: string) =>
            /^(\/|https?:\/\/|mailto:|tel:|#)/i.test(h);
          const links = [1, 2, 3]
            .filter((n) => vis.linksVisible[n - 1])
            .map((n) => {
              const label = cmsContent.text(card.cardSectionKey, `link_${n}_label`, loc, "").trim();
              const href = cmsContent.text(card.cardSectionKey, `link_${n}_href`, loc, "").trim();
              const kind = cmsContent.text(card.cardSectionKey, `link_${n}_kind`, loc, "").trim();
              return { n, label, href, kind };
            })
            .filter((l) => l.label.length > 0 && l.href.length > 0 && isResolvableHref(l.href));

          // Icon: Sichtbarkeit via zentralem Resolver (`icon` leer = aus).
          const ShowIcon = vis.iconVisible && vis.iconName.length > 0 ? resolveIcon(vis.iconName) : null;



          return (
            <motion.div
              key={card.key}
              data-cms-section={card.cardSectionKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group bg-card border border-border rounded-lg overflow-hidden shadow-card hover:shadow-elevated transition-all snap-start shrink-0 w-[calc((100%-4*1.5rem)/3.125)] min-w-[280px] flex flex-col"
            >
              {imgSrc && (
                <div className="aspect-[4/3] bg-secondary overflow-hidden" data-cms-field="image">
                  <img
                    src={imgSrc}
                    alt={cardTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-7 flex flex-col flex-1">
                {ShowIcon && (
                  <span data-cms-field="icon" className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
                    <ShowIcon className="h-4 w-4" />
                  </span>
                )}
                {cardEyebrow && (
                  <span data-cms-field="eyebrow" className="text-sm text-muted-foreground block mb-2">{cardEyebrow}</span>
                )}
                <h4 className="font-heading font-semibold text-foreground text-base mb-3">{cardTitle}</h4>

                {cardDescription && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{cardDescription}</p>
                )}
                {features.length > 0 && (
                  <ul
                    className="mb-4 list-disc pl-5 space-y-1 text-sm text-muted-foreground marker:text-primary"
                    data-cms-field="bullets"
                  >
                    {features.map((f, fi) => (
                      <li key={fi} className="leading-relaxed">
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                {chips.length > 0 && (
                  <ul className="mb-4 flex flex-wrap gap-1.5" data-cms-field="chips">
                    {chips.map((c, ci) => (
                      <li
                        key={ci}
                        className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto">
                  {links.length > 0 && (
                    <ul className={`flex flex-col gap-1 ${showDividers ? CARD_DIVIDER_CLASS : ""}`} data-cms-field="links">
                      {links.map((l) => (
                        <li key={l.n}>
                          <a
                            href={l.href}
                            title={`${l.kind || "link"}: ${l.href}`}
                            className="group/link flex items-center justify-between gap-2 text-sm text-primary hover:underline"
                          >
                            <span>{l.label}</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
};

/* ------------------------------- Section-API ------------------------------- */

type SectionCtx = {
  cmsOr: (key: string, fb: string) => string;
  t: TFunction;
  cmsContent: CmsPageContent;
  locale: AppLocale;
};
type SectionComponent = React.FC<SectionCtx>;

const UeberblickSection: SectionComponent = ({ cmsOr, t }) => (
  <section className="py-16 lg:py-24 bg-background">
    <div className="container mx-auto">
      <ContentSection
        label={cmsOr("ueberblick.label", t("tuersprechanlagen.ueberblick.label"))}
        title={cmsOr("ueberblick.title", t("tuersprechanlagen.ueberblick.title"))}
      >
        <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
          {cmsOr("ueberblick.p1", t("tuersprechanlagen.ueberblick.p1"))}
        </p>
        <p className="text-muted-foreground leading-relaxed max-w-3xl">
          {cmsOr("ueberblick.p2", t("tuersprechanlagen.ueberblick.p2"))}
        </p>
      </ContentSection>
    </div>
  </section>
);

const AussenstationenSection: SectionComponent = ({ cmsOr, t, cmsContent }) => (
  <section className="py-16 lg:py-24 bg-section-muted">
    <div className="container mx-auto">
      <ProduktScroller
        label={cmsOr("aussenstationen.label", t("tuersprechanlagen.aussenstationen.label"))}
        title={cmsOr("aussenstationen.title", t("tuersprechanlagen.aussenstationen.title"))}
        description={cmsOr("aussenstationen.description", t("tuersprechanlagen.aussenstationen.description"))}
        cards={aussenstationenCards}
        itemsKeyBase="tuersprechanlagen.aussenstationen.items"
        cmsContent={cmsContent}
        sectionKey="aussenstationen"
      />
    </div>
  </section>
);

const InnenstationenSection: SectionComponent = ({ cmsOr, t, cmsContent }) => (
  <section className="py-16 lg:py-24 bg-background">
    <div className="container mx-auto">
      <ProduktScroller
        label={cmsOr("innenstationen.label", t("tuersprechanlagen.innenstationen.label"))}
        title={cmsOr("innenstationen.title", t("tuersprechanlagen.innenstationen.title"))}
        description={cmsOr("innenstationen.description", t("tuersprechanlagen.innenstationen.description"))}
        cards={innenstationenCards}
        itemsKeyBase="tuersprechanlagen.innenstationen.items"
        cmsContent={cmsContent}
        sectionKey="innenstationen"
      />
    </div>
  </section>
);

const VorteileSection: SectionComponent = ({ cmsOr, t, cmsContent, locale }) => {
  const shortIdMap = useShortIdResolver();
  // Tranche 12-renderer: card_v1-Kindsections unter `vorteile` DB-first lesen.
  const vorteileCards = cmsContent.sections
    .filter((s) => s.parent_section_key === "vorteile" && s.section_type === "card_v1")
    .sort((a, b) => a.sort_order - b.sort_order);
  const fallbackByKey = new Map<string, (typeof vorteileItems)[number]>(vorteileItems.map((v) => [v.key, v]));
  const rendered = vorteileCards.length > 0
    ? vorteileCards.map((c) => {
        const legacyKey = c.section_key.replace(/^vorteile__/, "");
        const fb = fallbackByKey.get(legacyKey) ?? vorteileItems[0];
        return { sectionKey: c.section_key, legacyKey, fallback: fb };
      })
    : vorteileItems.map((v) => ({ sectionKey: `vorteile__${v.key}`, legacyKey: v.key, fallback: v }));

  return (
    <section className="py-16 lg:py-24 bg-section-muted">
      <div className="container mx-auto">
        <ContentSection
          label={cmsOr("vorteile.label", t("tuersprechanlagen.vorteile.label"))}
          title={cmsOr("vorteile.title", t("tuersprechanlagen.vorteile.title"))}
        >
          <div className="grid md:grid-cols-2 gap-8" data-cms-section="vorteile">
            {rendered.map((item) => {
              const iconVisLegacy = cmsContent.text("vorteile", `items.${item.legacyKey}.icon`, locale, "");
              const iconNameDb = cmsContent.text(item.sectionKey, "icon", locale, "") || iconVisLegacy || item.fallback.iconName;
              const iconEnabledRaw = (
                cmsContent.text(item.sectionKey, "icon_enabled", locale, "")
                || cmsContent.text("vorteile", `items.${item.legacyKey}.icon_enabled`, locale, "")
                || ""
              ).trim();
              const iconEnabled = iconEnabledRaw === "" ? true : iconEnabledRaw === "1";
              const Icon = iconNameDb && iconEnabled ? resolveIcon(iconNameDb, item.fallback.icon) : null;
              const title = cmsContent.text(
                item.sectionKey, "title", locale,
                t(`tuersprechanlagen.vorteile.items.${item.legacyKey}.title`, { defaultValue: "" }),
              );
              const desc = cmsContent.text(
                item.sectionKey, "description", locale,
                t(`tuersprechanlagen.vorteile.items.${item.legacyKey}.desc`, { defaultValue: "" }),
              );
              // Batch 46 — card_v1-Vertrag: Bullets/Chips/Links über zentralen Resolver.
              const vis = resolveCardVisibility({
                valueFor: (fk, l) => cmsContent.text(item.sectionKey, fk, l, "") || null,
                hasImage: false,
                hasThumbnail: false,
                hasIconImage: !!cmsContent.asset(item.sectionKey, "icon_image", ""),
                parentSectionType: "cards_v1",
                parentSectionKey: "vorteile",
              });
              const bullets = [0, 1, 2, 3, 4]
                .filter((i) => vis.bulletsVisible[i])
                .map((i) => cmsContent.text(item.sectionKey, `bullets.${i}`, locale, "") || cmsContent.text(item.sectionKey, `features.${i}`, locale, ""))
                .filter(Boolean);
              const chips = [0, 1, 2, 3, 4]
                .filter((i) => vis.chipsVisible[i])
                .map((i) => cmsContent.text(item.sectionKey, `chips.${i}`, locale, ""))
                .filter(Boolean);
              const links = vis.linksVisible
                .map((visible, idx) => {
                  if (!visible) return null;
                  const n = idx + 1;
                  const r = resolveHref(cmsContent.text(item.sectionKey, `link_${n}_href`, locale, ""), shortIdMap);
                  if (!r.valid) return null;
                  return {
                    n,
                    label: cmsContent.text(item.sectionKey, `link_${n}_label`, locale, "") || learnMoreFallback(locale),
                    href: r.href,
                  };
                })
                .filter((l): l is { n: number; label: string; href: string } => l !== null);
              return (
                <div
                  key={item.sectionKey}
                  data-cms-section={item.sectionKey}
                  className="border border-border bg-card p-6"
                >
                  <span data-cms-field="icon">
                    {Icon && <Icon className="w-8 h-8 text-primary mb-4" strokeWidth={1.5} />}
                  </span>
                  <h3 data-cms-field="title" className="text-lg font-heading font-normal text-foreground mb-2">
                    {title}
                  </h3>
                  <p data-cms-field="description" className="text-muted-foreground text-sm leading-relaxed">
                    {desc}
                  </p>
                  {bullets.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary" data-cms-field="bullets">
                      {bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                    </ul>
                  )}
                  {chips.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5" data-cms-field="chips">
                      {chips.map((c, ci) => (
                        <li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>
                      ))}
                    </ul>
                  )}
                  {links.length > 0 && (
                    <div className="mt-4 flex flex-col gap-1" data-cms-field="links">
                      {links.map((l) => (
                        <a key={l.n} href={l.href} className="text-sm text-primary hover:underline self-start">{l.label} →</a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ContentSection>
      </div>
    </section>
  );
};




/**
 * Anwendungsumfelder — drei Karten (Einfamilienhaus, Mehrfamilienhaus,
 * Gewerbebau) im card_v1-Stil (Bild oben, Titel, Teaser, CTA).
 * Inhalte aus `cms_section_fields` (items.<key>.title|teaser, label, title,
 * learnMore), Bilder aus `cms_assets` (field_keys: image_efh, image_mfh,
 * image_gewerbe).
 */
const ANWENDUNGSUMFELDER_ITEMS = [
  { key: "einfamilienhaus", imageField: "image_efh" },
  { key: "mehrfamilienhaus", imageField: "image_mfh" },
  { key: "gewerbebau", imageField: "image_gewerbe" },
] as const;

const AnwendungsumfelderSection: SectionComponent = ({ cmsOr, t, cmsContent, locale }) => {
  const shortIdMap = useShortIdResolver();
  const label = cmsOr("anwendungsumfelder.label", t("tuersprechanlagen.anwendungsumfelder.label"));
  const title = cmsOr("anwendungsumfelder.title", t("tuersprechanlagen.anwendungsumfelder.title"));
  const learnMoreFallback = cmsOr("anwendungsumfelder.learnMore", t("tuersprechanlagen.anwendungsumfelder.learnMore"));

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto">
        <div className="mb-10 max-w-3xl">
          <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{label}</span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground">{title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-cms-section="anwendungsumfelder">
          {(() => {
            const childCards = cmsContent.sections
              .filter((s) => s.parent_section_key === "anwendungsumfelder" && s.section_type === "card_v1")
              .sort((a, b) => a.sort_order - b.sort_order);
            const fallbackByKey = new Map<string, (typeof ANWENDUNGSUMFELDER_ITEMS)[number]>(
              ANWENDUNGSUMFELDER_ITEMS.map((i) => [i.key, i]),
            );
            const rendered = childCards.length > 0
              ? childCards.map((c) => {
                  const legacyKey = c.section_key.replace(/^anwendungsumfelder__/, "");
                  const fb = fallbackByKey.get(legacyKey);
                  return { sectionKey: c.section_key, legacyKey, imageField: fb?.imageField };
                })
              : ANWENDUNGSUMFELDER_ITEMS.map((i) => ({
                  sectionKey: `anwendungsumfelder__${i.key}`,
                  legacyKey: i.key,
                  imageField: i.imageField,
                }));
            return rendered.map((item) => {
              const cardTitle = cmsContent.text(
                item.sectionKey, "title", "de",
                cmsOr(`anwendungsumfelder.items.${item.legacyKey}.title`, ""),
              );
              const teaser = cmsContent.text(
                item.sectionKey, "description", "de",
                cmsOr(`anwendungsumfelder.items.${item.legacyKey}.teaser`, ""),
              );
              const childImage = cmsContent.asset(item.sectionKey, "image", "");
              const legacyImage = item.imageField
                ? cmsContent.asset("anwendungsumfelder", item.imageField, "")
                : "";
              const image = childImage || legacyImage;
              const alt = childImage
                ? cmsContent.assetAlt(item.sectionKey, "image", "de", cardTitle)
                : (item.imageField
                    ? cmsContent.assetAlt("anwendungsumfelder", item.imageField, "de", cardTitle)
                    : cardTitle);
              // Batch 46 — card_v1-Vertrag: Bullets/Chips/Links über zentralen
              // Resolver. Statisches Pseudo-`learnMore`-Label (ohne href)
              // entfällt; sichtbar nur, wenn link_1 aktiv und Ziel auflösbar.
              const vis = resolveCardVisibility({
                valueFor: (fk, l) => cmsContent.text(item.sectionKey, fk, l, "") || null,
                hasImage: !!image,
                hasThumbnail: false,
                hasIconImage: false,
                parentSectionType: "cards_v1",
                parentSectionKey: "anwendungsumfelder",
              });
              const bullets = [0, 1, 2, 3, 4]
                .filter((i) => vis.bulletsVisible[i])
                .map((i) => cmsContent.text(item.sectionKey, `bullets.${i}`, locale, "") || cmsContent.text(item.sectionKey, `features.${i}`, locale, ""))
                .filter(Boolean);
              const chips = [0, 1, 2, 3, 4]
                .filter((i) => vis.chipsVisible[i])
                .map((i) => cmsContent.text(item.sectionKey, `chips.${i}`, locale, ""))
                .filter(Boolean);
              const links = vis.linksVisible
                .map((visible, idx) => {
                  if (!visible) return null;
                  const n = idx + 1;
                  const r = resolveHref(cmsContent.text(item.sectionKey, `link_${n}_href`, locale, ""), shortIdMap);
                  if (!r.valid) return null;
                  return {
                    n,
                    label: cmsContent.text(item.sectionKey, `link_${n}_label`, locale, "") || learnMoreFallback,
                    href: r.href,
                  };
                })
                .filter((l): l is { n: number; label: string; href: string } => l !== null);
              return (
                <article
                  key={item.sectionKey}
                  data-cms-section={item.sectionKey}
                  className="border border-border bg-card overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                >
                  <div data-cms-field="image">
                    {image ? (
                      <img src={image} alt={alt} loading="lazy" className="w-full aspect-[4/3] object-cover" />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-muted" />
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    {cardTitle && (
                      <h3 data-cms-field="title" className="text-lg font-heading font-normal text-foreground mb-2">
                        {cardTitle}
                      </h3>
                    )}
                    {teaser && (
                      <p data-cms-field="description" className="text-sm text-muted-foreground leading-relaxed flex-1">{teaser}</p>
                    )}
                    {bullets.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary" data-cms-field="bullets">
                        {bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    )}
                    {chips.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" data-cms-field="chips">
                        {chips.map((c, ci) => (
                          <li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>
                        ))}
                      </ul>
                    )}
                    {links.length > 0 && (
                      <div className="mt-4 flex flex-col gap-1" data-cms-field="links">
                        {links.map((l) => (
                          <a key={l.n} href={l.href} className="mt-1 inline-flex items-center gap-2 text-sm text-primary hover:underline self-start">
                            {l.label}
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            });
          })()}
        </div>

      </div>
    </section>
  );
};

/**
 * Registry: section_key → React-Komponente.
 * `hero` ist absichtlich NICHT enthalten — Hero ist Wrapper-Konfiguration
 * von `<CmsPageLayout pageKey="gebaeudekommunikation.tuersprechanlagen">`, kein normaler Inhaltsblock.
 */
const SECTION_RENDERERS: Record<string, SectionComponent> = {
  ueberblick: UeberblickSection,
  aussenstationen: AussenstationenSection,
  innenstationen: InnenstationenSection,
  vorteile: VorteileSection,
  // `anwendungsumfelder` wird jetzt über den generischen Renderer nach
  // `section_type` (product_scroller_v1) gerendert — damit greift die
  // Typ-Änderung im CMS-Light (Kartenraster ↔ Kartenscroller).
  // Der lokale `AnwendungsumfelderSection` bleibt als Referenz-/Fallback
  // ungenutzt, falls künftig wieder eine Sonderdarstellung nötig wird.
};
void AnwendungsumfelderSection;

/* --------------------------------- Page ----------------------------------- */

const Tuersprechanlagen = () => {
  const { t, i18n } = useTranslation("gebaeudekommunikation");

  const { fields: cmsFields } = useCmsPageFields(PAGE_KEY);
  const cmsOr = (key: string, fb: string) => pickCmsOrFallback(cmsFields, key, fb);
  const cmsContent: CmsPageContent = useCmsPageContent(PAGE_KEY);
  const locale = normalizeLocale(i18n.language);
  const dbSectionCount = cmsContent.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cmsContent.hasDbContent && dbSectionCount > 0;
  // Batch 18 / Welle 4: Sichtbarkeits-Gate fuer hartcodierte Section-Renderer.
  // `dbOrder` filtert unten zur Laufzeit, der statische Audit erkennt aber nur
  // explizite `cms.sections.some(... section_key === "X")` Aufrufe.
  const cms = cmsContent;
  const vorteileActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "vorteile");
  const anwendungsumfelderActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "anwendungsumfelder");
  void vorteileActive; void anwendungsumfelderActive;

  // Helper: hat CmsBodyRenderer einen generischen Renderer für diesen section_type?
  const hasGenericRenderer = (sectionType: string | null | undefined): boolean => {
    const normalized = cmsNormalizeType(sectionType);
    if (!normalized || CMS_SKIP_TYPES.has(normalized)) return false;
    return CMS_RENDERERS[normalized] != null;
  };

  // Reihenfolge aus DB ziehen. Hero filtern (ist Wrapper). Code-Sections, die
  // wir nicht kennen UND keine block_*/persona_*-Pastes sind UND keinen
  // generischen Section-Typ haben, werden übersprungen.
  const dbOrder = cmsContent.sections
    .filter((s) => !s.parent_section_key)
    .filter((s) => s.section_key !== "hero")
    .filter(
      (s) =>
        SECTION_RENDERERS[s.section_key] != null ||
        s.section_key.startsWith("block_") ||
        s.section_key.startsWith("persona_") ||
        hasGenericRenderer(s.section_type),
    )
    .map((s) => s.section_key);
  const orderedKeys = dbOrder.length > 0 ? dbOrder : FALLBACK_ORDER;

  // Position innerhalb der eingefügten block_*-Reihenfolge — für das
  // links/rechts-Wechseln des Bildes in ContentBlockItem.
  let blockPos = 0;

  return (
    <CmsPageLayout pageKey="gebaeudekommunikation.tuersprechanlagen"
      label={cmsOr("hero.label", t("tuersprechanlagen.hero.label"))}
      headline={cmsOr("hero.headline", t("tuersprechanlagen.hero.headline"))}
      intro={cmsOr("hero.intro", t("tuersprechanlagen.hero.intro"))}
      heroImage={cmsContent.asset("hero", "image", "")}
      fullWidth
    >
      {orderedKeys.map((key) => {
        if (key.startsWith("block_") || key.startsWith("persona_")) {
          const idx = blockPos++;
          return (
            <ContentBlockItem
              key={key}
              sectionKey={key}
              positionIndex={idx}
              pageKey={PAGE_KEY}
            />
          );
        }
        const Renderer = SECTION_RENDERERS[key];
        if (Renderer) {
          return <Renderer key={key} cmsOr={cmsOr} t={t} cmsContent={cmsContent} locale={locale} />;
        }
        // Generischer Fallback: Section mit bekanntem section_type über CmsBodyRenderer-Mapping rendern.
        const sec = cmsContent.sections.find((s) => s.section_key === key);
        if (!sec) return null;
        const normalized = cmsNormalizeType(sec.section_type);
        if (!normalized) return null;
        const genericRenderer = CMS_RENDERERS[normalized];
        if (!genericRenderer) return null;
        const children = cmsContent.sections
          .filter((c) => c.parent_section_key === sec.section_key)
          .map((c) => ({ section_key: c.section_key, section_type: c.section_type ?? null }));
        const ctx: CmsSectionContext = {
          pageKey: PAGE_KEY,
          cms: cmsContent,
          locale,
          sectionKey: sec.section_key,
          children,
        };
        return <div key={key}>{genericRenderer(ctx)}</div>;
      })}

    <CmsSourceBadge
      pageKey="gebaeudekommunikation.tuersprechanlagen"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
      <SiblingNav pageKey="gebaeudekommunikation.tuersprechanlagen" />
    </CmsPageLayout>
  );
};

export default Tuersprechanlagen;
