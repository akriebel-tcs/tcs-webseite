import { Fragment } from "react";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import { GraduationCap, Monitor, Award, MapPin, Users, BookOpen } from "lucide-react";

import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { listChildItems, txChildField } from "@/features/cms/utils/cmsItemHelpers";
import { resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";
import { learnMoreFallback } from "@/i18n/uiFallbacks";



const FALLBACK_FORMAT_KEYS = ["produktschulungen", "webinare", "zertifizierung", "vorOrt"] as const;
const FORMAT_ICONS: Record<string, typeof GraduationCap> = {
  produktschulungen: GraduationCap,
  webinare: Monitor,
  zertifizierung: Award,
  vorOrt: MapPin,
};

const FALLBACK_ZIELGRUPPEN_KEYS = ["elektro", "fachplaner", "facility", "fachhandel"] as const;
const ZIELGRUPPEN_ICONS: Record<string, typeof Users> = {
  elektro: Users,
  fachplaner: BookOpen,
  facility: Users,
  fachhandel: Users,
};

const FALLBACK_PARTNER_KEYS = ["silber", "gold", "platin"] as const;


const Akademie = () => {
  const { t, cms, loc } = useCmsI18n("wissen.akademie", "wissen", "seiten.akademie");
  const shortIdMap = useShortIdResolver();
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const base = "seiten.akademie";

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

  // Sonderlayouts dieser Seite behalten ihr Aussehen, werden aber wie alle
  // anderen Blöcke über den DB-Loop (`sort_order`) eingehängt.
  const renderFormate = () => (
      <section className="py-16 md:py-24" data-cms-section="formate">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t(`${base}.formate.headline`)}
          </h2>
          <p className="text-muted-foreground mb-12 max-w-2xl">
            {t(`${base}.formate.intro`)}
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {listChildItems(cms, "formate", "card_v1", FALLBACK_FORMAT_KEYS).map((key) => {
              const Icon = FORMAT_ICONS[key] ?? GraduationCap;
              const title = txChildField(cms, loc, "formate", key, "title", t(`${base}.formate.items.${key}.title`, { defaultValue: key }));
              const desc = txChildField(cms, loc, "formate", key, "description", t(`${base}.formate.items.${key}.desc`, { defaultValue: "" }));
              const extras = buildCardExtras(`formate_item_${key}`, "formate");
              return (
                <div key={key} className="bg-secondary p-8 border border-border" data-cms-page="wissen.akademie" data-cms-section={`formate_item_${key}`}>
                  {Icon && <Icon className="w-8 h-8 text-foreground mb-4" />}
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-cms-field="title">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed" data-cms-field="description">{desc}</p>
                  {extras.bullets.length > 0 && (<ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary" data-cms-field="bullets">{extras.bullets.map((b, bi) => <li key={bi}>{b}</li>)}</ul>)}
                  {extras.chips.length > 0 && (<ul className="mt-3 flex flex-wrap gap-1.5" data-cms-field="chips">{extras.chips.map((c, ci) => (<li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>))}</ul>)}
                  {extras.links.length > 0 && (<div className="mt-3 flex flex-col gap-1" data-cms-field="links">{extras.links.map((l) => (<a key={l.n} href={l.href} className="text-sm text-primary hover:underline self-start">{l.label} →</a>))}</div>)}
                </div>
              );
            })}
          </div>
        </div>
      </section>
  );

  const renderZielgruppen = () => (
      <section className="bg-section-muted py-16 md:py-24" data-cms-section="zielgruppen">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t(`${base}.zielgruppen.headline`)}
          </h2>
          <p className="text-muted-foreground mb-12 max-w-2xl">
            {t(`${base}.zielgruppen.intro`)}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {listChildItems(cms, "zielgruppen", "card_v1", FALLBACK_ZIELGRUPPEN_KEYS).map((key) => {
              const Icon = ZIELGRUPPEN_ICONS[key] ?? Users;
              const title = txChildField(cms, loc, "zielgruppen", key, "title", t(`${base}.zielgruppen.items.${key}.title`, { defaultValue: key }));
              const desc = txChildField(cms, loc, "zielgruppen", key, "description", t(`${base}.zielgruppen.items.${key}.desc`, { defaultValue: "" }));
              const extras = buildCardExtras(`zielgruppen_item_${key}`, "zielgruppen");
              return (
                <div key={key} className="bg-background p-6 border border-border" data-cms-section={`zielgruppen_item_${key}`}>
                  {Icon && <Icon className="w-6 h-6 text-foreground mb-3" />}
                  <h3 className="text-sm font-semibold text-foreground mb-1" data-cms-field="title">{title}</h3>
                  <p className="text-xs text-muted-foreground" data-cms-field="description">{desc}</p>
                  {extras.bullets.length > 0 && (<ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc pl-4 marker:text-primary" data-cms-field="bullets">{extras.bullets.map((b, bi) => <li key={bi}>{b}</li>)}</ul>)}
                  {extras.chips.length > 0 && (<ul className="mt-2 flex flex-wrap gap-1" data-cms-field="chips">{extras.chips.map((c, ci) => (<li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">{c}</li>))}</ul>)}
                  {extras.links.length > 0 && (<div className="mt-2 flex flex-col gap-1" data-cms-field="links">{extras.links.map((l) => (<a key={l.n} href={l.href} className="text-xs text-primary hover:underline self-start">{l.label} →</a>))}</div>)}
                </div>
              );
            })}
          </div>
        </div>
      </section>
  );

  const renderPartner = () => (
      <section className="py-16 md:py-24" data-cms-section="partner">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t(`${base}.partner.headline`)}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            {t(`${base}.partner.intro`)}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {listChildItems(cms, "partner", "card_v1", FALLBACK_PARTNER_KEYS).map((key) => {
              const title = txChildField(cms, loc, "partner", key, "title", t(`${base}.partner.items.${key}.title`, { defaultValue: key }));
              const desc = txChildField(cms, loc, "partner", key, "description", t(`${base}.partner.items.${key}.desc`, { defaultValue: "" }));
              const extras = buildCardExtras(`partner_item_${key}`, "partner");
              return (
                <div key={key} className="border border-border p-6" data-cms-section={`partner_item_${key}`}>
                  <h3 className="font-semibold text-foreground mb-2" data-cms-field="title">{title}</h3>
                  <p className="text-sm text-muted-foreground" data-cms-field="description">{desc}</p>
                  {extras.bullets.length > 0 && (<ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary" data-cms-field="bullets">{extras.bullets.map((b, bi) => <li key={bi}>{b}</li>)}</ul>)}
                  {extras.chips.length > 0 && (<ul className="mt-3 flex flex-wrap gap-1.5" data-cms-field="chips">{extras.chips.map((c, ci) => (<li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>))}</ul>)}
                  {extras.links.length > 0 && (<div className="mt-3 flex flex-col gap-1" data-cms-field="links">{extras.links.map((l) => (<a key={l.n} href={l.href} className="text-sm text-primary hover:underline self-start">{l.label} →</a>))}</div>)}
                </div>
              );
            })}
          </div>
        </div>
      </section>
  );

  // CTA-Block: Texte DB-first (i18n nur als Fallback) und Hintergrund über
  // den globalen Schalter `section_bg`:
  //   "default"/leer      = Standard (weiss)
  //   "muted"/"secondary" = grauer Abschnitt
  //   "dark"/"foreground" = dunkler Abschnitt
  // Der Button bleibt erhalten, weil `content_v1` kein CTA-Element kennt.
  const renderCta = () => {
    const headline = cms.text("cta", "headline", loc, "") || t(`${base}.cta.headline`);
    const text = cms.text("cta", "text", loc, "") || t(`${base}.cta.text`);
    const button = cms.text("cta", "button", loc, "") || t(`${base}.cta.button`);
    const href = cms.text("cta", "cta_href", "de", "") || "/kontakt";
    const bg = cms.text("cta", "section_bg", "de", "").trim().toLowerCase();
    const muted = bg === "muted" || bg === "secondary";
    const dark = bg === "dark" || bg === "foreground";

    const sectionClass = dark
      ? "bg-foreground text-background py-16"
      : muted
        ? "bg-section-muted text-foreground py-16"
        : "bg-background text-foreground py-16";

    return (
      <section className={sectionClass} data-cms-section="cta">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" data-cms-field="headline">
            {headline}
          </h2>
          <p
            className={`mb-8 max-w-lg mx-auto ${dark ? "text-background/70" : "text-muted-foreground"}`}
            data-cms-field="text"
          >
            {text}
          </p>
          <a
            href={href}
            className={
              dark
                ? "inline-block bg-background text-foreground px-8 py-3 text-sm font-medium hover:bg-background/90 transition-colors"
                : "inline-block bg-foreground text-background px-8 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            }
            data-cms-field="button"
          >
            {button}
          </a>
        </div>
      </section>
    );
  };


  const INLINE_RENDERERS: Record<string, () => JSX.Element> = {
    formate: renderFormate,
    zielgruppen: renderZielgruppen,
    partner: renderPartner,
    cta: renderCta,
  };

  // Eine Wahrheit: strikt `sort_order` aus der Datenbank. Hero rendert das
  // Layout, FAQ hängt am Seitenende. Blöcke ohne Sonderlayout laufen über
  // den zentralen Section-Renderer — neue Blöcke erscheinen damit ohne
  // Code-Änderung an ihrer CMS-Position.
  const orderedTopLevel = cms.sections
    .filter((s) => !s.parent_section_key)
    .filter((s) => s.section_key !== "hero" && s.section_type !== "hero_v1")
    .filter((s) => s.section_key !== "faq")
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  // Fallback: keine CMS-Sections geladen → bisherige Code-Reihenfolge.
  const fallbackOrder: Array<{ section_key: string; section_type: string | null }> =
    orderedTopLevel.length === 0
      ? [
          { section_key: "formate", section_type: "cards_v1" },
          { section_key: "zielgruppen", section_type: "cards_v1" },
          { section_key: "partner", section_type: "cards_v1" },
          { section_key: "cta", section_type: "content_v1" },
        ]
      : [];

  const bodySections = orderedTopLevel.length > 0 ? orderedTopLevel : fallbackOrder;

  return (
    <CmsPageLayout pageKey="wissen.akademie"
      label={t(`${base}.hero.label`)}
      headline={t(`${base}.hero.headline`)}
      intro={t(`${base}.hero.intro`)}
      heroImage={cms.asset("hero", "image", "")}
      fullWidth
    >
      {bodySections.map((sec) => {
        const inline = INLINE_RENDERERS[sec.section_key];
        return (
          <Fragment key={sec.section_key}>
            {inline
              ? inline()
              : renderPageSectionByType({
                  pageKey: "wissen.akademie",
                  sectionKey: sec.section_key,
                  sectionType: sec.section_type ?? "",
                  cms,
                  locale: loc,
                })}
          </Fragment>
        );
      })}

    <CmsTailFaq pageKey="wissen.akademie" />
    <CmsSourceBadge
      pageKey="wissen.akademie"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default Akademie;

