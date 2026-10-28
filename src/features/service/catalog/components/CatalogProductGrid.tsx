import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Bookmark, BookmarkCheck, Package } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CatalogProduct } from "../types";
import ProductPdpModal from "./ProductPdpModal";
import { useMerkliste, MERKLISTE_MAX } from "@/features/produkte/merkliste/useMerkliste";
import {
  normalizeProductLocale,
  pickProductLocalized,
  productIntlLocale,
} from "../lib/productLocale";

interface CatalogProductGridProps {
  products: readonly CatalogProduct[];
}

/**
 * Produktraster.
 *
 * Etappe `catalog-supabase-readonly-1`:
 *  - Bildquelle ausschließlich `primary_image_public_url` aus dem Listing.
 *    Fehlt sie, wird ein neutraler Platzhalter gerendert. KEINE Storage-/
 *    Bucket-Heuristik, KEIN direkter Zugriff auf interne Tabellen.
 *  - PDP-Link nutzt `pdp_slug` (führend, RPC `rpc_get_product_listing`),
 *    sonst `pdp_artikel_nr`/`artikel_nr`. Spaltenmodell wird nicht mehr
 *    benötigt; das Listing der RPC ist die führende Quelle.
 */

function asDisplayString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length ? t : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatPrice(
  amount: unknown,
  currency: unknown,
  locale: string,
): string | null {
  const value = asNumber(amount);
  if (value === null) return null;
  const cur = asDisplayString(currency);
  try {
    if (cur) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: cur,
        currencyDisplay: "code",
      }).format(value);
    }
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
      value,
    );
  } catch {
    return String(value);
  }
}

function readBadges(value: unknown, locale: string): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push(t);
    } else if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      // Sprachwahl zentral: angefordert → en → de, inklusive Sprachmarker
      // (`label_locale`) der Kanal-RPCs.
      const localized = pickProductLocalized(rec, "label", locale);
      const label =
        localized ??
        asDisplayString(rec.label) ??
        asDisplayString(rec.text) ??
        asDisplayString(rec.title) ??
        asDisplayString(rec.name);
      if (label) out.push(label);
    }
  }
  return out;
}

const CatalogProductGrid = ({ products }: CatalogProductGridProps) => {
  const { t, i18n } = useTranslation("service");
  const { has, add, remove } = useMerkliste();
  const badgeLocale = normalizeProductLocale(i18n.language);
  const locale = productIntlLocale(badgeLocale);

  const [openProduct, setOpenProduct] = useState<{
    artikelNr: string | null;
    slug: string | null;
  } | null>(null);

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product, idx) => {
          const artikelNr = asDisplayString(product.artikel_nr);
          const title = asDisplayString(product.title) ?? artikelNr;
          const subtitleRaw = asDisplayString(product.teaser);
          const subtitle =
            subtitleRaw && subtitleRaw !== title ? subtitleRaw : null;

          const price = formatPrice(product.preis, product.waehrung, locale);
          const badges = readBadges(product.badges, badgeLocale);
          const imageUrl =
            asDisplayString(product.primary_image_public_url) ??
            asDisplayString(product.primary_image_url);

          const pdpSlug = asDisplayString(product.pdp_slug);
          const canOpen = !!(artikelNr || pdpSlug);
          const key = artikelNr ?? `row-${idx}`;

          return (
            <button
              key={key}
              type="button"
              onClick={
                canOpen
                  ? () =>
                      setOpenProduct({
                        artikelNr,
                        slug: pdpSlug,
                      })
                  : undefined
              }
              disabled={!canOpen}
              className="text-left block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default"
              aria-label={
                title
                  ? t("katalog.v2.card.openDetailsAria", { title })
                  : t("katalog.v2.card.openDetails")
              }
            >
              <Card
                className={
                  "overflow-hidden border-border bg-card flex flex-col h-full transition-all" +
                  (canOpen
                    ? " hover:shadow-elevated hover:border-accent/50 cursor-pointer"
                    : " hover:shadow-elevated")
                }
              >
                <div className="relative aspect-[4/3] w-full bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border/60">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={title ?? artikelNr ?? ""}
                      loading="lazy"
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <Package
                      className="w-10 h-10 text-muted-foreground/50"
                      aria-hidden="true"
                    />
                  )}
                  {artikelNr ? (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={
                        has(artikelNr)
                          ? "Von Merkliste entfernen"
                          : "Zur Merkliste hinzufügen"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (has(artikelNr)) {
                          remove(artikelNr);
                          toast.success("Von Merkliste entfernt");
                          return;
                        }
                        const r = add({
                          artikel_nr: artikelNr,
                          slug: pdpSlug,
                          title,
                          teaser: subtitle,
                          image_url: imageUrl,
                        });
                        if (r === "added") toast.success("Zur Merkliste hinzugefügt");
                        else if (r === "full")
                          toast.error(
                            `Maximal ${MERKLISTE_MAX} Produkte können verglichen werden.`,
                          );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).click();
                        }
                      }}
                      className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/90 backdrop-blur text-foreground hover:bg-background shadow-sm cursor-pointer"
                    >
                      {has(artikelNr) ? (
                        <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Bookmark className="w-4 h-4" aria-hidden="true" />
                      )}
                    </span>
                  ) : null}
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  {artikelNr ? (
                    <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                      {artikelNr}
                    </div>
                  ) : null}

                  {title ? (
                    <h3 className="font-heading font-semibold text-foreground text-base leading-snug line-clamp-2">
                      {title}
                    </h3>
                  ) : null}

                  {subtitle ? (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {subtitle}
                    </p>
                  ) : null}

                  {badges.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {badges.slice(0, 3).map((b, i) => (
                        <Badge
                          key={`${b}-${i}`}
                          variant="secondary"
                          className="text-[10px] font-normal px-2 py-0.5"
                        >
                          {b}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {price || canOpen ? (
                    <div className="mt-auto pt-3 flex items-end justify-between gap-2 border-t border-border/60">
                      {price ? (
                        <div className="text-sm font-semibold text-foreground">
                          {price}
                        </div>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      {canOpen ? (
                        <span className="inline-flex items-center gap-1 text-xs text-accent">
                          {t("katalog.v2.card.openDetails")}
                          <ArrowRight
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          />
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <ProductPdpModal
        open={openProduct !== null}
        artikelNr={openProduct?.artikelNr ?? null}
        slug={openProduct?.slug ?? null}
        onOpenChange={(o) => {
          if (!o) setOpenProduct(null);
        }}
      />
    </>
  );
};

export default CatalogProductGrid;
