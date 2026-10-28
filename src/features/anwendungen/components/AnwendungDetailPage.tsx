import { Fragment } from "react";
import { motion } from "framer-motion";
import SiblingNav from "@/components/SiblingNav";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/PageLayout";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { isCardIconVisible, resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { learnMoreFallback } from "@/i18n/uiFallbacks";

export type Anforderung = {
  icon: React.ElementType;
  label: string;
  text: string;
};

export type Leistungsbereich = {
  title: string;
  items: string[];
};

export type Systembaustein = {
  label: string;
  title: string;
  description: string;
  href?: string;
};

export type VerwandteAnwendung = {
  label: string;
  href: string;
};

export type AnwendungPageData = {
  label: string;
  headline: string;
  intro: string;
  heroImage: string;
  description: string;
  anforderungen: Anforderung[];
  leistungen: Leistungsbereich[];
  systembausteine?: Systembaustein[];
  broschure?: { label: string; href: string };
  verwandteAnwendungen?: VerwandteAnwendung[];
};

type CmsListItem = { key: string; label: string; text: string; iconName: string };
type CmsLeistungsbereich = { key: string; title: string; items: string[] };
type CmsSystembaustein = { key: string; label: string; title: string; description: string; href?: string };

const sortIndexedKeys = (a: string, b: string) => {
  const ai = Number(a.split(".").pop() ?? "0");
  const bi = Number(b.split(".").pop() ?? "0");
  return ai - bi;
};

const uniquePrefixes = (keys: string[]) =>
  Array.from(new Set(keys.map((k) => k.split(".")[0]).filter(Boolean)));

const AnwendungDetailPage = ({ data, pageKey }: { data: AnwendungPageData; pageKey?: string }) => {
  const { t, i18n } = useTranslation("anwendungen");
  const cms = useCmsPageContent(pageKey ?? null);
  const loc = normalizeLocale(i18n.language);
  const shortIdMap = useShortIdResolver();

  // Batch 19 — Admin-Schalter Spiegel: jede der 4 Standard-Sections wird nur
  // gerendert, wenn sie im CMS aktiv ist. Wenn die Seite keinen pageKey hat
  // oder gar keine Sections aus dem CMS lädt (Legacy/Fallback), bleibt alles
  // sichtbar wie bisher, damit nichts kaputt geht.
  const cmsHasSections = !!pageKey && cms.sections.length > 0;
  const anforderungenActive = !cmsHasSections || cms.sections.some((s) => s.section_key === "anforderungen");
  const leistungenActive = !cmsHasSections || cms.sections.some((s) => s.section_key === "leistungen");
  const systembausteineActive = !cmsHasSections || cms.sections.some((s) => s.section_key === "systembausteine");
  const broschureActive = !cmsHasSections || cms.sections.some((s) => s.section_key === "broschure");

  // Hero-Bild: bevorzugt aus CMS (`hero.image` in `cms_assets`), sonst
  // der Code-Fallback aus `data.heroImage`. So bleibt die Seite auch
  // ohne CMS-Eintrag wie bisher sichtbar.
  const heroImage = cms.asset("hero", "image", data.heroImage);
  const heroAlt = cms.assetAlt("hero", "image", loc, data.headline);
  // Responsive Varianten aus demselben Slot (mobile/tablet/desktop).
  const heroSet = cms.assetSet("hero", "image");

  /** Erstes nicht-leeres Feld aus mehreren Section/Field-Kandidaten. */
  const pickText = (
    candidates: Array<[string, string]>,
    fallback: string,
  ): string => {
    for (const [section, field] of candidates) {
      const v = cms.text(section, field, loc, "");
      if (v && v.trim().length > 0) return v;
    }
    return fallback;
  };

  // Eine Wahrheit für den Hero: der Hero-Block (`hero`) ist führend,
  // der Altblock `content` bleibt nur Rückfallebene, danach der Code/i18n-Wert.
  const contentLabel = pickText([["hero", "eyebrow"], ["content", "label"]], data.label);
  const contentHeadline = pickText([["hero", "headline"], ["content", "headline"]], data.headline);
  // Subline wie Beschreibungssatz: existiert im Hero-Block eine Datenzeile
  // `subline` oder `intro` (auch leer), ist die DB die einzige Wahrheit —
  // kein alter Code-/i18n-Text mehr. Nur Seiten ohne CMS-Zeile behalten ihn.
  const heroKeys = cms.fieldKeys("hero");
  const heroIntroManaged = heroKeys.includes("subline") || heroKeys.includes("intro");
  const contentIntro = pickText(
    [["hero", "subline"], ["hero", "intro"], ["content", "intro"]],
    heroIntroManaged ? "" : data.intro,
  );
  const contentSubheadline = pickText([["hero", "subheadline"]], "");
  // Batch 65/67: Beschreibungssatz DB-first aus dem Hero-Block. Sobald für
  // `hero.description` überhaupt eine Datenzeile existiert (auch leer), ist die
  // Datenbank die einzige Wahrheit — der alte Code-/i18n-Text wird dann NICHT
  // mehr eingeblendet. Nur Seiten ohne CMS-Zeile behalten den Code-Fallback.
  const heroDescriptionManaged = cms.fieldKeys("hero").includes("description");
  const contentDescription = pickText(
    [["hero", "description"], ["content", "description"]],
    heroDescriptionManaged ? "" : data.description,
  );




  // Tranche 27b — Echte Iconkarten als `card_v1`-Kindsections unter
  // `anforderungen`. Wenn vorhanden: DB-first aus Kindsections lesen
  // (title/description/icon + optional icon_image-Asset). Andernfalls
  // Fallback auf den Legacy-Sammelblock aus 27a (<key>.label/.text/.icon).
  const ANFORDERUNGEN_CHILD_PREFIX = "anforderungen_item_";
  const anforderungenChildren = cms.sections
    .filter((s) => s.section_key.startsWith(ANFORDERUNGEN_CHILD_PREFIX) && s.section_type === "card_v1")
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const cmsAnforderungen: CmsListItem[] = anforderungenChildren.length > 0
    ? anforderungenChildren.map((sec) => ({
        key: sec.section_key.slice(ANFORDERUNGEN_CHILD_PREFIX.length),
        label: cms.text(sec.section_key, "title", loc, ""),
        text: cms.text(sec.section_key, "description", loc, ""),
        iconName: cms.text(sec.section_key, "icon", loc, ""),
      })).filter((item) => item.label || item.text)
    : uniquePrefixes(cms.fieldKeys("anforderungen"))
        .map((key) => ({
          key,
          label: cms.text("anforderungen", `${key}.label`, loc, ""),
          text: cms.text("anforderungen", `${key}.text`, loc, ""),
          iconName: cms.text("anforderungen", `${key}.icon`, loc, ""),
        }))
        .filter((item) => item.label || item.text);

  // Map child section_key per Karte für DOM-Marker und Asset-Lookup.
  const anforderungenSectionKeyByItemKey = new Map(
    anforderungenChildren.map((s) => [s.section_key.slice(ANFORDERUNGEN_CHILD_PREFIX.length), s.section_key]),
  );
  const useChildSections = anforderungenChildren.length > 0;

  const cmsLeistungen: CmsLeistungsbereich[] = uniquePrefixes(cms.fieldKeys("leistungen"))
    .map((key) => ({
      key,
      title: cms.text("leistungen", `${key}.title`, loc, ""),
      items: cms
        .fieldKeys("leistungen")
        .filter((fieldKey) => fieldKey.startsWith(`${key}.items.`))
        .sort(sortIndexedKeys)
        .map((fieldKey) => cms.text("leistungen", fieldKey, loc, ""))
        .filter(Boolean),
    }))
    .filter((item) => item.title || item.items.length > 0);

  const cmsSystembausteine: CmsSystembaustein[] = uniquePrefixes(cms.fieldKeys("systembausteine"))
    .map((key) => ({
      key,
      label: cms.text("systembausteine", `${key}.label`, loc, ""),
      title: cms.text("systembausteine", `${key}.title`, loc, ""),
      description: cms.text("systembausteine", `${key}.description`, loc, ""),
      href: cms.text("systembausteine", `${key}.href`, loc, "") || undefined,
    }))
    .filter((item) => item.label || item.title || item.description);

  // Tranche 27a/27b — DB-first nach CMS-Key. Bei Kindsections (27b) liefert
  // cmsAnforderungen bereits Key+Label+Text+Iconname; bei Legacy-Sammelblock
  // (27a-Pfad) ebenso. Code-Icon-Fallback wird nicht positional benutzt.
  const renderedAnforderungen = cmsAnforderungen.length > 0
    ? cmsAnforderungen.map((c) => ({
        icon: undefined as unknown as React.ElementType,
        cmsKey: c.key,
        label: c.label,
        text: c.text,
        iconName: c.iconName,
      }))
    : data.anforderungen.map((fallback) => ({
        ...fallback,
        cmsKey: "",
        iconName: "",
      }));

  const renderedLeistungen = cmsLeistungen.length > 0
    ? cmsLeistungen.map((c) => ({
        title: c.title,
        items: c.items,
      }))
    : data.leistungen;

  const renderedSystembausteine = cmsSystembausteine.length > 0
    ? cmsSystembausteine.map((c) => ({
        cmsKey: c.key,
        label: c.label,
        title: c.title,
        description: c.description,
        href: c.href,
      }))
    : (data.systembausteine ?? []).map((fallback) => ({
        cmsKey: "",
        label: fallback.label,
        title: fallback.title,
        description: fallback.description,
        href: fallback.href,
      }));

  // Broschüre DB-first: Titel, Text, Linktext und Ziel kommen aus CMS-Light,
  // Code-Werte dienen nur als Fallback.
  const broschureTitle = cms.text("broschure", "title", loc, "");
  const broschureText =
    cms.text("broschure", "intro", loc, "") || cms.text("broschure", "text", loc, "");

  const broschureLabel = cms.text("broschure", "label", loc, data.broschure?.label ?? "");
  const broschureHref = cms.text("broschure", "href", loc, data.broschure?.href ?? "");
  const broschure =
    broschureTitle || broschureText || (broschureLabel && broschureHref)
      ? {
          title: broschureTitle,
          text: broschureText,
          label: broschureLabel,
          href: broschureHref,
        }
      : undefined;





  // Batch 68 — Eine Wahrheit für die Reihenfolge: Alle Top-Level-Blöcke werden
  // strikt in der CMS-Reihenfolge (`sort_order`) ausgespielt. Die vier
  // Sonderblöcke (content/anforderungen/leistungen/systembausteine/broschure)
  // behalten ihr Layout, wandern aber an ihre DB-Position.
  const INLINE_KEYS = ["content", "anforderungen", "leistungen", "systembausteine", "broschure"];
  const orderedTopLevel: string[] = cmsHasSections
    ? cms.sections
        .filter((s) => !s.parent_section_key && s.section_key !== "hero" && s.section_key !== "standard_cta")
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => s.section_key)
    : INLINE_KEYS;

  const sectionTypeByKey = new Map(cms.sections.map((s) => [s.section_key, s.section_type]));

  const renderDescription = () => (
    <section className="py-8 lg:py-12 bg-background" key="content">
      <div className="container mx-auto">
        <p className="text-muted-foreground leading-relaxed max-w-3xl">
          {contentDescription}
        </p>
      </div>
    </section>
  );

  // DB-first: Blocküberschrift (`title`) und Einleitung (`intro`) kommen aus
  // CMS-Light; die bisherigen i18n-Texte bleiben nur Rückfall.
  const anforderungenTitle = cms.text(
    "anforderungen",
    "title",
    loc,
    t("shared.sections.anforderungen"),
  );
  const anforderungenIntro = cms.text(
    "anforderungen",
    "intro",
    loc,
    t("shared.subtitles.anforderungenForHeadline", { headline: data.headline }),
  );

  const renderAnforderungen = () => (
    <section className="py-16 lg:py-24 bg-background" key="anforderungen">
      <div className="container mx-auto">
        <>
            <h2
              className="text-xl md:text-2xl font-heading font-normal text-foreground mb-2"
              data-cms-field="title"
            >
              {anforderungenTitle}
            </h2>
            {anforderungenIntro ? (
              <p className="text-sm text-muted-foreground mb-8" data-cms-field="intro">
                {anforderungenIntro}
              </p>
            ) : null}
            <div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
              data-cms-page={pageKey}
              data-cms-section="anforderungen"
            >
              {renderedAnforderungen.map((anf, i) => {

                const fieldBase = anf.cmsKey;
                const childSectionKey = useChildSections
                  ? anforderungenSectionKeyByItemKey.get(fieldBase)
                  : undefined;
                const iconVis = childSectionKey
                  ? isCardIconVisible(cms, childSectionKey, loc)
                  : (fieldBase
                      ? isCardIconVisible(cms, "anforderungen", loc, `${fieldBase}.icon`)
                      : { visible: !!anf.icon, name: "" });
                const Icon = iconVis.visible ? resolveIcon(iconVis.name || anf.iconName, (anf.icon as never) ?? undefined) : null;
                const iconImageUrl = childSectionKey
                  ? cms.asset(childSectionKey, "icon_image", "")
                  : "";
                const iconImageAlt = childSectionKey
                  ? cms.assetAlt(childSectionKey, "icon_image", loc, anf.label)
                  : anf.label;
                const cardDataSection = childSectionKey ?? undefined;
                const cardDataPage = pageKey;
                // Batch 46 — card_v1-Vertrag: Bullets/Chips/Links aus zentralem
                // Resolver. Nur sichtbar bei aktiv + (für Links) auflösbarem Ziel.
                // Layout/Klassen unverändert; neue Module erscheinen nur, wenn
                // die Karte tatsächlich Inhalte freigeschaltet hat.
                let bullets: string[] = [];
                let chips: string[] = [];
                let links: { n: number; label: string; href: string }[] = [];
                if (childSectionKey) {
                  const vis = resolveCardVisibility({
                    valueFor: (fk, l) => cms.text(childSectionKey, fk, l, "") || null,
                    hasImage: false,
                    hasThumbnail: false,
                    hasIconImage: !!iconImageUrl,
                    parentSectionType: "cards_v1",
                    parentSectionKey: "anforderungen",
                  });
                  bullets = [0, 1, 2, 3, 4]
                    .filter((bi) => vis.bulletsVisible[bi])
                    .map((bi) => cms.text(childSectionKey, `bullets.${bi}`, loc, "") || cms.text(childSectionKey, `features.${bi}`, loc, ""))
                    .filter(Boolean);
                  chips = [0, 1, 2, 3, 4]
                    .filter((ci) => vis.chipsVisible[ci])
                    .map((ci) => cms.text(childSectionKey, `chips.${ci}`, loc, ""))
                    .filter(Boolean);
                  links = vis.linksVisible
                    .map((visible, idx) => {
                      if (!visible) return null;
                      const n = idx + 1;
                      const r = resolveHref(cms.text(childSectionKey, `link_${n}_href`, loc, ""), shortIdMap);
                      if (!r.valid) return null;
                      return {
                        n,
                        label: cms.text(childSectionKey, `link_${n}_label`, loc, "") || learnMoreFallback(loc),
                        href: r.href,
                      };
                    })
                    .filter((l): l is { n: number; label: string; href: string } => l !== null);
                }
                return (
                  <motion.div
                    key={fieldBase || anf.label || i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.04 }}
                    className="flex gap-4"
                    data-cms-page={childSectionKey ? cardDataPage : undefined}
                    data-cms-section={cardDataSection}
                    data-cms-card={fieldBase || undefined}
                  >
                    <span
                      data-cms-field={
                        childSectionKey
                          ? (iconImageUrl ? "icon_image" : "icon")
                          : (fieldBase ? `${fieldBase}.icon` : undefined)
                      }
                    >
                      {iconImageUrl ? (
                        <img
                          src={iconImageUrl}
                          alt={iconImageAlt}
                          className="w-5 h-5 shrink-0 mt-0.5 object-contain"
                          loading="lazy"
                        />
                      ) : Icon ? (
                        <Icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                      ) : null}
                    </span>
                    <div>
                      <div
                        className="text-sm font-medium text-foreground mb-1"
                        data-cms-field={childSectionKey ? "title" : (fieldBase ? `${fieldBase}.label` : undefined)}
                      >
                        {anf.label}
                      </div>
                      <div
                        className="text-sm text-muted-foreground"
                        data-cms-field={childSectionKey ? "description" : (fieldBase ? `${fieldBase}.text` : undefined)}
                      >
                        {anf.text}
                      </div>
                      {bullets.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary" data-cms-field="bullets">
                          {bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                        </ul>
                      )}
                      {chips.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5" data-cms-field="chips">
                          {chips.map((c, ci) => (
                            <li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>
                          ))}
                        </ul>
                      )}
                      {links.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1" data-cms-field="links">
                          {links.map((l) => (
                            <a key={l.n} href={l.href} className="text-sm text-primary hover:underline self-start">{l.label} →</a>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
      </div>
    </section>
  );

  // DB-first für die Blöcke `leistungen` und `systembausteine`:
  // Label/Überschrift/Einleitung kommen aus CMS-Light, die bisherigen
  // i18n-Texte bleiben nur Rückfall. `intro` ist der geführte Feldname,
  // `text` wird als Altbestand mitgelesen.
  const leistungenLabel = cms.text("leistungen", "label", loc, t("shared.labels.leistungen"));
  const leistungenTitle = cms.text("leistungen", "title", loc, t("shared.sections.systemleistungen"));
  const leistungenIntro =
    cms.text("leistungen", "intro", loc, "") || cms.text("leistungen", "text", loc, "");

  const systembausteineLabel = cms.text("systembausteine", "label", loc, "");
  const systembausteineTitle = cms.text("systembausteine", "title", loc, t("shared.sections.systembausteine"));
  const systembausteineIntro =
    cms.text("systembausteine", "intro", loc, "") ||
    cms.text("systembausteine", "text", loc, t("shared.subtitles.systembausteine"));

  const renderLeistungen = () => (

      <section
        className="py-16 lg:py-24 bg-secondary"
        data-cms-page={pageKey}
        data-cms-section="leistungen"
      >
        <div className="container mx-auto">
          {leistungenLabel ? (
            <span className="text-xs text-muted-foreground tracking-wide uppercase mb-2 block" data-cms-field="label">{leistungenLabel}</span>
          ) : null}
          <h2 className="text-xl md:text-2xl font-heading font-normal text-foreground mb-2" data-cms-field="title">{leistungenTitle}</h2>
          {leistungenIntro ? (
            <p className="text-sm text-muted-foreground mb-8" data-cms-field="intro">{leistungenIntro}</p>
          ) : (
            <div className="mb-6" />
          )}
          <div className="grid md:grid-cols-3 gap-8">
            {renderedLeistungen.map((l) => (
              <div key={l.title}>
                <h3 className="text-sm font-medium text-foreground mb-3">{l.title}</h3>
                <ul className="space-y-2">
                  {l.items.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
  );

  const renderSystembausteine = () =>
    renderedSystembausteine && renderedSystembausteine.length > 0 ? (
      <section className="py-16 lg:py-24 bg-background">

        <div className="container mx-auto">
          {systembausteineLabel ? (
            <span className="text-xs text-muted-foreground tracking-wide uppercase mb-2 block" data-cms-field="label">{systembausteineLabel}</span>
          ) : null}
          <h2 className="text-xl md:text-2xl font-heading font-normal text-foreground mb-2" data-cms-field="title">{systembausteineTitle}</h2>
          {systembausteineIntro ? (
            <p className="text-sm text-muted-foreground mb-8" data-cms-field="intro">{systembausteineIntro}</p>
          ) : null}

          <div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
            data-cms-page={pageKey}
            data-cms-section="systembausteine"
          >
            {renderedSystembausteine.map((sb, i) => {
              const fieldBase = sb.cmsKey;
              return (
                <motion.div
                  key={fieldBase || sb.title || i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-card border border-border rounded-lg p-5 shadow-card"
                  data-cms-card={fieldBase || undefined}
                >
                  <span
                    className="text-[11px] text-muted-foreground uppercase tracking-wide"
                    data-cms-field={fieldBase ? `${fieldBase}.label` : undefined}
                  >
                    {sb.label}
                  </span>
                  <h4
                    className="text-sm font-medium text-foreground mt-1 mb-1"
                    data-cms-field={fieldBase ? `${fieldBase}.title` : undefined}
                  >
                    {sb.title}
                  </h4>
                  <p
                    className="text-xs text-muted-foreground leading-relaxed"
                    data-cms-field={fieldBase ? `${fieldBase}.description` : undefined}
                  >
                    {sb.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    ) : null;

  const renderBroschure = () =>
    broschure ? (
      <section
        className="py-16 lg:py-24 bg-background"
        data-cms-page={pageKey}
        data-cms-section="broschure"
      >
        <div className="container mx-auto space-y-4">
          {broschure.title ? (
            <h2 className="text-2xl lg:text-3xl font-light text-foreground" data-cms-field="title">
              {broschure.title}
            </h2>
          ) : null}
          {broschure.text ? (
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed" data-cms-field="intro">
              {broschure.text}
            </p>
          ) : null}

          {broschure.href && broschure.label ? (
            <a
              href={broschure.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors"
              data-cms-field="label"
            >
              <BookOpen className="w-4 h-4" />
              {broschure.label}
            </a>
          ) : null}
        </div>
      </section>
    ) : null;


  const renderInline = (key: string) => {
    switch (key) {
      case "content":
        return renderDescription();
      case "anforderungen":
        return anforderungenActive ? renderAnforderungen() : null;
      case "leistungen":
        return leistungenActive ? renderLeistungen() : null;
      case "systembausteine":
        return systembausteineActive ? renderSystembausteine() : null;
      case "broschure":
        return broschureActive ? renderBroschure() : null;
      default:
        return null;
    }
  };

  return (
  <PageLayout
    label={contentLabel}
    headline={contentHeadline}
    subheader={contentSubheadline || undefined}
    intro={contentIntro}
    heroImage={heroImage}
    heroAlt={heroAlt}
    heroImageDesktop={heroSet.desktop ?? undefined}
    heroImageTablet={heroSet.tablet ?? undefined}
    heroImageMobile={heroSet.mobile ?? undefined}
    pageKey={pageKey}
    fullWidth
  >
    {/* Ein Renderpfad, eine Reihenfolge: strikt `sort_order` aus dem CMS.
        Sonderblöcke behalten ihr Layout, stehen aber an ihrer DB-Position. */}
    {!orderedTopLevel.includes("content") && contentDescription ? renderDescription() : null}
    {orderedTopLevel.map((key) => (

      <Fragment key={key}>
        {INLINE_KEYS.includes(key)
          ? renderInline(key)
          : pageKey
            ? renderPageSectionByType({
                pageKey,
                sectionKey: key,
                sectionType: sectionTypeByKey.get(key) ?? "",
                cms,
                locale: loc,
              })
            : null}
      </Fragment>
    ))}


        <SiblingNav pageKey={pageKey} />

    </PageLayout>
  );
};

export default AnwendungDetailPage;
