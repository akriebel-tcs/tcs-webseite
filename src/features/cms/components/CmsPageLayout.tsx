/**
 * CmsPageLayout — dünner Wrapper um <PageLayout/>, der Hero-Inhalte
 * (Eyebrow/Label, Headline, Intro, Hero-Bild + Alt) automatisch aus dem
 * CMS-Light Datenmodell zieht und auf den vorhandenen Code-Fallback
 * zurückfällt, wenn die Seite oder ein Feld noch nicht im CMS gepflegt ist.
 *
 * Erwartete CMS-Felder (alle optional):
 *   section_key = "hero"
 *   field_keys: "eyebrow" (oder Legacy-"label"), "headline", "intro" (oder "subline"/"description")
 *   asset role:  field_key = "image"
 *
 * Damit bleibt die "Spiegel-Regel" erfüllt: Texte/Bilder, die im /admin
 * geändert werden, erscheinen automatisch auf der Public-Seite.
 */
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/PageLayout";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import type { AppLocale } from "@/i18n/locale";

interface Props {
  pageKey: string;
  label: string;
  headline: string;
  intro: string;
  heroImage: string;
  heroAlt?: string;
  heroImageDesktop?: string;
  heroImageTablet?: string;
  heroImageMobile?: string;
  children: ReactNode;
  fullWidth?: boolean;
  darkHero?: boolean;
  showHeroImage?: boolean;
}

/** Erstes nicht-leeres CMS-Feld unter den Kandidaten zurückgeben. */
function pick(
  cms: ReturnType<typeof useCmsPageContent>,
  section: string,
  loc: AppLocale,
  candidates: string[],
  fallback: string,
): string {
  for (const key of candidates) {
    const v = cms.text(section, key, loc, "");
    if (v && v.trim().length > 0) return v;
  }
  return fallback;
}

const CmsPageLayout = ({
  pageKey,
  label,
  headline,
  intro,
  heroImage,
  heroAlt,
  heroImageDesktop,
  heroImageTablet,
  heroImageMobile,
  children,
  fullWidth,
  darkHero,
  showHeroImage,
}: Props) => {
  const { i18n } = useTranslation();
  const cms = useCmsPageContent(pageKey);
  const loc = normalizeLocale(i18n.language);

  const cmsLabel = pick(cms, "hero", loc, ["eyebrow", "label"], label);
  const cmsHeadline = pick(cms, "hero", loc, ["headline"], headline);
  const cmsSubheader = pick(cms, "hero", loc, ["subheader", "subheadline"], "");
  // Batch 60 — eine Wahrheit für den Hero-Einleitungstext:
  // Das im Admin gepflegte Feld „Intro / Subline" (`subline`) hat Vorrang.
  // Die Altfelder bleiben nur als Rückfallebene erhalten (nach der
  // Datenkonsolidierung laufen sie ins Leere). Typografie unverändert.
  const cmsIntro = pick(cms, "hero", loc, ["subline", "intro", "introText", "description"], intro);
  const cmsHero = cms.asset("hero", "image", heroImage);
  const cmsAlt = cms.assetAlt("hero", "image", loc, heroAlt ?? cmsHeadline);
  // Responsive Varianten kommen jetzt aus dem viewport-Set desselben Slots
  // ("hero"/"image"). Fehlt eine Variante in der DB, greift der jeweilige
  // Code-Fallback (Prop heroImageDesktop / -Tablet / -Mobile).
  const heroSet = cms.assetSet("hero", "image");
  const cmsHeroDesktop = heroSet.desktop ?? heroImageDesktop ?? undefined;
  const cmsHeroTablet = heroSet.tablet ?? heroImageTablet ?? undefined;
  const cmsHeroMobile = heroSet.mobile ?? heroImageMobile ?? undefined;
  // Fixierungspunkt (CSS object-position, z. B. "right center") — optional pro Seite.
  const cmsHeroFocus = pick(cms, "hero", loc, ["image_focus"], "");
  // Bilddarstellung (`image_fit`): "contain" = vollständig sichtbar, freie
  // Ränder weiß; alles andere = bisheriges Verhalten (beschnitten füllend).
  const cmsHeroFit =
    cms.text("hero", "image_fit", "de", "").trim().toLowerCase() === "contain"
      ? "contain"
      : "cover";
  // Globaler Hintergrund-Schalter (`section_bg`, nur DE gepflegt):
  //   "muted"/"secondary" → grauer Hero, sonst Standard.
  const heroBgRaw = (
    cms.text("hero", "section_bg", "de", "") ||
    cms.text("hero", "section_bg", "en", "")
  ).trim().toLowerCase();
  const heroMuted = heroBgRaw === "muted" || heroBgRaw === "secondary";

  // Spiegel-Regel Batch 1 — zentraler Hero-Guard:
  // Wenn die Seite überhaupt CMS-Inhalte hat (`hasDbContent`) UND keine
  // aktive Top-Level-Section mit `section_key === "hero"` zurückkommt
  // (RLS filtert inaktive Sections bereits aus `cms.sections`), wird der
  // Hero-Block in `PageLayout` unterdrückt. Legacy-Seiten ohne CMS-Vertrag
  // (`hasDbContent === false`) behalten ihr bisheriges Verhalten.
  const hasActiveHeroSection = cms.sections.some(
    (s) => !s.parent_section_key && s.section_key === "hero",
  );
  const hideHero = cms.hasDbContent && !hasActiveHeroSection;

  return (
    <div data-cms-page={pageKey}>
      <PageLayout
        label={cmsLabel}
        headline={cmsHeadline}
        subheader={cmsSubheader || undefined}
        intro={cmsIntro}
        heroImage={cmsHero}
        heroAlt={cmsAlt}
        heroImageDesktop={cmsHeroDesktop}
        heroImageTablet={cmsHeroTablet}
        heroImageMobile={cmsHeroMobile}
        heroImagePosition={cmsHeroFocus || undefined}
        heroImageFit={cmsHeroFit}
        fullWidth={fullWidth}
        darkHero={darkHero}
        showHeroImage={showHeroImage}
        pageKey={pageKey}
        hideHero={hideHero}
        heroMuted={heroMuted}
      >
        {children}
      </PageLayout>
    </div>
  );
};

export default CmsPageLayout;
