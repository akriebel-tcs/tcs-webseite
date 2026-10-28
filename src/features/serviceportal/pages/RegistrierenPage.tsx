import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";
import { CmsRenderRegistryProvider } from "@/features/cms/components/CmsRenderRegistry";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import CmsTailCta from "@/features/cms/components/CmsTailCta";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Registrieren = () => {
  const { t, cms, loc } = useCmsI18n("serviceportal.registrieren", "serviceportal", "registrieren");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const [firma, setFirma] = useState("");
  const [ansprechpartner, setAnsprechpartner] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (firma.trim() && ansprechpartner.trim() && email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <CmsRenderRegistryProvider>
      <AutoBreadcrumb />
      <CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />
    <section className="bg-background min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto px-6"
      >
        <div className="border border-border bg-background p-8 md:p-10">
          {submitted ? (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-secondary mb-6 mx-auto">
                <CheckCircle className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-normal text-foreground text-center mb-2">
                {t("registrieren.successHeadline")}
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-8">
                <Trans
                  i18nKey="registrieren.successIntro"
                  ns="serviceportal"
                  values={{ email }}
                  components={{ strong: <strong /> }}
                />
              </p>
              <Link
                to="/serviceportal"
                className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-background py-3 text-sm font-medium hover:bg-muted-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {t("registrieren.back")}
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-secondary mb-6 mx-auto">
                <UserPlus className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <span className="block text-xs text-muted-foreground tracking-wide text-center mb-2">{t("registrieren.eyebrow")}</span>
              <h1 className="text-2xl md:text-3xl font-heading font-normal text-foreground text-center mb-2">
                {t("registrieren.headline")}
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-8">
                {t("registrieren.intro")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground tracking-wide mb-1.5">
                    {t("registrieren.firmaLabel")}
                  </label>
                  <input
                    type="text"
                    value={firma}
                    onChange={(e) => setFirma(e.target.value)}
                    placeholder={t("registrieren.firmaPlaceholder")}
                    required
                    className="w-full border border-border px-4 py-2.5 text-sm text-foreground bg-background outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground tracking-wide mb-1.5">
                    {t("registrieren.ansprechpartnerLabel")}
                  </label>
                  <input
                    type="text"
                    value={ansprechpartner}
                    onChange={(e) => setAnsprechpartner(e.target.value)}
                    placeholder={t("registrieren.ansprechpartnerPlaceholder")}
                    required
                    className="w-full border border-border px-4 py-2.5 text-sm text-foreground bg-background outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground tracking-wide mb-1.5">
                    {t("registrieren.emailLabel")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("registrieren.emailPlaceholder")}
                    required
                    className="w-full border border-border px-4 py-2.5 text-sm text-foreground bg-background outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground tracking-wide mb-1.5">
                    {t("registrieren.telefonLabel")}
                  </label>
                  <input
                    type="tel"
                    value={telefon}
                    onChange={(e) => setTelefon(e.target.value)}
                    placeholder={t("registrieren.telefonPlaceholder")}
                    className="w-full border border-border px-4 py-2.5 text-sm text-foreground bg-background outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-foreground text-background py-3 text-sm font-medium hover:bg-muted-foreground transition-colors"
                >
                  {t("registrieren.submit")}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/serviceportal"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  <ArrowLeft className="w-3 h-3" /> {t("registrieren.back")}
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </section>
      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />

      <CmsTailFaq pageKey="serviceportal.registrieren" />
      <CmsTailCta pageKey="serviceportal.registrieren" />
      <CmsSourceBadge
        pageKey="serviceportal.registrieren"
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
    </CmsRenderRegistryProvider>
  );
};

export default Registrieren;
