import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";

interface Props {
  /** CMS-Seitenanker. Default: Default-Startseite (T01). */
  pageKey?: string;
}

const HeroSection: React.FC<Props> = ({ pageKey = "home.start" }) => {
  const { t, i18n } = useTranslation("home");
  const cms = useCmsPageContent(pageKey);
  const loc = normalizeLocale(i18n.language);

  // DB-Wert ODER i18n-Fallback. Reihenfolge garantiert pixelidentischen Output,
  // solange die DB nicht aktiv abweichende Werte enthält.
  const eyebrow = cms.text("hero", "eyebrow", loc, t("hero.eyebrow"));
  const headline = cms.text("hero", "headline", loc, t("hero.headline"));
  // Der Einleitungsabsatz liegt in der Datenbank unter `subline` (so pflegt
  // ihn der Admin und so übersetzt ihn der Übersetzungslauf). `intro` bleibt
  // nur als Übergangs-Feldname, danach greift der i18n-Fallback.
  const intro =
    cms.text("hero", "subline", loc, "") ||
    cms.text("hero", "intro", loc, t("hero.intro"));
  const imageAlt = cms.assetAlt(
    "hero",
    "image",
    loc,
    cms.text("hero", "image_alt", loc, t("hero.imageAlt")),
  );
  // Bild-Set aus DB (mobile/tablet/desktop). DB-first, ohne Code-Fallback.
  const heroSet = cms.assetSet("hero", "image");
  const desktopSrc = heroSet.desktop ?? heroSet.any ?? "";
  const mobileSrc  = heroSet.mobile  ?? heroSet.any ?? "";

  return (
    <section data-cms-section="hero" className="bg-background">
      {/* Editorial intro text */}
      <div className="container mx-auto pt-16 pb-12 lg:pt-24 lg:pb-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-sm text-muted-foreground mb-6"
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-normal leading-[1.15] text-foreground max-w-4xl"
        >
          {headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mt-8"
        >
          {intro}
        </motion.p>
      </div>

      {/* Full-width hero image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="w-full"
        data-cms-field="image"
      >
        <picture>
          <source media="(min-width: 640px)" srcSet={desktopSrc} />
          <img
            src={mobileSrc}
            alt={imageAlt}
            className="w-full h-auto lg:h-[70vh] object-cover lg:object-right"
            width={1920}
            height={1080}
          />
        </picture>
      </motion.div>
    </section>
  );
};

export default HeroSection;
