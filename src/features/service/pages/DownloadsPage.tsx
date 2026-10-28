import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, HelpCircle, ShoppingCart, Wrench, GraduationCap, Award, Users, Download, Settings, ClipboardList, Monitor, Phone, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import DownloadCenter from "@/features/service/downloadCenter/DownloadCenter";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { listCardItems, txCardItem } from "@/features/service/shared/cmsCardHelpers";
import { isCardItemIconVisible } from "@/features/service/shared/cmsCardHelpers";
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";

const QUICK_LINK_KEYS = ["downloads", "faq", "ersatzteile", "support"] as const;
const QUICK_LINK_META: Record<string, {
  icon: typeof Download;
  iconName: string;
  href: string;
  external?: boolean;
  internal?: boolean;
}> = {
  downloads: { icon: Download, iconName: "download", href: "#dokumente" },
  faq: { icon: HelpCircle, iconName: "help-circle", href: "#faq" },
  ersatzteile: { icon: ShoppingCart, iconName: "shopping-cart", href: "https://tcs24.com/", external: true },
  support: { icon: Phone, iconName: "phone", href: "/kontakt", internal: true },
};
const QUICK_LINK_DEFAULT: { icon: typeof Download; iconName: string; href: string; external?: boolean; internal?: boolean } = { icon: FileText, iconName: "file-text", href: "#" };

const FAQ_CATEGORY_KEYS = ["alle", "allgemein", "produkte", "installation", "video", "zutritt", "snipdoo", "service"] as const;

const FAQ_ITEM_KEYS = [
  "i01","i02","i03","i04","i05","i06","i07","i08","i09","i10",
  "i11","i12","i13","i14","i15","i16","i17","i18","i19","i20",
  "i21","i22","i23",
] as const;

const ORDER_KEYS = ["ersatzteile", "beschriftung", "freischaltcodes"] as const;
const ORDER_META: Record<string, { icon: typeof ShoppingCart; iconName: string; href: string }> = {
  ersatzteile: { icon: ShoppingCart, iconName: "shopping-cart", href: "https://tcs24.com/" },
  beschriftung: { icon: FileText, iconName: "file-text", href: "#" },
  freischaltcodes: { icon: Settings, iconName: "settings", href: "#" },
};

const ACADEMY_KEYS = ["produktschulungen", "webinare", "zertifizierung", "vorOrt", "partner"] as const;
const ACADEMY_ICONS: Record<string, { icon: typeof Wrench; iconName: string }> = {
  produktschulungen: { icon: Wrench, iconName: "wrench" },
  webinare: { icon: Monitor, iconName: "monitor" },
  zertifizierung: { icon: Award, iconName: "award" },
  vorOrt: { icon: Users, iconName: "users" },
  partner: { icon: GraduationCap, iconName: "graduation-cap" },
};

const GLOSSARY_GROUPS: Record<string, readonly string[]> = {
  A: ["automatischeWahl", "aktoren", "automatischeTueroeffnung"],
  B: ["bussystem", "busspannung"],
  D: ["datenprotokoll", "dinSchiene", "tuerruf"],
  F: ["etagenruf", "vollduplex"],
  S: ["schaltplan", "seriennummer", "kurzschlussschutz"],
  T: ["transformator"],
  W: ["verdrahtungsplan", "winClip"],
};

const Downloads = () => {
  const { t, cms, loc, i18n } = useCmsI18n("service.downloads", "service", "seiten.downloads");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const base = "seiten.downloads";
  const [activeFaqCat, setActiveFaqCat] = useState<(typeof FAQ_CATEGORY_KEYS)[number]>("alle");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqCategory = (key: string) =>
    cms.text("faq", `items.${key}.category`, loc, t(`${base}.faq.items.${key}.category`));

  const filteredFaqKeys = activeFaqCat === "alle"
    ? FAQ_ITEM_KEYS
    : FAQ_ITEM_KEYS.filter((key) => faqCategory(key) === activeFaqCat);

  // Tranche 7c: DB-first Kartenlisten, Legacy-Felder bleiben Fallback.
  const quickLinkKeys = listCardItems(cms, "quickLinks", QUICK_LINK_KEYS);
  // Batch 16: Section-Gate — `quickLinks` Block respektiert nun is_active.
  const quickLinksActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "quickLinks");
  /**
   * Spiegel-Regel: Alle redaktionellen Blöcke der Seitenhülle sind über
   * CMS-Light sichtbar/unsichtbar schaltbar. Solange CMS-Light noch keine
   * Sections liefert (leerer Zustand), bleibt alles sichtbar (i18n-Fallback).
   */
  const topKeys = cms.sections.filter(s => !s.parent_section_key).map(s => s.section_key);
  const sectionActive = (key: string) => topKeys.length === 0 || topKeys.includes(key);
  const rmaKeys = listCardItems(cms, "rma", ["rma", "garantie", "support"]);
  const orderKeys = listCardItems(cms, "bestellung", ORDER_KEYS);
  const academyKeys = listCardItems(cms, "akademie", ACADEMY_KEYS);



  /**
   * Punkt A — Bedienbeschriftungen des Download-Centers kommen aus CMS-Light
   * (Section `dokumente`), mit den bisherigen Texten als Fallback. Es werden
   * ausschließlich UI-Texte gepflegt — keine Zielgruppen, Bereiche,
   * Filterwerte oder Dateien.
   */
  const DC_LABEL_KEYS = [
    "label_bereich",
    "label_produktkategorie",
    "label_familie_serie",
    "label_system",
    "label_asset_typ",
    "label_dokument_quellentyp",
    "label_sprache",
    "label_verfuegbarkeit",
    "label_alle",
    "label_suche",
    "label_filter",
    "label_filter_zuruecksetzen",
    "label_weitere_filter",
    "label_zugeordnete_artikel",
    "label_zielgruppen",
    "label_unterlagentypen",
    "label_uebersicht",
    "label_kapitel",

    "label_eintrag",
    "label_eintraege",
    "btn_download",
    "btn_open",
    "btn_view",
    "btn_new_tab",
    "btn_close_preview",
    "preview_unavailable_hint",
    "badge_external_link",
    "empty_hint",
    "choose_audience_hint",
    "error_hint",
  ] as const;
  const downloadCenterLabels = Object.fromEntries(
    DC_LABEL_KEYS.map((key) => [
      key,
      cms.text(
        "dokumente",
        key,
        loc,
        t(`${base}.dokumente.${key}`, { defaultValue: "" }) as string,
      ),
    ]),
  );

  return (
    <CmsPageLayout pageKey="service.downloads"
      label={cms.text("hero", "label", loc, t(`${base}.hero.label`))}
      headline={cms.text("hero", "headline", loc, t(`${base}.hero.headline`))}
      intro={cms.text("hero", "intro", loc, t(`${base}.hero.intro`))}
      heroImage={cms.asset("hero", "image", "")}
      showHeroImage={false}
      fullWidth
    >

      {/* Download-Center — echtes Herzstück der Seite, steht daher vor allen
          redaktionellen Zusatzblöcken. Fachliche Daten kommen read-only aus der
          Download-Contract-Datenbank (api_v1_download_center_structure_contract,
          api_v1_download_center_public_contract,
          api_v1_download_center_facets_v2). CMS-Light steuert nur Überschrift,
          Einleitung, Bedienbeschriftungen und Sichtbarkeit. */}
      {sectionActive("dokumente") && (
      <section id="dokumente" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-4">{cms.text("dokumente", "headline", loc, t(`${base}.dokumente.headline`))}</h2>
          <p className="text-muted-foreground mb-8 max-w-3xl">{cms.text("dokumente", "intro", loc, t(`${base}.dokumente.intro`))}</p>
          {/* Optionale CMS-Light-Vorgabe der Start-Zielgruppe. Ohne Wert
              startet das Modul ohne fachliche Vorauswahl. */}
          <DownloadCenter
            defaultAudienceSlug={cms.text("dokumente", "default_audience_slug", loc, "")}
            labels={downloadCenterLabels}
          />

        </div>
      </section>
      )}

      {/* Quick Links — bewusst NACH dem Download-Center */}
      {quickLinksActive && (
      <section className="py-16 bg-section-muted">
        <div className="container mx-auto px-4">
          <div className={cardGridClass("useCases", "")}>
            {quickLinkKeys.map((key, i) => {
              const meta = QUICK_LINK_META[key] ?? QUICK_LINK_DEFAULT;
              const cmsHref = cms.text("quickLinks", `items.${key}.href`, loc, "").trim();
              const href = cmsHref || meta.href;
              const labelFallback = t(`${base}.quickLinks.${key}.label`, { defaultValue: key });
              const descFallback = t(`${base}.quickLinks.${key}.desc`, { defaultValue: "" });
              const __iv = isCardItemIconVisible(cms, loc, "quickLinks", key);
              const Icon = __iv.name ? (__iv.visible ? resolveIcon(__iv.name, meta.icon) : null) : meta.icon;
              const label = txCardItem(cms, loc, "quickLinks", key, "title", labelFallback, "label", false);
              const desc = txCardItem(cms, loc, "quickLinks", key, "description", descFallback, "desc", false);
              const itemCls = cardGridItemClass("useCases", quickLinkKeys.length, i);
              const content = (
                <Card key={key} className="hover:shadow-lg transition-shadow cursor-pointer h-full" data-cms-page="service.downloads" data-cms-section="quickLinks" data-cms-field={`${key}.icon`}>
                  <CardContent className="p-6 flex flex-col items-start gap-3">
                    {Icon && <Icon className="w-8 h-8 text-primary" />}
                    <h3 className="text-lg font-semibold text-foreground">{label}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              );
              if (meta.external) {
                return <a key={key} className={itemCls} href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
              }
              if (meta.internal) {
                return <Link key={key} className={itemCls} to={href}>{content}</Link>;
              }
              return <a key={key} className={itemCls} href={href}>{content}</a>;
            })}
          </div>
        </div>
      </section>
      )}




      {/* FAQ — DB-first mit i18n-Fallback, über CMS-Light abschaltbar */}
      {sectionActive("faq") && (
      <section id="faq" className="py-20 bg-section-muted">

        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {cms.text("faq", "headline", loc, t(`${base}.faq.headline`))}
          </h2>
          <p className="text-muted-foreground mb-8">
            {cms.text("faq", "intro", loc, t(`${base}.faq.intro`))}
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {FAQ_CATEGORY_KEYS.map((key) => (
              <Button
                key={key}
                variant={activeFaqCat === key ? "default" : "outline"}
                size="sm"
                onClick={() => { setActiveFaqCat(key); setOpenFaq(null); }}
              >
                {cms.text("faq", `categories.${key}`, loc, t(`${base}.faq.categories.${key}`))}
              </Button>
            ))}
          </div>

          <div className="space-y-2 max-w-4xl">
            {filteredFaqKeys.map((key, i) => {
              const q = cms.text("faq", `items.${key}.q`, loc, t(`${base}.faq.items.${key}.q`));
              const a = cms.text("faq", `items.${key}.a`, loc, t(`${base}.faq.items.${key}.a`));
              return (
                <div key={key} className="border border-border rounded-lg bg-background">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-foreground">{q}</span>
                    <span className="text-muted-foreground ml-4">{openFaq === i ? "−" : "+"}</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4 text-sm text-muted-foreground">{a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}



      {/* RMA & Garantie */}
      {sectionActive("rma") && (
      <section className="py-20">

        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-4">{cms.text("rma", "headline", loc, t(`${base}.rma.headline`))}</h2>
          <p className="text-muted-foreground mb-8">{cms.text("rma", "intro", loc, t(`${base}.rma.intro`))}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {rmaKeys.map((key) => {
              const titleFb = t(`${base}.rma.items.${key}.title`, { defaultValue: key });
              const textFb = t(`${base}.rma.items.${key}.text`, { defaultValue: "" });
              const buttonFb = t(`${base}.rma.items.${key}.button`, { defaultValue: "" });
              const iconFb = key === "rma" ? "clipboard-list" : key === "garantie" ? "settings" : "phone";
              const IconCmp = key === "rma" ? ClipboardList : key === "garantie" ? Settings : Phone;
              const __iv_rma = isCardItemIconVisible(cms, loc, "rma", key);
              const Icon = __iv_rma.name ? (__iv_rma.visible ? resolveIcon(__iv_rma.name, IconCmp) : null) : IconCmp;
              const title = txCardItem(cms, loc, "rma", key, "title", titleFb);
              const text = txCardItem(cms, loc, "rma", key, "description", textFb, "text");
              const button = txCardItem(cms, loc, "rma", key, "cta_label", buttonFb, "button");
              return (
                <Card key={key} data-cms-page="service.downloads" data-cms-section={`rma_item_${key}`} data-cms-field="icon">
                  <CardContent className="p-6">
                    {Icon && <Icon className="w-8 h-8 text-primary mb-3" />}
                    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{text}</p>
                    {key === "garantie" && button && (
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://garantie.tcsapps.de/" target="_blank" rel="noopener noreferrer">
                          {button} <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}
                    {key === "support" && button && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/kontakt">{button}</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      )}


      {/* Bestellung */}
      {sectionActive("bestellung") && (
      <section className="py-20 bg-section-muted">

        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-4">{cms.text("bestellung", "headline", loc, t(`${base}.bestellung.headline`))}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {orderKeys.map((key) => {
              const meta = ORDER_META[key] ?? { icon: FileText, iconName: "file-text", href: "#" };
              const labelFb = t(`${base}.bestellung.items.${key}.label`, { defaultValue: key });
              const descFb = t(`${base}.bestellung.items.${key}.desc`, { defaultValue: "" });
              const __iv_bestellung = isCardItemIconVisible(cms, loc, "bestellung", key);
              const Icon = __iv_bestellung.name ? (__iv_bestellung.visible ? resolveIcon(__iv_bestellung.name, meta.icon) : null) : meta.icon;
              const label = txCardItem(cms, loc, "bestellung", key, "title", labelFb, "label");
              const desc = txCardItem(cms, loc, "bestellung", key, "description", descFb, "desc");
              return (
                <Card key={key} className="hover:shadow-lg transition-shadow" data-cms-page="service.downloads" data-cms-section={`bestellung_item_${key}`} data-cms-field="icon">
                  <CardContent className="p-6">
                    {Icon && <Icon className="w-8 h-8 text-primary mb-3" />}
                    <h3 className="font-semibold text-foreground mb-2">{label}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      )}


      {/* Akademie */}
      {sectionActive("akademie") && (
      <section className="py-20">

        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-4">{cms.text("akademie", "headline", loc, t(`${base}.akademie.headline`))}</h2>
          <p className="text-muted-foreground mb-8">{cms.text("akademie", "intro", loc, t(`${base}.akademie.intro`))}</p>
          <div className={cardGridClass("useCases", "")}>
            {academyKeys.map((key, i) => {
              const meta = ACADEMY_ICONS[key] ?? { icon: GraduationCap, iconName: "graduation-cap" };
              const labelFb = t(`${base}.akademie.items.${key}.label`, { defaultValue: key });
              const descFb = t(`${base}.akademie.items.${key}.desc`, { defaultValue: "" });
              const __iv_akademie = isCardItemIconVisible(cms, loc, "akademie", key);
              const Icon = __iv_akademie.name ? (__iv_akademie.visible ? resolveIcon(__iv_akademie.name, meta.icon) : null) : meta.icon;
              const label = txCardItem(cms, loc, "akademie", key, "title", labelFb, "label");
              const desc = txCardItem(cms, loc, "akademie", key, "description", descFb, "desc");
              const itemCls = cardGridItemClass("useCases", academyKeys.length, i);
              return (
                <Card key={key} className={itemCls} data-cms-page="service.downloads" data-cms-section={`akademie_item_${key}`} data-cms-field="icon">
                  <CardContent className="p-6">
                    {Icon && <Icon className="w-8 h-8 text-primary mb-3" />}
                    <h3 className="font-semibold text-foreground mb-2">{label}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      )}


      {/* Glossar */}
      {sectionActive("glossar") && (
      <section id="glossar" className="py-20 bg-section-muted">

        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-4">{cms.text("glossar", "headline", loc, t(`${base}.glossar.headline`))}</h2>
          <p className="text-muted-foreground mb-8">{cms.text("glossar", "intro", loc, t(`${base}.glossar.intro`))}</p>
          <div className="space-y-8 max-w-4xl">
            {Object.entries(GLOSSARY_GROUPS).map(([letter, termKeys]) => (
              <div key={letter}>
                <h3 className="text-xl font-bold text-primary mb-3">{t(`${base}.glossar.groups.${letter}.letter`)}</h3>
                <div className="space-y-3">
                  {termKeys.map((termKey) => (
                    <div key={termKey} className="border-l-2 border-primary/30 pl-4">
                      <dt className="font-medium text-foreground text-sm">{t(`${base}.glossar.groups.${letter}.items.${termKey}.term`)}</dt>
                      <dd className="text-sm text-muted-foreground">{t(`${base}.glossar.groups.${letter}.items.${termKey}.def`)}</dd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}


      {/* Ansprechpartner */}
      {sectionActive("ansprechpartner") && (
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground mb-2">{cms.text("ansprechpartner", "lead", loc, t(`${base}.ansprechpartner.lead`))}</p>
          <p className="text-sm text-muted-foreground mb-1">{cms.text("ansprechpartner", "name", loc, t(`${base}.ansprechpartner.name`))}</p>
          <p className="text-xs text-muted-foreground mb-6">{cms.text("ansprechpartner", "experience", loc, t(`${base}.ansprechpartner.experience`))}</p>
          <Button asChild>
            <Link to="/kontakt">{cms.text("ansprechpartner", "button", loc, t(`${base}.ansprechpartner.button`))}</Link>
          </Button>
        </div>
      </section>
      )}


    <CmsSourceBadge
      pageKey="service.downloads"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
</CmsPageLayout>
  );
};

export default Downloads;
