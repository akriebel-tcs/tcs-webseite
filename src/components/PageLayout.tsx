import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AutoBreadcrumb from "./AutoBreadcrumb";
import { useCmsPreviewHighlight } from "@/shared/hooks/useCmsPreviewHighlight";
import CmsTailSections from "@/features/cms/components/CmsTailSections";
import SiblingNav from "@/components/SiblingNav";
import { CmsRenderRegistryProvider } from "@/features/cms/components/CmsRenderRegistry";



interface PageLayoutProps {
  label: string;
  headline: string;
  /** Optionale Unterzeile zwischen Headline und Intro (CMS-Feld `hero.subheader`). */
  subheader?: string;
  intro: string;
  heroImage: string;
  heroAlt?: string;
  /**
   * Optionales Hero-Bild für Desktop (>=1024px). Wenn gesetzt, wird per
   * <picture>/<source> dynamisch das beste Bild ausgespielt.
   */
  heroImageDesktop?: string;
  /** Optionales Hero-Bild für Tablet (768–1023px). */
  heroImageTablet?: string;
  /**
   * Optionales Hero-Bild speziell für Mobile (<768px). Wenn gesetzt, wird
   * statt `heroImage` auf Mobil ausgespielt und der Container nutzt das
   * natürliche Seitenverhältnis (object-contain) statt fixer Höhe.
   */
  heroImageMobile?: string;
  /** Optionaler CSS `object-position`-Wert für das Hero-Bild (z. B. "right center"). */
  heroImagePosition?: string;
  /**
   * Darstellung des Hero-Bildes: `cover` (Standard, Bild füllt den Rahmen und
   * wird beschnitten) oder `contain` (Bild wird formatfüllend, aber vollständig
   * und unbeschnitten gezeigt — freie Ränder erhalten weißen Hintergrund).
   * Redaktionell steuerbar über das Hero-Feld `image_fit`.
   */
  heroImageFit?: "cover" | "contain";
  children: ReactNode;
  fullWidth?: boolean;
  darkHero?: boolean;
  /**
   * Steuert, ob das große Hero-Bild unterhalb des Hero-Texts gerendert wird.
   * Default: true (bestehendes Verhalten). Auf inhaltsdichten Hub-Seiten
   * (z. B. Online-Produktkatalog, Downloads) bewusst auf false setzen, damit
   * Nutzer schneller zum eigentlichen Inhalt gelangen.
   */
  showHeroImage?: boolean;
  /**
   * Optionaler CMS-`page_key` (z. B. `service.ersatzteile`). Wenn gesetzt,
   * liest der globale Tail-CTA (Section `standard_cta` bzw. `cta`) seine
   * Texte und seinen Button-Link DB-first aus `cms_section_fields`.
   * Fehlt ein Feld in der DB, greift der bisherige i18n-Fallback
   * (`common.pageCta.*`) und `/kontakt` — d. h. das Verhalten bleibt
   * identisch zur Vorversion, solange Redaktion nichts gepflegt hat.
   */
  pageKey?: string;
  /**
   * Wenn true, wird der gesamte Hero-Block (Eyebrow/Headline/Intro + Bild)
   * nicht gerendert. Wird zentral von `CmsPageLayout` gesetzt, sobald die
   * CMS-Section `hero` im Admin ausgeblendet ist (Spiegel-Regel).
   */
  hideHero?: boolean;
  /**
   * Grauer Hero-Hintergrund (`bg-secondary`). Wird von `CmsPageLayout` aus
   * dem redaktionellen Feld `section_bg` (Werte `default` / `muted`) der
   * Hero-Section gesetzt — gleiche Logik wie bei allen anderen Blöcken.
   */
  heroMuted?: boolean;
}

const PageLayout = ({
  label,
  headline,
  subheader,
  intro,
  heroImage,
  heroAlt = "",
  heroImageDesktop,
  heroImageTablet,
  heroImageMobile,
  heroImagePosition,
  heroImageFit = "cover",
  children,
  fullWidth = false,
  darkHero = false,
  showHeroImage = true,
  pageKey,
  hideHero = false,
  heroMuted = false,
}: PageLayoutProps) => {
  useCmsPreviewHighlight();
  const heroImageClass =
    heroImageFit === "contain"
      ? "w-full h-[40vh] lg:h-[55vh] object-contain bg-background"
      : "w-full h-[40vh] lg:h-[55vh] object-cover";

  return (
    <CmsRenderRegistryProvider>
      <AutoBreadcrumb fallbackLabel={label} />

      {/* Hero — zentral an CMS-Sichtbarkeit gebunden (Spiegel-Regel Batch 1).
          `hideHero` wird von `CmsPageLayout` gesetzt, sobald die DB-Section
          `hero` im Admin ausgeblendet ist (RLS filtert sie dann aus
          `cms.sections`). Bei Legacy-Seiten ohne CMS-Vertrag bleibt der
          Default (false) erhalten — Verhalten unverändert. */}
      {!hideHero && (
        <section
          data-cms-section="hero"
          className={
            darkHero
              ? "bg-neutral-900 text-neutral-200"
              : heroMuted
                ? "bg-section-muted"
                : "bg-background"
          }
        >
          <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className={`block text-xs tracking-wide mb-4 ${darkHero ? "text-neutral-400" : "text-muted-foreground"}`}>{label}</span>
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-heading font-normal leading-tight max-w-3xl mb-6 ${darkHero ? "text-neutral-100" : ""}`}>{headline}</h1>
              {subheader && (
                <p data-cms-field="subheader" className={`text-lg md:text-xl font-heading font-normal leading-snug max-w-2xl mb-4 ${darkHero ? "text-neutral-200" : "text-foreground"}`}>{subheader}</p>
              )}
              <p className={`text-base leading-relaxed max-w-2xl ${darkHero ? "text-neutral-400" : "text-muted-foreground"}`}>{intro}</p>
            </motion.div>
          </div>
          {showHeroImage && (
            heroImageDesktop || heroImageTablet || heroImageMobile ? (
              <picture data-cms-field="image">
                {heroImageTablet && (
                  <source media="(min-width: 768px) and (max-width: 1023px)" srcSet={heroImageTablet} />
                )}
                {heroImageDesktop && (
                  <source media="(min-width: 1024px)" srcSet={heroImageDesktop} />
                )}
                {heroImageTablet && !heroImageDesktop && (
                  <source media="(min-width: 768px)" srcSet={heroImageTablet} />
                )}
                {heroImageMobile && (
                  <source media="(max-width: 767px)" srcSet={heroImageMobile} />
                )}
                <img
                  src={heroImage}
                  alt={heroAlt}
                  className={heroImageClass}
                  style={heroImagePosition ? { objectPosition: heroImagePosition } : undefined}
                />
              </picture>
            ) : (
              <img src={heroImage} alt={heroAlt} className={heroImageClass} style={heroImagePosition ? { objectPosition: heroImagePosition } : undefined} data-cms-field="image" />
            )
          )}
        </section>
      )}

      {/* Content */}
      {fullWidth ? (
        children
      ) : (
        <div className="py-16 lg:py-24">
          <div className="container mx-auto">
            {children}
          </div>
        </div>
      )}

      {/* Tail-Sections (Batch 55) — rendert FAQ- und CTA-Tail-Blöcke
          gemeinsam, sortiert nach typübergreifendem `sort_order` aus
          `cms_sections`. Ersetzt die getrennten CmsTailFaq/CmsTailCta-
          Aufrufe, die bisher FAQ immer vor allen CTAs gerendert haben.
          Dedup weiterhin über CmsRenderRegistry; inaktive Sections
          filtert die RLS aus `cms.sections` heraus. */}
      {pageKey && <CmsTailSections pageKey={pageKey} />}

      {/* Blätternavigation (T5) — zentral GANZ am Seitenende, also nach den
          Tail-Blöcken (FAQ/CTA). Seiten, die die Navigation selbst an einer
          eigenen Stelle ausgeben, belegen den Platz im Render-Register; dann
          hält sich dieser Aufruf zurück. */}
      {pageKey && <SiblingNav pageKey={pageKey} variant="tail" />}


    </CmsRenderRegistryProvider>
  );
};


export default PageLayout;

interface FeatureBlockProps {
  headline: string;
  text: string;
  reverse?: boolean;
  image?: string;
  link?: string;
}

export const FeatureBlock = ({ headline, text, reverse, image, link }: FeatureBlockProps) => {
  const isInternal = !!link && link.startsWith("/");
  const renderHeadline = () => {
    if (!link) return headline;
    if (isInternal) {
      return (
        <Link to={link} className="hover:text-lime-500 transition-colors">
          {headline}
        </Link>
      );
    }
    return (
      <a href={link} className="hover:text-lime-500 transition-colors">
        {headline}
      </a>
    );
  };
  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.5 }}
    className={`grid ${image ? "lg:grid-cols-2 gap-10 lg:gap-14 items-center" : ""} mb-16 last:mb-0`}
  >
    {image && (
      <div className={reverse ? "lg:order-2" : ""}>
        <img src={image} alt={headline} loading="lazy" className="w-full h-64 md:h-80 object-cover" />
      </div>
    )}
    <div className={reverse ? "lg:order-1" : ""}>
      <h3 className="text-xl md:text-2xl font-heading font-normal text-foreground mb-4 leading-tight">
        {renderHeadline()}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{text}</p>
    </div>
  </motion.div>
  );
};

interface ContentSectionProps {
  label?: string;
  title?: string;
  children: ReactNode;
  bg?: "default" | "warm";
  /**
   * Optionaler Block-Schlüssel (`section_key` aus `cms_sections`).
   * Wenn gesetzt, kann der Admin-Live-Preview-Listener diesen Block per
   * `[data-cms-section=...]` ansteuern und kurz hervorheben.
   */
  dataSectionKey?: string;
}

export const ContentSection = ({ label, title, children, bg = "default", dataSectionKey }: ContentSectionProps) => (
  <div
    data-cms-section={dataSectionKey}
    className={`${bg === "warm" ? "bg-section-muted -mx-4 md:-mx-8 px-4 md:px-8 py-12 mb-16" : "mb-16"}`}
  >
    {(label || title) && (
      <div className="mb-10">
        {label && <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{label}</span>}
        {title && <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground">{title}</h2>}
      </div>
    )}
    {children}
  </div>
);