import { useEffect } from "react";
import SiblingNav from "@/components/SiblingNav";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Wrench, Ruler, Building2, Server, SquareCode, Cloud, Smartphone, Plug, ArrowRight } from "lucide-react";
import SubNavSticky from "@/components/SubNavSticky";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import RoleTabsBlock, { type RoleTab } from "@/components/RoleTabsBlock";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CARD_DIVIDER_CLASS, resolveCardDividers, useGlobalCardDividers } from "@/features/cms/lib/cardDividers";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { CmsRenderRegistryProvider } from "@/features/cms/components/CmsRenderRegistry";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import CmsTailCta from "@/features/cms/components/CmsTailCta";
import { resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { learnMoreFallback } from "@/i18n/uiFallbacks";


const subNavIds = [
  { id: "hero", key: "hero" },
  { id: "systemversprechen", key: "systemversprechen" },
  { id: "fuer-wen", key: "fuerWen" },
  { id: "nutzung-im-alltag", key: "nutzungAlltag" },
  { id: "systemaufbau", key: "systemaufbau" },
  { id: "inbetriebnahme", key: "inbetriebnahme" },
  { id: "anwendungen", key: "anwendungen" },
  { id: "rollen", key: "rollen" },
  { id: "kontakt", key: "kontakt" },
] as const;

const audienceKeys = [
  { key: "installateure", Icon: Wrench },
  { key: "planer", Icon: Ruler },
  { key: "betreiber", Icon: Building2 },
] as const;

const moduleKeys = [
  { key: "server", Icon: Server, link: undefined },
  { key: "software", Icon: SquareCode, link: undefined },
  { key: "cloud", Icon: Cloud, link: undefined },
  { key: "app", Icon: Smartphone, link: "/gebaeudekommunikation/mobile-tuerkommunikation" },
  { key: "integration", Icon: Plug, link: undefined },
] as const;

const stepKeys = ["struktur", "erkennung", "zuordnung"] as const;

const scaleKeys = [
  { key: "efh", fieldKey: "image_efh" },
  { key: "mfh", fieldKey: "image_mfh" },
  { key: "gewerbe", fieldKey: "image_gewerbe" },
] as const;

const roleKeys = ["bauherren", "architekten", "wohnungswirtschaft", "fachplaner", "handwerk"] as const;

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const SnipdooIp = () => {
  const { t, cms, loc, i18n } = useCmsI18n("gebaeudekommunikation.snipdoo-ip", "gebaeudekommunikation", "snipdooIp");
  const globalDividers = useGlobalCardDividers();
  const dividerFor = (sk: string) => resolveCardDividers(cms.text(sk, "card_dividers", "de", ""), globalDividers) ? CARD_DIVIDER_CLASS : "";
  const nutzungAlltagImage = cms.asset("nutzungAlltag", "image", "");
  const systemdiagrammImage = cms.asset("systemaufbau", "image", "");
  const inbetriebnahmeImage = cms.asset("inbetriebnahme", "image", "");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  // Audit-Buchhaltung (Batch 7c): Sections, die durch Handlayout/SubNav/SEO-Meta
  // bereits abgedeckt sind, das Coverage-Audit aber nicht automatisch erkennt.
  // `content` -> SEO-Meta via useEffect aus t("snipdooIp.seo.*").
  // `kontakt` -> SubNav-Anker `#kontakt` + globaler CTA/Kontakt-CTA am Seitenende.
  const handledSectionKeys = new Set<string>(["content", "kontakt"]);

  // Batch 18 / Welle 4 — Sichtbarkeits-Gates fuer alle Top-Level-Sections.
  // Spiegel-Regel: Admin-Schalter aus -> Section verschwindet auf der Public-Seite.
  const heroActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "hero");
  const seoActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "seo");
  const systemversprechenActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "systemversprechen");
  const audiencesActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "audiences");
  const subnavActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "subnav");
  const nutzungAlltagActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "nutzungAlltag");
  const systemaufbauActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "systemaufbau");
  const inbetriebnahmeActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "inbetriebnahme");
  const anwendungenActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "anwendungen");
  const rollenActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "rollen");
  const roleTabsActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "role_tabs");

  useEffect(() => {
    if (!seoActive) return;
    document.title = t("snipdooIp.seo.title");
    const desc = t("snipdooIp.seo.description");
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, [t, seoActive]);

  const subNavItems = subNavIds.map((s) => ({
    id: s.id,
    label: t(`snipdooIp.subnav.items.${s.key}`),
  }));

  // Rollen-Tabs DB-first (Section "role_tabs", Felder tabs.<key>.{label,headline,p1,p2})
  const roleTabs: RoleTab[] = roleKeys.map((key) => ({
    id: `rollen-${key}`,
    label: cms.text("role_tabs", `tabs.${key}.label`, loc, t(`snipdooIp.rollen.tabs.${key}.label`)),
    headline: cms.text("role_tabs", `tabs.${key}.headline`, loc, t(`snipdooIp.rollen.tabs.${key}.headline`)),
    paragraphs: [
      cms.text("role_tabs", `tabs.${key}.p1`, loc, t(`snipdooIp.rollen.tabs.${key}.p1`)),
      cms.text("role_tabs", `tabs.${key}.p2`, loc, t(`snipdooIp.rollen.tabs.${key}.p2`)),
    ],
  }));

  // Kopfzeile des Rollen-Blocks: Felder aus der Rollen-Tabs-Section
  // (B-1166 "role_tabs") haben Vorrang, damit im Admin gepflegte Texte
  // dort auch öffentlich erscheinen. Fällt sonst auf die alte Section
  // "rollen" bzw. i18n zurück (eine Wahrheit, kein Layout-Wechsel).
  const rollenEyebrow = cms.text("role_tabs", "eyebrow", loc, t("snipdooIp.rollen.eyebrow"));
  const rollenHeadline = cms.text("role_tabs", "headline", loc, t("snipdooIp.rollen.headline"));
  const rollenIntro = cms.text("role_tabs", "intro", loc, t("snipdooIp.rollen.intro"));

  return (
    <CmsRenderRegistryProvider>
      {/* Breadcrumb-Ersatzname DB-first aus Section "content" (Feld breadcrumbFallback). */}
      <AutoBreadcrumb
        fallbackLabel={cms.text("content", "breadcrumbFallback", loc, t("snipdooIp.breadcrumbFallback"))}
      />
      {subnavActive && <SubNavSticky items={subNavItems} />}

      {/* Hero */}
      {heroActive && (
      <section id="hero" className="bg-background">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="block text-xs tracking-wide mb-4 text-muted-foreground">{cms.text("hero", "eyebrow", loc, t("snipdooIp.hero.eyebrow"))}</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-normal leading-tight max-w-4xl mb-4 text-foreground">
              {cms.text("hero", "headline", loc, t("snipdooIp.hero.headline"))}
            </h1>
            <h2 className="text-lg md:text-xl font-heading font-normal text-muted-foreground max-w-3xl mb-8">
              {cms.text("hero", "subheadline", loc, t("snipdooIp.hero.subheadline"))}
            </h2>
            <div className="space-y-4 max-w-3xl text-muted-foreground leading-relaxed mb-10">
              <p>{cms.text("hero", "p1", loc, t("snipdooIp.hero.p1"))}</p>
              <p>{cms.text("hero", "p2", loc, t("snipdooIp.hero.p2"))}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a
                href="#kontakt"
                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background text-sm hover:opacity-90 transition-opacity"
              >
                {cms.text("hero", "primary", loc, t("snipdooIp.hero.primary"))} <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#systemaufbau"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm hover:bg-warm-dark transition-colors"
              >
                {cms.text("hero", "secondary", loc, t("snipdooIp.hero.secondary"))}
              </a>
            </div>
          </motion.div>
        </div>
        <img
          src={cms.asset("hero", "image", "")}
          alt={cms.text("hero", "imageAlt", loc, t("snipdooIp.hero.imageAlt"))}
          className="w-full h-[40vh] lg:h-[55vh] object-cover"
          data-cms-section="hero"
          data-cms-field="image"
        />
      </section>
      )}


      {/* Systemversprechen */}
      {systemversprechenActive && (
      <section id="systemversprechen" className="bg-section-muted py-16 lg:py-24">
        <div className="container mx-auto">
          <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
              {cms.text("systemversprechen", "eyebrow", loc, t("snipdooIp.systemversprechen.eyebrow"))}
            </span>
            <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-8">
              {cms.text("systemversprechen", "headline", loc, t("snipdooIp.systemversprechen.headline"))}
            </h2>
            <div className="space-y-5 text-muted-foreground leading-relaxed text-left md:text-center">
              <p>{cms.text("systemversprechen", "p1", loc, t("snipdooIp.systemversprechen.p1"))}</p>
              <p>{cms.text("systemversprechen", "p2", loc, t("snipdooIp.systemversprechen.p2"))}</p>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Für wen */}
      {audiencesActive && (
      <section id="fuer-wen" className="bg-background py-16 lg:py-24">
        <div className="container mx-auto">
          {/* Kopf DB-first nach Vertrag cards_v1: label / title / intro,
              Altfelder (headline) nur noch als Rückfall. */}
          {cms.text("audiences", "label", loc, "") && (
            <motion.span {...fadeIn} className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
              {cms.text("audiences", "label", loc, "")}
            </motion.span>
          )}
          <motion.h2 {...fadeIn} className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
            {cms.text("audiences", "title", loc, cms.text("audiences", "headline", loc, t("snipdooIp.audiences.headline")))}
          </motion.h2>
          {cms.text("audiences", "intro", loc, "") && (
            <motion.p {...fadeIn} className="text-muted-foreground leading-relaxed max-w-3xl mb-10">
              {cms.text("audiences", "intro", loc, "")}
            </motion.p>
          )}
          <div className="mb-2" />
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10" data-cms-section="audiences">
            {audienceKeys.map(({ key, Icon }) => {
              const childKey = `audiences.${key}`;
              // Karten (card_v1) pflegen `eyebrow`; `subtitle` bleibt Rückfall.
              const subtitle = cms.text(
                childKey,
                "eyebrow",
                loc,
                cms.text(childKey, "subtitle", loc, t(`snipdooIp.audiences.items.${key}.label`)),
              );
              const title = cms.text(childKey, "title", loc, t(`snipdooIp.audiences.items.${key}.title`));
              const text = cms.text(childKey, "description", loc, t(`snipdooIp.audiences.items.${key}.text`));

              return (
                <motion.div key={key} {...fadeIn} data-cms-section={childKey} className="border-t border-border pt-6">
                  <Icon className="h-8 w-8 text-foreground mb-5" aria-label={cms.text("audiences", `items.${key}.iconLabel`, loc, t(`snipdooIp.audiences.items.${key}.iconLabel`))} data-cms-field="icon" />
                  <span className="text-xs tracking-wide text-muted-foreground mb-2 block" data-cms-field="subtitle">{subtitle}</span>
                  <h3 className="text-lg md:text-xl font-heading font-normal text-foreground mb-3 leading-snug" data-cms-field="title">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm" data-cms-field="description">{text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* Nutzung im Alltag */}
      {nutzungAlltagActive && (
      <section id="nutzung-im-alltag" className="bg-section-muted py-16 lg:py-24">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div {...fadeIn}>
              <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
                {cms.text("nutzungAlltag", "label", loc, cms.text("nutzungAlltag", "eyebrow", loc, t("snipdooIp.nutzungAlltag.eyebrow")))}
              </span>
              <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
                {cms.text("nutzungAlltag", "title", loc, cms.text("nutzungAlltag", "headline", loc, t("snipdooIp.nutzungAlltag.headline")))}
              </h2>
              <h3 className="text-lg md:text-xl font-heading font-normal text-foreground mb-6">
                {cms.text("nutzungAlltag", "subheadline", loc, t("snipdooIp.nutzungAlltag.subheadline"))}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">{cms.text("nutzungAlltag", "text", loc, cms.text("nutzungAlltag", "p1", loc, t("snipdooIp.nutzungAlltag.p1")))}</p>
              <p className="text-muted-foreground leading-relaxed">{cms.text("nutzungAlltag", "p2", loc, t("snipdooIp.nutzungAlltag.p2"))}</p>

            </motion.div>
            <motion.div {...fadeIn} className="aspect-[3/2] overflow-hidden" data-cms-section="nutzungAlltag">
              <img
                src={nutzungAlltagImage}
                alt={cms.text("nutzungAlltag", "imageAlt", loc, t("snipdooIp.nutzungAlltag.imageAlt"))}
                className="w-full h-full object-cover"
                loading="lazy"
                data-cms-field="image"
              />
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {/* Systemaufbau */}
      {systemaufbauActive && (
      <section id="systemaufbau" className="bg-background py-16 lg:py-24">
        <div className="container mx-auto">
          <motion.div {...fadeIn} className="mb-12">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
              {cms.text("systemaufbau", "eyebrow", loc, t("snipdooIp.systemaufbau.eyebrow"))}
            </span>
            <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
              {cms.text("systemaufbau", "headline", loc, t("snipdooIp.systemaufbau.headline"))}
            </h2>
            <p className="text-muted-foreground">{cms.text("systemaufbau", "intro", loc, t("snipdooIp.systemaufbau.intro"))}</p>
          </motion.div>
          <motion.div {...fadeIn} className="mb-12 bg-background border border-border p-6 lg:p-10" data-cms-section="systemaufbau">
            <img
              src={systemdiagrammImage}
              alt={cms.text("systemaufbau", "diagramAlt", loc, t("snipdooIp.systemaufbau.diagramAlt"))}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[16/9] object-contain"
              data-cms-field="image"
            />
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moduleKeys.map(({ key, Icon, link }) => (
              <motion.div key={key} {...fadeIn} className="bg-background p-6 border border-border flex flex-col">
                <Icon className="h-8 w-8 text-foreground mb-5" aria-label={cms.text("systemaufbau", `modules.${key}.iconLabel`, loc, t(`snipdooIp.systemaufbau.modules.${key}.iconLabel`))} />
                <span className="text-xs tracking-wide text-muted-foreground mb-2">
                  {cms.text("systemaufbau", `modules.${key}.label`, loc, t(`snipdooIp.systemaufbau.modules.${key}.label`))}
                </span>
                <h3 className="text-lg font-heading font-normal text-foreground mb-3 leading-snug">
                  {cms.text("systemaufbau", `modules.${key}.title`, loc, t(`snipdooIp.systemaufbau.modules.${key}.title`))}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm flex-1">
                  {cms.text("systemaufbau", `modules.${key}.text`, loc, t(`snipdooIp.systemaufbau.modules.${key}.text`))}
                </p>
                {link && (
                  <div className={dividerFor("systemaufbau") || "mt-4"} data-cms-field="links">
                  <Link
                    to={link}
                    className="inline-flex items-center gap-2 text-sm text-foreground underline underline-offset-4 hover:no-underline"
                  >
                    {cms.text("systemaufbau", `modules.${key}.linkLabel`, loc, t(`snipdooIp.systemaufbau.modules.${key}.linkLabel`))} <ArrowRight className="w-4 h-4" />
                  </Link>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Inbetriebnahme */}
      {inbetriebnahmeActive && (
      <section id="inbetriebnahme" className="bg-section-muted py-16 lg:py-24">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="flex flex-col gap-12">
              <motion.div {...fadeIn}>
                <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  {cms.text("inbetriebnahme", "eyebrow", loc, t("snipdooIp.inbetriebnahme.eyebrow"))}
                </span>
                <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
                  {cms.text("inbetriebnahme", "headline", loc, t("snipdooIp.inbetriebnahme.headline"))}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{cms.text("inbetriebnahme", "intro", loc, t("snipdooIp.inbetriebnahme.intro"))}</p>
              </motion.div>
              <motion.ol {...fadeIn} className="space-y-8 list-none">
                {stepKeys.map((key, idx) => (
                  <li key={key} className="border-t border-border pt-6">
                    <h3 className="text-lg md:text-xl font-heading font-normal text-foreground mb-3 leading-snug">
                      {idx + 1}. {cms.text("inbetriebnahme", `steps.${key}.title`, loc, t(`snipdooIp.inbetriebnahme.steps.${key}.title`))}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {cms.text("inbetriebnahme", `steps.${key}.text`, loc, t(`snipdooIp.inbetriebnahme.steps.${key}.text`))}
                    </p>
                  </li>
                ))}
              </motion.ol>
              <motion.div {...fadeIn}>
                <p className="text-muted-foreground leading-relaxed">{cms.text("inbetriebnahme", "outro", loc, t("snipdooIp.inbetriebnahme.outro"))}</p>
              </motion.div>
            </div>
            <motion.div {...fadeIn} className="lg:sticky lg:top-32 aspect-[3/4] overflow-hidden" data-cms-section="inbetriebnahme">
              <img
                src={inbetriebnahmeImage}
                alt={cms.text("inbetriebnahme", "imageAlt", loc, t("snipdooIp.inbetriebnahme.imageAlt"))}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
                data-cms-field="image"
              />
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {/* Anwendungen */}
      {anwendungenActive && (
      <section id="anwendungen" className="bg-background py-16 lg:py-24">
        <div className="container mx-auto">
          <motion.div {...fadeIn} className="mb-12 max-w-3xl">
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
              {cms.text("anwendungen", "eyebrow", loc, "") ||
                cms.text("anwendungen", "label", loc, t("snipdooIp.anwendungen.eyebrow"))}
            </span>
            <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
              {cms.text("anwendungen", "headline", loc, "") ||
                cms.text("anwendungen", "title", loc, t("snipdooIp.anwendungen.headline"))}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{cms.text("anwendungen", "intro", loc, t("snipdooIp.anwendungen.intro"))}</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6" data-cms-section="anwendungen">
            {scaleKeys.map(({ key, fieldKey }) => {
              const childKey = `anwendungen.${key}`;
              const label = cms.text(childKey, "subtitle", loc, "") ||
                cms.text(childKey, "eyebrow", loc, t(`snipdooIp.anwendungen.items.${key}.label`));
              const title = cms.text(childKey, "title", loc, t(`snipdooIp.anwendungen.items.${key}.title`));
              const text = cms.text(childKey, "description", loc, t(`snipdooIp.anwendungen.items.${key}.text`));

              // Batch 44 — card_v1-Vertrag: Sonderpfad nutzt jetzt denselben
              // zentralen Resolver wie der Standardrenderer (CardsSectionV1).
              // Links/Bullets/Chips folgen exakt dem card_v1-Vertrag — keine
              // Parallel-Logik. Spiegel-Regel: aktiv + Ziel = sichtbar.
              const vis = resolveCardVisibility({
                valueFor: (fk, lc) => cms.text(childKey, fk, lc, "") || null,
                hasImage: true,
                hasThumbnail: false,
                hasIconImage: false,
                parentSectionType: "cards_v1",
                parentSectionKey: "anwendungen",
              });
              const bullets = [0, 1, 2, 3, 4]
                .filter((i) => vis.bulletsVisible[i])
                .map((i) => cms.text(childKey, `bullets.${i}`, loc, "") || cms.text(childKey, `features.${i}`, loc, ""))
                .filter(Boolean);
              const chips = [0, 1, 2, 3, 4]
                .filter((i) => vis.chipsVisible[i])
                .map((i) => cms.text(childKey, `chips.${i}`, loc, ""))
                .filter(Boolean);
              const links = vis.linksVisible
                .map((visible, idx) => {
                  if (!visible) return null;
                  const n = idx + 1;
                  const rawHref = cms.text(childKey, `link_${n}_href`, loc, "");
                  const resolved = resolveHref(rawHref);
                  if (!resolved.valid) return null;
                  return {
                    label: cms.text(childKey, `link_${n}_label`, loc, "") ||
                      learnMoreFallback(loc),
                    href: resolved.href,
                  };
                })
                .filter((l): l is { label: string; href: string } => l !== null);
              return (
                <motion.div key={key} {...fadeIn} data-cms-section={childKey} className="bg-background flex flex-col border border-border">
                  <div className="aspect-[3/2] overflow-hidden">
                    <img
                      src={cms.asset("anwendungen", fieldKey, "")}
                      alt={cms.text("anwendungen", `items.${key}.imageAlt`, loc, t(`snipdooIp.anwendungen.items.${key}.imageAlt`))}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      data-cms-field={fieldKey}
                    />
                  </div>
                  <div className="p-8 flex flex-col flex-1">
                    <span className="text-xs tracking-wide text-muted-foreground mb-3" data-cms-field="subtitle">{label}</span>
                    <h3 className="text-lg md:text-xl font-heading font-normal text-foreground mb-4 leading-snug" data-cms-field="title">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm" data-cms-field="description">{text}</p>
                    {bullets.length > 0 && (
                      <ul className="mt-3 space-y-1 flex-1">
                        {bullets.map((b) => (
                          <li key={b} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {chips.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" data-cms-field="chips">
                        {chips.map((c) => (
                          <li key={c} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    {links.length > 0 && (
                      <><div className="mt-auto" aria-hidden="true" /><div className={`flex flex-col gap-1 ${dividerFor("anwendungen") ? CARD_DIVIDER_CLASS : "pt-4"}`} data-cms-field="links">
                        {links.map((l) => (
                          <a key={`${l.label}-${l.href}`} href={l.href} className="text-sm text-primary hover:underline self-start">
                            {l.label} →
                          </a>
                        ))}
                      </div></>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {(rollenActive || roleTabsActive) && (
      <section id="rollen" className="bg-section-muted py-16 lg:py-24">
        <div className="container mx-auto">
          <motion.div {...fadeIn} className="mb-10 max-w-3xl">
            {rollenEyebrow && (
            <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
              {rollenEyebrow}
            </span>
            )}
            <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
              {rollenHeadline}
            </h2>
            <p className="text-muted-foreground">{rollenIntro}</p>
          </motion.div>
          {roleTabsActive && <RoleTabsBlock tabs={roleTabs} />}
        </div>
      </section>
      )}

      <CmsTailFaq pageKey="gebaeudekommunikation.snipdoo-ip" />
      <CmsTailCta pageKey="gebaeudekommunikation.snipdoo-ip" />


      <SiblingNav pageKey="gebaeudekommunikation.snipdoo-ip" />
      <CmsSourceBadge
        pageKey="gebaeudekommunikation.snipdoo-ip"
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
    </CmsRenderRegistryProvider>
  );
};

export default SnipdooIp;
