import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/navigation/routes";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { txChildField } from "@/features/cms/utils/cmsItemHelpers";


/**
 * Ein einzelner Lösungsblock (eine Section `block_*`).
 * Wird von HomePage in der Reihenfolge gerendert, die im Admin gepflegt ist.
 * Das Layout (Bild links/rechts) richtet sich nach der Position innerhalb
 * der Lösungsblöcke (`positionIndex`).
 */
type BlockKey =
  | "communication"
  | "access"
  | "entry"
  | "signage"
  | "solutions"
  | "gebaeudemanagement";

interface BlockMeta {
  link?: string;
}

const BLOCK_META: Record<BlockKey, BlockMeta> = {
  communication:      { link: ROUTES.gebaeudekommunikation.root },
  access:             { link: ROUTES.zutrittskontrolle.root },
  entry:              { link: ROUTES.eingangssysteme.root },
  signage:            { link: ROUTES.gebaeudekommunikation.beschilderung },
  solutions:          { link: ROUTES.anwendungen.objektloesungen },
  gebaeudemanagement: {},
};

interface Props {
  sectionKey: string;        // z.B. "block_communication"
  positionIndex: number;     // Position innerhalb der Lösungsblöcke (für Bild links/rechts)
  pageKey?: string;
}

const ContentBlockItem: React.FC<Props> = ({ sectionKey, positionIndex, pageKey = "home.start" }) => {
  const { t, i18n } = useTranslation("home");
  const cms = useCmsPageContent(pageKey);
  const loc = normalizeLocale(i18n.language);

  const blockKey = sectionKey.replace(/^block_/, "") as BlockKey;
  // Bekannter Vorlage-Block (eigene Defaults für Bild + interner Link)
  // ODER unbekannter Block-Key (z. B. duplizierter Block „block_entry_kopie"):
  // dann nur CMS-Inhalte rendern, ohne Fallback-Bild und ohne festen Link.
  const meta: BlockMeta | undefined = BLOCK_META[blockKey];

  const ctaDefault =
    cms.text("content_blocks_intro", "cta_default", loc) ||
    cms.text("content_blocks", "cta_default", loc, t("contentBlocks.cta"));

  const labelLegacy =
    cms.text(sectionKey, "label", loc) ||
    (meta
      ? cms.text("content_blocks", `${blockKey}_label`, loc, t(`contentBlocks.items.${blockKey}.label`))
      : "");
  const headlineLegacy =
    cms.text(sectionKey, "headline", loc) ||
    (meta
      ? cms.text("content_blocks", `${blockKey}_headline`, loc, t(`contentBlocks.items.${blockKey}.headline`))
      : "");
  const textLegacy =
    cms.text(sectionKey, "text", loc) ||
    (meta
      ? cms.text("content_blocks", `${blockKey}_text`, loc, t(`contentBlocks.items.${blockKey}.text`))
      : "");
  const itemCta =
    cms.text(sectionKey, "cta", loc) ||
    (meta
      ? cms.text("content_blocks", `${blockKey}_cta`, loc, t(`contentBlocks.items.${blockKey}.cta`, { defaultValue: "" }))
      : "");
  const ctaLabel = itemCta || ctaDefault;

  // DB-first (Tranche 7d): Felder aus `contentBlocks_item_<blockKey>` (card_v1)
  // bevorzugen, sonst Legacy aus block_*-Section bzw. content_blocks/i18n.
  const label = txChildField(cms, loc, "contentBlocks", blockKey, "subtitle", labelLegacy);
  const headline = txChildField(cms, loc, "contentBlocks", blockKey, "title", headlineLegacy);
  const text = txChildField(cms, loc, "contentBlocks", blockKey, "description", textLegacy);


  // CTA-Ziel: erst CMS-Feld `cta_link` (im Admin pflegbar), dann Code-Vorlage,
  // sonst Fallback-Anker auf Kontaktbereich. Damit haben auch duplizierte Blöcke
  // (z. B. „block_entry_kopie") ein sinnvolles Ziel, sobald es im Admin gepflegt wird.
  const cmsLink = cms.text(sectionKey, "cta_link", loc).trim();
  const ctaHref = cmsLink || meta?.link || "#kontakt";
  const isInternal = ctaHref.startsWith("/");

  const assetSet = cms.assetSet(sectionKey, "image");
  const fallbackUrl = meta ? cms.asset("content_blocks", `image_${blockKey}`, "") : "";
  const imgDesktop = assetSet.desktop ?? assetSet.any ?? fallbackUrl;
  const imgTablet = assetSet.tablet ?? imgDesktop;
  const imgMobile = assetSet.mobile ?? imgTablet;
  const imageSrc = imgDesktop;
  const imageAlt =
    cms.assetAlt(sectionKey, "image", loc) ||
    (meta ? cms.assetAlt("content_blocks", `image_${blockKey}`, loc, headline) : headline);

  // Wenn weder Vorlage-Meta noch ein eigener Inhalt vorhanden sind:
  // gar nichts rendern (z. B. komplett leerer, neu erstellter Block).
  if (!meta && !headline && !text && !imageSrc) return null;

  const i = positionIndex;

  return (
    <section data-cms-section={sectionKey}>
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="grid lg:grid-cols-2 gap-0 border-t border-border"
        >
          {/* Mobil: immer Text zuerst, dann Bild. Desktop: abwechselnd via lg:order */}
          <div className={`order-2 flex flex-col justify-center p-8 lg:p-16 ${i % 2 === 1 ? "lg:order-2" : "lg:order-1"}`}>
            <span className="text-xs text-muted-foreground tracking-wide mb-4 block">{label}</span>
            <h3 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-5 leading-tight">
              {headline}
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-8 text-sm">{text}</p>
            {isInternal ? (
              <Link
                to={ctaHref}
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors group/link"
              >
                {ctaLabel}
                <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </Link>
            ) : (
              <a
                href={ctaHref}
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors group/link"
              >
                {ctaLabel}
                <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </a>
            )}
          </div>

          <div className={`order-1 ${i % 2 === 1 ? "lg:order-1" : "lg:order-2"}`}>
            <div className="overflow-hidden" data-cms-field="image">
              {imageSrc ? (
                <picture>
                  <source media="(max-width: 767px)" srcSet={imgMobile} />
                  <source media="(max-width: 1023px)" srcSet={imgTablet} />
                  <img
                    src={imgDesktop}
                    alt={imageAlt}
                    loading="lazy"
                    className="block w-full h-auto transition-transform duration-700 hover:scale-[1.03]"
                  />
                </picture>
              ) : (
                <div
                  className="w-full aspect-[4/3] bg-muted flex items-center justify-center text-xs text-muted-foreground"
                  aria-label={t("common:ui.noImage")}
                >
                  {t("common:ui.noImage")}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContentBlockItem;
