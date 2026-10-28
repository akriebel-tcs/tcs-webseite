import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Building2, CheckCircle2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { referenzprojekte } from "@/features/anwendungen/data/referenzprojekte";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useCmsPageContent, normalizeLocale } from "@/features/cms/hooks/useCmsPageContent";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

/** Liest eine Liste aus dem CMS-Textfeld (JSON-String) oder fällt auf i18n zurück. */
function parseListField(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(String);
  } catch {
    // raw ist kein JSON → ignoriere DB-Wert
  }
  return fallback;
}

const ReferenzprojektDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useCmsI18n("anwendungen.referenzen.detail", "anwendungen", "referenzen.detail");
  const locale = normalizeLocale(i18n.language);
  const project = referenzprojekte.find((p) => p.slug === slug);
  const cms = useCmsPageContent(slug ? `anwendungen.referenzprojekte.${slug}` : null);

  if (!project) {
    return (
      <PageLayout
        label={t("referenzen.detail.notFound.label")}
        headline={t("referenzen.detail.notFound.headline")}
        intro={t("referenzen.detail.notFound.intro")}
        heroImage=""
      >
        <div className="container mx-auto py-16 text-center">
          <Link to="/anwendungen/referenzprojekte" className="text-primary hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("referenzen.detail.notFound.back")}
          </Link>
        </div>
      </PageLayout>
    );
  }

  const base = `referenzen.projekte.${project.slug}`;
  const i18nTitle = t(`${base}.title`);
  const i18nDescription = t(`${base}.description`);
  const i18nLong = t(`${base}.longDescription`, { returnObjects: true }) as string[];
  const i18nHighlights = t(`${base}.highlights`, { returnObjects: true }) as string[];
  const i18nSystems = t(`${base}.systems`, { returnObjects: true }) as string[];
  const i18nType = t(`${base}.type`);
  const i18nLocation = t(`${base}.location`);
  const i18nUnits = t(`${base}.units`);

  // DB-first mit i18n-Fallback (Inhalt-zuerst-Regel: Texte aus DB, Layout aus Code)
  const title = cms.text("hero", "headline", locale, i18nTitle);
  // Beschreibungssatz unter dem Seitenkopf: kanonisch „hero.description",
  // danach „hero.intro"/„hero.subline", Altfeld „beschreibung.intro" bleibt Fallback.
  const description =
    cms.text("hero", "description", locale, "") ||
    cms.text("hero", "intro", locale, "") ||
    cms.text("hero", "subline", locale, "") ||
    cms.text("beschreibung", "intro", locale, i18nDescription);
  // Kanonisch heißt das Fließtextfeld „text" (Alias „body" bleibt Fallback).
  const dbBody = cms.text("beschreibung", "text", locale, "") || cms.text("beschreibung", "body", locale, "");
  const longDescription = dbBody ? dbBody.split(/\n\n+/).filter(Boolean) : i18nLong;
  const highlights = parseListField(cms.text("highlights", "items", locale, ""), i18nHighlights);
  const systems = parseListField(cms.text("systems", "items", locale, ""), i18nSystems);
  const projectType = cms.text("hero", "eyebrow", locale, i18nType);
  // Standort liegt jetzt in einem eigenen Feld (früher fälschlich in „subline").
  const location = cms.text("hero", "meta_location", locale, i18nLocation);

  const units = cms.text("hero", "meta_units", locale, i18nUnits);
  const year = cms.text("hero", "meta_year", locale, project.year);

  // Beschriftungen und Überschriften ebenfalls DB-first (Altfelder als Fallback).
  const pageLabel = cms.text("hero", "label", locale, t("referenzen.detail.label"));
  const backLabel = cms.text("hero", "back_label", locale, t("referenzen.detail.back"));
  const beschreibungTitle = cms.text(
    "beschreibung",
    "title",
    locale,
    t("referenzen.detail.sections.beschreibung"),
  );
  const highlightsTitle = cms.text(
    "highlights",
    "title",
    locale,
    t("referenzen.detail.sections.highlights"),
  );
  const systemsTitle = cms.text("systems", "title", locale, t("referenzen.detail.sections.systeme"));
  const metaTitle = cms.text("hero", "meta_title", locale, t("referenzen.detail.sections.projektdaten"));
  const metaLabelType = cms.text("hero", "meta_label_type", locale, t("referenzen.detail.meta.gebaeudetyp"));
  const metaLabelLocation = cms.text("hero", "meta_label_location", locale, t("referenzen.detail.meta.standort"));
  const metaLabelYear = cms.text("hero", "meta_label_year", locale, t("referenzen.detail.meta.fertigstellung"));
  const metaLabelUnits = cms.text("hero", "meta_label_units", locale, t("referenzen.detail.meta.umfang"));
  const ctaTitle = cms.text("standard_cta", "title", locale, t("referenzen.detail.cta.title"));
  const ctaText = cms.text("standard_cta", "text", locale, t("referenzen.detail.cta.text"));
  const ctaLabel = cms.text("standard_cta", "cta_label", locale, t("referenzen.detail.cta.link"));
  const ctaHref = cms.text("standard_cta", "cta_href", locale, "/kontakt");

  // Bilder ausschließlich aus cms_assets (Sub-Page anwendungen.referenzprojekte.<slug>).
  // Hero-Slot: section "hero", field "image". Galerie: section "gallery", img_0/1/2.
  const heroImage = cms.asset("hero", "image", "");
  const heroAlt = cms.assetAlt("hero", "image", locale, title);
  const galleryImages = [0, 1, 2].map((i) => cms.asset("gallery", `img_${i}`, ""));
  const faqSection = cms.sections.find((s) => s.section_key === "faq");

  return (
    <PageLayout label={pageLabel} headline={title} intro={description} heroImage={heroImage} heroAlt={heroAlt} fullWidth>

      <section className="py-12 lg:py-20 bg-background">
        <div className="container mx-auto">
          <Link to="/anwendungen/referenzprojekte" className="text-primary hover:underline inline-flex items-center gap-2 mb-10 text-sm">
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </Link>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image Gallery */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <Carousel className="w-full">
                  <CarouselContent>
                    {galleryImages.map((img, i) => (
                      <CarouselItem key={i}>
                        <div className="aspect-[16/9] rounded-lg overflow-hidden bg-secondary">
                          <img
                            src={img}
                            alt={cms.assetAlt("gallery", `img_${i}`, locale, t("referenzen.detail.imageAlt", { title, index: i + 1 }))}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-4 lg:-left-6" />
                  <CarouselNext className="-right-4 lg:-right-6" />
                </Carousel>
              </motion.div>

              {/* Description */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="space-y-4">
                <h2 className="text-xl md:text-2xl font-heading font-normal text-foreground">{beschreibungTitle}</h2>
                {longDescription.map((para, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed text-sm">{para}</p>
                ))}
              </motion.div>

              {/* Highlights */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="space-y-4">
                <h3 className="text-lg font-heading font-normal text-foreground">{highlightsTitle}</h3>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Sidebar */}
            <motion.aside initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6 space-y-5">
                <h3 className="font-heading font-semibold text-foreground text-sm">{metaTitle}</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground block text-xs">{metaLabelType}</span>
                      <span className="text-foreground">{projectType}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground block text-xs">{metaLabelLocation}</span>
                      <span className="text-foreground">{location}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground block text-xs">{metaLabelYear}</span>
                      <span className="text-foreground">{year}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-muted-foreground block text-xs">{metaLabelUnits}</span>
                      <span className="text-foreground">{units}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h3 className="font-heading font-semibold text-foreground text-sm">{systemsTitle}</h3>
                <ul className="space-y-2">
                  {systems.map((s) => (
                    <li key={s} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                <h3 className="font-heading font-semibold text-foreground text-sm mb-2">{ctaTitle}</h3>
                <p className="text-xs text-muted-foreground mb-4">{ctaText}</p>
                <Link to={ctaHref} className="inline-flex items-center text-sm text-primary hover:underline font-medium">
                  {ctaLabel}
                </Link>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      {faqSection
        ? renderPageSectionByType({
            pageKey: `anwendungen.referenzprojekte.${project.slug}`,
            sectionKey: "faq",
            sectionType: faqSection.section_type,
            cms,
            locale,
          })
        : null}
    </PageLayout>
  );
};

export default ReferenzprojektDetail;
