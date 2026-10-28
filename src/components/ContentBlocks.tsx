import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/navigation/routes";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";

/**
 * Content-Blöcke der Startseite.
 *
 * Etappe J.3: Jeder Block ist jetzt eine eigene CMS-Section
 * (`block_communication`, `block_access`, …). Die Reihenfolge wird aus
 * `cms_sections.sort_order` gelesen — Redaktion kann sie im Admin
 * verschieben. Bilder hängen direkt an der jeweiligen Section
 * (`field_key = 'image'`). i18n bleibt als Fallback erhalten.
 *
 * Bilder: Wenn die Redaktion KEIN CMS-Bild gepflegt hat, greift der Code-
 * Fallback mit dedizierten Mobile-/Tablet-/Desktop-Assets (responsives
 * <picture>). Sobald die Redaktion ein Bild hinterlegt, wird dieses überall
 * gespielt (eine Datei für alle Breiten).
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

/** Fallback-Reihenfolge, falls CMS keine Sections liefert (z. B. unpublished). */
const FALLBACK_ORDER: BlockKey[] = [
  "communication",
  "access",
  "entry",
  "signage",
  "solutions",
  "gebaeudemanagement",
];

const SECTION_PREFIX = "block_";

interface Props {
  pageKey?: string;
}

const ContentBlocks: React.FC<Props> = ({ pageKey = "home.start" }) => {
  const { t, i18n } = useTranslation("home");
  const cms = useCmsPageContent(pageKey);
  const loc = normalizeLocale(i18n.language);

  // Intro: zuerst neue Section content_blocks_intro, dann (Migrations-Sicherheit)
  // alte Section content_blocks, dann i18n-Fallback.
  const sectionHeadline =
    cms.text("content_blocks_intro", "headline", loc) ||
    cms.text("content_blocks", "headline", loc, t("contentBlocks.headline"));
  const sectionIntro =
    cms.text("content_blocks_intro", "intro", loc) ||
    cms.text("content_blocks", "intro", loc, t("contentBlocks.intro"));
  const ctaDefault =
    cms.text("content_blocks_intro", "cta_default", loc) ||
    cms.text("content_blocks", "cta_default", loc, t("contentBlocks.cta"));

  // Reihenfolge aus CMS-Sections ermitteln (sort_order). Nur block_*-Sections.
  const cmsBlockKeys = cms.sections
    .map((s) => s.section_key)
    .filter((k) => k.startsWith(SECTION_PREFIX))
    .map((k) => k.slice(SECTION_PREFIX.length) as BlockKey)
    .filter((k): k is BlockKey => k in BLOCK_META);

  const orderedBlocks: BlockKey[] = cmsBlockKeys.length > 0 ? cmsBlockKeys : FALLBACK_ORDER;

  return (
    <section className="py-20 lg:py-28" id="loesungen">
      <div className="container mx-auto">
        <div data-cms-section="content_blocks_intro" className="mb-16 lg:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-heading font-normal text-foreground leading-tight max-w-2xl">
            {sectionHeadline}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-xl text-base">{sectionIntro}</p>
        </div>

        <div className="space-y-0">
          {orderedBlocks.map((blockKey, i) => {
            const meta = BLOCK_META[blockKey];
            const sectionKey = `${SECTION_PREFIX}${blockKey}`;

            // Pro Feld: neue Per-Section-Struktur → alte Sammel-Section → i18n.
            const label =
              cms.text(sectionKey, "label", loc) ||
              cms.text("content_blocks", `${blockKey}_label`, loc,
                t(`contentBlocks.items.${blockKey}.label`));
            const headline =
              cms.text(sectionKey, "headline", loc) ||
              cms.text("content_blocks", `${blockKey}_headline`, loc,
                t(`contentBlocks.items.${blockKey}.headline`));
            const text =
              cms.text(sectionKey, "text", loc) ||
              cms.text("content_blocks", `${blockKey}_text`, loc,
                t(`contentBlocks.items.${blockKey}.text`));
            const itemCta =
              cms.text(sectionKey, "cta", loc) ||
              cms.text("content_blocks", `${blockKey}_cta`, loc,
                t(`contentBlocks.items.${blockKey}.cta`, { defaultValue: "" }));
            const ctaLabel = itemCta || ctaDefault;

            // Bild-Set aus DB (mobile/tablet/desktop). DB-first, kein Code-Fallback.
            // Legacy: alte Sammel-Section content_blocks/image_<key> als Notausgang.
            const dbSet = cms.assetSet(sectionKey, "image");
            const legacy = cms.asset("content_blocks", `image_${blockKey}`, "");
            const desktopSrc = dbSet.desktop ?? dbSet.any ?? legacy;
            const tabletSrc  = dbSet.tablet  ?? desktopSrc;
            const mobileSrc  = dbSet.mobile  ?? tabletSrc;
            const imageAlt =
              cms.assetAlt(sectionKey, "image", loc) ||
              cms.assetAlt("content_blocks", `image_${blockKey}`, loc, headline);
            const imgClass = "w-full h-auto md:h-80 lg:h-[420px] object-cover transition-transform duration-700 hover:scale-[1.03]";

            return (
              <motion.div
                key={blockKey}
                data-cms-section={sectionKey}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
                className="grid lg:grid-cols-2 gap-0 border-t border-border"
              >
                <div className={`${i % 2 === 1 ? "lg:order-2" : ""}`}>
                  <div className="overflow-hidden" data-cms-field="image">
                    <picture>
                      <source media="(min-width: 1024px)" srcSet={desktopSrc} />
                      <source media="(min-width: 640px)" srcSet={tabletSrc} />
                      <img
                        src={mobileSrc}
                        alt={imageAlt}
                        loading="lazy"
                        width={800}
                        height={600}
                        className={imgClass}
                      />
                    </picture>
                  </div>
                </div>

                <div className={`flex flex-col justify-center p-8 lg:p-16 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                  <span className="text-xs text-muted-foreground tracking-wide mb-4 block">{label}</span>
                  <h3 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-5 leading-tight">
                    {headline}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-8 text-sm">{text}</p>
                  {meta.link ? (
                    <Link
                      to={meta.link}
                      className="inline-flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors group/link"
                    >
                      {ctaLabel}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                  ) : (
                    <a
                      href="#kontakt"
                      className="inline-flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors group/link"
                    >
                      {ctaLabel}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContentBlocks;
