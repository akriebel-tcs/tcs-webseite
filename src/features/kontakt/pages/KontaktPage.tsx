import { Fragment } from "react";
import { Mail, Phone, MapPin, Clock, FileText, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import { useCmsText } from "@/features/cms/hooks/useCmsText";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";

/**
 * Section-Keys, die dieser Sonderrenderer selbst ausgibt (Kopf, Kontaktkarten,
 * Formular). Alle übrigen Top-Level-Sections der Seite werden generisch über
 * den CMS-Baukasten gerendert — damit sind frei angelegte Bausteine (z. B.
 * Register/`tabs_v1`) auf /kontakt sofort sichtbar und spiegel-treu.
 */
const OWN_SECTION_KEYS = new Set(["hero", "inline", "sections", "cards", "form"]);

const Kontakt = () => {
  const { t, cms, loc } = useCmsI18n("kontakt.root", "kontakt");
  const tcms = useCmsText(cms, "kontakt");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  const extraSections = cms.sections.filter(
    (s) =>
      !s.parent_section_key &&
      s.section_type !== "hero" &&
      s.section_type !== "hero_v1" &&
      !OWN_SECTION_KEYS.has(s.section_key),
  );

  // Kontaktdaten kommen vollständig aus der DB (Abschnitt `cards`).
  const contactItems = [
    {
      icon: Phone,
      title: tcms("cards", "phone.title"),
      line1: cms.text("cards", "phone.value", loc, ""),
      line2: tcms("cards", "phone.hours"),
    },
    {
      icon: Mail,
      title: tcms("cards", "email.title"),
      line1: cms.text("cards", "email.value", loc, ""),
    },
    {
      icon: MapPin,
      title: tcms("cards", "address.title"),
      line1: tcms("cards", "address.value"),
    },
    {
      icon: Clock,
      title: tcms("cards", "support.title"),
      line1: cms.text("cards", "support.value", loc, ""),
      line2: tcms("cards", "support.hours"),
    },
    {
      icon: FileText,
      title: cms.text("cards", "offers.title", loc, ""),
      line1: cms.text("cards", "offers.value", loc, ""),
      line2: cms.text("cards", "offers.hours", loc, ""),
    },
    {
      icon: ShoppingCart,
      title: cms.text("cards", "sales.title", loc, ""),
      line1: cms.text("cards", "sales.value", loc, ""),
      line2: cms.text("cards", "sales.hours", loc, ""),
    },
  ].filter((item) => item.title || item.line1);


  // Hotline-/Kontaktblock: ausschließlich aus der DB (kein i18n-Fallback).
  const sectionsText = cms.text("sections", "text", loc, "");

  // Empfangsadresse des Formulars (B-552) — DB-first, im Admin pflegbar.
  const recipientEmail = cms.text("form", "recipient_email", loc, "");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!recipientEmail) return;
    const data = new FormData(e.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const subject = get("subject") || t("sections.form.title");
    const body = [
      `${t("form.firstName")}: ${get("firstName")}`,
      `${t("form.lastName")}: ${get("lastName")}`,
      `${t("form.email")}: ${get("email")}`,
      "",
      get("message"),
    ].join("\n");
    window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  return (
    <>
      <AutoBreadcrumb />
      <CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />
      <section className="bg-background">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-sm text-muted-foreground tracking-wide uppercase mb-4">{t("hero.label")}</p>
            <h1 className="text-3xl lg:text-5xl font-heading font-semibold tracking-tight leading-tight max-w-3xl mb-6">
              {t("hero.headline")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {cms.text("hero", "subline", loc, "") || t("hero.intro")}
            </p>
          </motion.div>
        </div>
      </section>

      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />
      <div className="container mx-auto py-16 lg:py-24">
        <div className="grid md:grid-cols-2 gap-16">
          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-heading font-semibold mb-6">{t("sections.reach.title")}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("sections.reach.intro")}
              </p>
            </div>
            <div className="space-y-6">
              {contactItems.map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">{item.line1}</p>
                    {item.line2 && <p className="text-muted-foreground text-xs mt-1">{item.line2}</p>}
                  </div>
                </div>
              ))}
            </div>
            {sectionsText && (
              <div className="border-t border-border pt-8">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {sectionsText}
                </p>
              </div>
            )}
          </div>

          <div className="bg-secondary/50 p-8 lg:p-10">
            <h2 className="text-2xl font-heading font-semibold mb-6">{t("sections.form.title")}</h2>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("form.firstName")}</label>
                  <input name="firstName" type="text" className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("form.lastName")}</label>
                  <input name="lastName" type="text" className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("form.email")}</label>
                <input name="email" type="email" className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("form.subject")}</label>
                <input name="subject" type="text" className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("form.message")}</label>
                <textarea name="message" rows={5} className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none" />
              </div>

              <button type="submit" className="bg-foreground text-background px-8 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors">
                {t("form.submit")}
              </button>
            </form>
          </div>
        </div>
      </div>

      {extraSections.map((s) => (
        <Fragment key={s.section_key}>
          {renderPageSectionByType({
            pageKey: "kontakt.root",
            sectionKey: s.section_key,
            sectionType: s.section_type,
            cms,
            locale: loc,
          })}
        </Fragment>
      ))}


    <CmsSourceBadge
      pageKey="kontakt.root"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
    </>
  );
};

export default Kontakt;
