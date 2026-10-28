import { Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import { useCmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { useCmsText } from "@/features/cms/hooks/useCmsText";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const PAGE_KEY = "kontakt-bcm.root";

const KontaktBcmPage = () => {
  const { t, loc } = useCmsI18n("kontakt-bcm.root", "kontakt-bcm");
  const cms = useCmsPageContent(PAGE_KEY);
  const tcms = useCmsText(cms, "kontakt-bcm");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  const contactItems = [
    {
      icon: Phone,
      title: tcms("cards", "phone.title"),
      line1: tcms("cards", "phone.value"),
    },
    {
      icon: Mail,
      title: tcms("cards", "email.title"),
      line1: tcms("cards", "email.value"),
    },
  ];

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
              {t("hero.intro")}
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
                    <item.icon className="w-5 h-5 text-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">{item.line1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary/50 p-8 lg:p-10">
            <h2 className="text-2xl font-heading font-semibold mb-6">{t("sections.form.title")}</h2>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("form.firstName")}</label>
                  <input type="text" className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("form.lastName")}</label>
                  <input type="text" className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("form.email")}</label>
                <input type="email" className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("form.subject")}</label>
                <input type="text" className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("form.message")}</label>
                <textarea rows={5} className="w-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none" />
              </div>
              <button type="submit" className="bg-foreground text-background px-8 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors">
                {t("form.submit")}
              </button>
            </form>
          </div>
        </div>
      </div>

    <CmsSourceBadge
      pageKey={PAGE_KEY}
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
    </>
  );
};

export default KontaktBcmPage;
