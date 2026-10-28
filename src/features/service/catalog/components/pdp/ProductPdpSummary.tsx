import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FeatureItem, ImageItem } from "./types";

/**
 * Produktdetails-Bereich der PDP.
 *
 *  - links: großes Produktbild aus `images[]` (plus optional Thumbnails)
 *  - rechts: Kurzbeschreibung, Beschreibung, Leistungsmerkmale,
 *    Badges/Tags und – nur wenn aus dem RPC vorhanden – die kleinen
 *    Zusatzinfos Lieferzeit / Garantie.
 *
 * Es werden keine Werte erfunden. Fehlt ein Block, wird er ausgeblendet.
 */

interface Props {
  readonly headline: string | null;
  readonly artikelNr: string | null;
  readonly shortDesc: string | null;
  readonly longDesc: string | null;
  readonly features: readonly FeatureItem[];
  readonly badges: readonly string[];
  readonly images: readonly ImageItem[];
  readonly deliveryTime: string | null;
  readonly warranty: string | null;
}

export default function ProductPdpSummary({
  headline,
  artikelNr,
  shortDesc,
  longDesc,
  features,
  badges,
  images,
  deliveryTime,
  warranty,
}: Props) {
  const { t } = useTranslation("service");

  return (
    <section aria-labelledby="pdp-details-heading" className="space-y-6">
      <h2
        id="pdp-details-heading"
        className="text-lg font-heading font-semibold text-foreground"
      >
        {t("katalog.pdp.sections.details")}
      </h2>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Bildbereich */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <div className="aspect-[4/3] w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
            {images[0] ? (
              <img
                src={images[0].url}
                alt={images[0].alt ?? headline ?? artikelNr ?? ""}
                className="w-full h-full object-contain"
                loading="eager"
              />
            ) : (
              <Package
                className="w-12 h-12 text-muted-foreground/60"
                aria-hidden="true"
              />
            )}
          </div>

          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1, 9).map((img) => (
                <div
                  key={img.key}
                  className="aspect-square bg-muted rounded overflow-hidden"
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? ""}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {images.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("katalog.pdp.empty.images")}
            </p>
          ) : null}
        </motion.div>

        {/* Beschreibung + Features + Badges + Zusatzinfos */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="space-y-5"
        >
          {shortDesc ? (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {shortDesc}
            </p>
          ) : null}

          {features.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                {t("katalog.pdp.sections.features")}:
              </p>
              <ul className="space-y-1.5 pl-1">
                {features.map((f) => (
                  <li key={f.key} className="flex gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground select-none"
                    >
                      ›
                    </span>
                    <span className="text-foreground/90">
                      {f.label}
                      {f.description ? (
                        <span className="text-muted-foreground">
                          {" "}
                          – {f.description}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {badges.slice(0, 8).map((b, i) => (
                <Badge
                  key={`${b}-${i}`}
                  variant="secondary"
                  className="text-[11px]"
                >
                  {b}
                </Badge>
              ))}
            </div>
          ) : null}


          {deliveryTime || warranty ? (
            <p className="text-xs text-muted-foreground">
              {deliveryTime ? (
                <span>
                  {t("katalog.pdp.summary.deliveryTime")}: {deliveryTime}
                </span>
              ) : null}
              {deliveryTime && warranty ? <span>  ·  </span> : null}
              {warranty ? (
                <span>
                  {t("katalog.pdp.summary.warranty")}: {warranty}
                </span>
              ) : null}
            </p>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
