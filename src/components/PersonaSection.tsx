import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { txChildField } from "@/features/cms/utils/cmsItemHelpers";
import { learnMoreFallback } from "@/i18n/uiFallbacks";
import { readSectionBg, sectionBgClass } from "@/features/cms/lib/sectionBackground";
import { CARD_DIVIDER_CLASS, useCardDividers } from "@/features/cms/lib/cardDividers";
import { canonicalLink } from "@/features/cms/lib/cardCanonical";


/**
 * Persona-Section auf der Startseite.
 *
 * Tranche 18 (2026-05-26): Renderer iteriert direkt über `personas_item_*`
 * (card_v1, Kinder von `personas`/cards_v1). Eine sichtbare Karte = eine
 * bearbeitbare Datenquelle.
 *
 * Lesepfad pro Feld:
 *   1) `personas_item_<id>` (DB-first, card_v1, sichtbare Karte)
 *   2) `persona_<id>` (Legacy-Fallback, falls noch aktiv)
 *   3) `personas.items.<id>.*` (Sammel-Legacy aus i18n-Migration)
 *   4) i18n
 *
 * DOM-Marker:
 *   - Container: `data-cms-section="personas"`
 *   - Intro:     `data-cms-section="personas_intro"`
 *   - Karte:     `data-cms-section="personas_item_<id>"`
 */
const FALLBACK_PERSONAS = [
  "bauherren",
  "architekten",
  "wohnungswirtschaft",
  "fachplaner",
  "handwerk",
  "fachhandel",
] as const;

const ITEM_PREFIX = "personas_item_";
const LEGACY_PREFIX = "persona_";

interface Props {
  pageKey?: string;
}

const PersonaSection: React.FC<Props> = ({ pageKey = "home.start" }) => {
  const { t, i18n } = useTranslation("home");
  const cms = useCmsPageContent(pageKey);
  const showDividers = useCardDividers(cms.text("personas", "card_dividers", "de", ""));
  const loc = normalizeLocale(i18n.language);

  // Kleine Zeile über der Überschrift (Eyebrow). Kanonisch `label`,
  // Aliase `eyebrow`/`kicker` als Fallback — gleiche Lesart wie im
  // Karten-Renderer, damit Admin und Website dasselbe zeigen.
  const eyebrow =
    cms.text("personas", "label", loc, "") ||
    cms.text("personas", "eyebrow", loc, "") ||
    cms.text("personas", "kicker", loc, "");
  const headline =
    cms.text("personas", "headline", loc, t("personas.headline"));
  const intro =
    cms.text("personas", "intro", loc, t("personas.intro"));
  /**
   * Linkbeschriftung der Persona-Karten (wiederverwendbarer Bedientext).
   *
   * Auflösung ohne stillen Deutsch-Rückfall:
   *   1) CMS-Light in der aktiven Sprache
   *   2) i18n-Bedientext der aktiven Sprache (`home:personas.cta`, sonst
   *      `common:ui.learnMore` — in jeder freigegebenen Sprache gepflegt)
   *   3) CMS-Light entlang der Sprachkette (angefordert → en → de)
   */
  const ctaFromDb = cms.textInLocale("personas", "cta", loc);
  const hasHomeCta = i18n.exists("personas.cta", {
    ns: "home",
    lng: loc,
    fallbackLng: [],
  });
  const ctaUi = hasHomeCta ? t("personas.cta") : learnMoreFallback(loc);
  const ctaDefault =
    ctaFromDb || ctaUi || cms.text("personas", "cta", loc, "");

  // Reihenfolge bevorzugt aus den sichtbaren `personas_item_*`-Karten
  // (sort_order). Nur Karten, die tatsächlich Kinder der `personas`-Section
  // sind — Kopien in anderen Karten-Blöcken (z. B. `directlinks`) gehören
  // dorthin und dürfen hier nicht mitgezählt werden.
  const itemIds = cms.sections
    .filter(
      (s) =>
        s.section_key.startsWith(ITEM_PREFIX) &&
        s.section_type === "card_v1" &&
        s.parent_section_key === "personas",
    )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.section_key.slice(ITEM_PREFIX.length));

  const legacyIds = cms.sections
    .map((s) => s.section_key)
    .filter((k) => k.startsWith(LEGACY_PREFIX))
    .map((k) => k.slice(LEGACY_PREFIX.length));


  const personaIds: string[] =
    itemIds.length > 0 ? itemIds
    : legacyIds.length > 0 ? legacyIds
    : [...FALLBACK_PERSONAS];



  // Einheitlicher Hintergrund-Schalter `section_bg` — identischer Grauwert
  // wie bei allen anderen Bausteinen (siehe cms/lib/sectionBackground.ts).
  const bgClass = sectionBgClass(readSectionBg(cms, "personas", loc));

  return (
    <section className={`py-20 lg:py-28 ${bgClass}`} id="zielgruppen" data-cms-section="personas">
      <div className="container mx-auto">
        <div className="mb-14">
          {eyebrow && (
            <span
              className="text-xs text-muted-foreground tracking-wide mb-2 block"
              data-cms-field="label"
            >
              {eyebrow}
            </span>
          )}
          <h2 className="text-3xl md:text-4xl font-heading font-normal text-foreground mb-4">
            {headline}
          </h2>
          <p className="text-muted-foreground max-w-xl text-base">{intro}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {personaIds.map((id, i) => {
            const itemKey = `${ITEM_PREFIX}${id}`;
            const legacyKey = `${LEGACY_PREFIX}${id}`;
            // Legacy-Fallback (alte persona_*-Section) für Title/Desc/CTA.
            const legacyTitle = cms.text(
              legacyKey,
              "title",
              loc,
              t(`personas.items.${id}.title`, { defaultValue: id }),
            );
            const legacyDesc = cms.text(
              legacyKey,
              "desc",
              loc,
              t(`personas.items.${id}.desc`, { defaultValue: "" }),
            );
            // DB-first: aus sichtbarer personas_item_<id>-Karte.
            const title = txChildField(cms, loc, "personas", id, "title", legacyTitle);
            const desc = txChildField(cms, loc, "personas", id, "description", legacyDesc);
            // Linkziel und Beschriftung wie bei allen anderen Karten-Blöcken:
            // canonical `link_1_*` (Ziel/Beschriftung/Ein-Aus) zuerst, das alte
            // Feld `cta_link` nur noch als Rückfall.
            const legacyCtaLink =
              cms.text(itemKey, "cta_link", loc, "").trim() ||
              cms.text(legacyKey, "cta_link", loc, "").trim();
            const link = canonicalLink(cms, itemKey, loc, {
              fallbackHref: legacyCtaLink,
              fallbackLabel: ctaDefault,
            });
            const ctaLink = link.visible ? link.href : "";
            const ctaLabel = link.label || ctaDefault;

            const isExternal =
              ctaLink !== "" && /^([a-z]+:|\/\/)/i.test(ctaLink) && !ctaLink.startsWith("/");
            const href = ctaLink || `#${id}`;
            const motionProps = {
              initial: { opacity: 0, y: 12 },
              whileInView: { opacity: 1, y: 0 },
              animate: { opacity: 1, y: 0 },
              viewport: { once: true, amount: 0.05 },
              transition: { duration: 0.4, delay: Math.min(i * 0.05, 0.25) },
              className:
                "group bg-background p-8 lg:p-10 hover:bg-secondary transition-colors duration-300",
              "data-cms-section": itemKey,
            } as const;
            const inner = (
              <>
                <h3 className="font-heading text-lg text-foreground mb-3">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{desc}</p>
                <span className={`flex items-center gap-1.5 text-sm text-foreground group-hover:gap-3 transition-all ${showDividers && ctaLink ? CARD_DIVIDER_CLASS : ""}`}>
                  {ctaLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </>
            );
            if (ctaLink && !isExternal && ctaLink.startsWith("/")) {
              return (
                <motion.div key={itemKey} {...motionProps}>
                  <Link to={ctaLink} className="block">
                    {inner}
                  </Link>
                </motion.div>
              );
            }
            return (
              <motion.a
                key={itemKey}
                href={href}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                {...motionProps}
              >
                {inner}
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PersonaSection;
