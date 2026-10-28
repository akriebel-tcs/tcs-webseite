/**
 * Merkliste-Seite — zeigt die lokal (localStorage) gemerkten Produkte,
 * erlaubt das Entfernen, einen technischen Vergleich (Spalten = Produkte,
 * Zeilen = Merkmale) und das Starten einer gebündelten Produktanfrage.
 *
 * Datenquelle für den Vergleich ist ausschließlich der Kanalvertrag
 * `rpc_get_channel_product_pdp` (technische Daten aus
 * `pdp.technical_specs_display`). Es werden keine Produktdaten geschrieben,
 * kein neuer Datenstrom, keine CMS-Light-Änderung. Fehlende Werte
 * erscheinen als „–".
 */
import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Mail, Package, Trash2 } from "lucide-react";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import { Button } from "@/components/ui/button";
import { useMerkliste, MERKLISTE_MAX } from "./useMerkliste";
import { useMerklisteProducts } from "./useMerklisteProducts";
import { readSpecGroups } from "@/features/service/catalog/lib/pdpReaders";
import type { SpecGroup } from "@/features/service/catalog/components/pdp/types";

interface ProductSpecData {
  artikel_nr: string;
  groups: SpecGroup[];
}

export default function MerklistePage() {
  const { t, i18n } = useTranslation("service");
  // Sprachcode wird unveraendert an den Kanalvertrag der Produktdatenbank
  // durchgereicht; deren Fallback entscheidet, welche Sprache geliefert wird.
  const locale = i18n.language ?? "de";
  const { items, remove, clear } = useMerkliste();
  const [showCompare, setShowCompare] = useState(false);
  // Titel/Kurztexte und technische Daten kommen aus derselben, parallel
  // geladenen PDP-Antwortmenge — keine zweite Aufruffolge.
  const { byArtikel, loading: loadingProducts } = useMerklisteProducts(items, locale);

  const titleOf = (it: (typeof items)[number]) =>
    byArtikel.get(it.artikel_nr)?.title ?? it.title ?? it.artikel_nr;
  const teaserOf = (it: (typeof items)[number]) =>
    byArtikel.get(it.artikel_nr)?.teaser ?? it.teaser ?? null;

  const specData: ProductSpecData[] = useMemo(
    () =>
      items.map((it) => ({
        artikel_nr: it.artikel_nr,
        groups: readSpecGroups(byArtikel.get(it.artikel_nr)?.payload ?? null),
      })),
    [items, byArtikel],
  );
  const loadingSpecs = loadingProducts && byArtikel.size === 0;

  // Zeilen für die Vergleichstabelle:
  // Schlüssel = `${groupLabel ?? ""}|${specLabel}`, Wert pro Produkt = SpecValue oder „–".
  const compareRows = useMemo(() => {
    type Row = { groupLabel: string | null; label: string; values: (string | null)[] };
    const rowMap = new Map<string, Row>();
    const order: string[] = [];
    specData.forEach((prod, prodIdx) => {
      for (const g of prod.groups) {
        for (const s of g.items) {
          const key = `${g.label ?? ""}::${s.label}`;
          let row = rowMap.get(key);
          if (!row) {
            row = {
              groupLabel: g.label,
              label: s.label,
              values: new Array(specData.length).fill(null),
            };
            rowMap.set(key, row);
            order.push(key);
          }
          row.values[prodIdx] = s.value;
        }
      }
    });
    return order.map((k) => rowMap.get(k)!);
  }, [specData]);

  const inquiryHref = items.length
    ? `/kontakt?artikel=${encodeURIComponent(items.map((i) => i.artikel_nr).join(","))}`
    : "/kontakt";

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <AutoBreadcrumb />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground">
            {t("katalog.merkliste.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
{t("katalog.merkliste.intro", { max: MERKLISTE_MAX })}
          </p>
        </div>
        <Link
          to="/produkte/tuerkommunikation"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t("katalog.merkliste.backToCatalog")}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <Package className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" aria-hidden="true" />
          <p className="text-foreground font-medium mb-1">{t("katalog.merkliste.emptyTitle")}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {t("katalog.merkliste.emptyHint")}
          </p>
          <Link
            to="/produkte/tuerkommunikation"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            {t("katalog.merkliste.toCatalog")}
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3 mb-6">
            {items.map((it) => {
              const pdpHref = it.slug
                ? `/produkte/tuerkommunikation/${encodeURIComponent(it.slug)}`
                : `/produkte/tuerkommunikation/${encodeURIComponent(it.artikel_nr)}`;
              return (
                <li
                  key={it.artikel_nr}
                  className="flex items-center gap-4 rounded-md border border-border bg-card p-3"
                >
                  <div className="w-20 h-20 shrink-0 bg-muted/40 rounded flex items-center justify-center overflow-hidden border border-border/60">
                    {it.image_url ? (
                      <img
                        src={it.image_url}
                        alt={titleOf(it)}
                        className="w-full h-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground/60" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                      {it.artikel_nr}
                    </p>
                    <Link
                      to={pdpHref}
                      className="font-medium text-foreground hover:text-accent transition-colors line-clamp-1"
                    >
                      {titleOf(it)}
                    </Link>
                    {teaserOf(it) ? (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {teaserOf(it)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(it.artikel_nr)}
                    aria-label={t("katalog.merkliste.removeItem", { artikel: it.artikel_nr })}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              type="button"
              variant={showCompare ? "secondary" : "default"}
              onClick={() => setShowCompare((v) => !v)}
              disabled={items.length < 2}
            >
              {showCompare ? t("katalog.merkliste.compareHide") : t("katalog.merkliste.compareShow")}
            </Button>
            <Link
              to={inquiryHref}
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              {t("katalog.merkliste.inquiry")}
            </Link>
            <button
              type="button"
              onClick={clear}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline ml-auto"
            >
              {t("katalog.merkliste.clear")}
            </button>
          </div>

          {items.length < 2 ? (
            <p className="text-xs text-muted-foreground">
              {t("katalog.merkliste.minTwo")}
            </p>
          ) : null}

          {showCompare ? (
            <section
              aria-labelledby="merkliste-vergleich-heading"
              className="rounded-md border border-border bg-card overflow-hidden"
            >
              <h2
                id="merkliste-vergleich-heading"
                className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground"
              >
                {t("katalog.merkliste.compareHeading")}
              </h2>
              {loadingSpecs ? (
                <p className="p-4 text-sm text-muted-foreground">{t("katalog.merkliste.loadingSpecs")}</p>
              ) : compareRows.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {t("katalog.merkliste.noSpecs")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left font-medium text-muted-foreground px-4 py-2 sticky left-0 bg-muted/40 z-10 w-[14rem]">
                          {t("katalog.merkliste.feature")}
                        </th>
                        {items.map((it) => (
                          <th
                            key={it.artikel_nr}
                            className="text-left font-medium text-foreground px-4 py-2 border-l border-border min-w-[10rem]"
                          >
                            <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                              {it.artikel_nr}
                            </div>
                            <div className="line-clamp-2">{titleOf(it)}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.map((row, i) => {
                        const showGroup =
                          row.groupLabel &&
                          (i === 0 || compareRows[i - 1].groupLabel !== row.groupLabel);
                        return (
                          <Fragment key={i}>
                            {showGroup ? (
                              <tr>
                                <td
                                  colSpan={items.length + 1}
                                  className="px-4 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/20 border-t border-border"
                                >
                                  {row.groupLabel}
                                </td>
                              </tr>
                            ) : null}
                            <tr className="border-t border-border">
                              <td className="px-4 py-2 text-muted-foreground sticky left-0 bg-card">
                                {row.label}
                              </td>
                              {row.values.map((v, j) => (
                                <td
                                  key={j}
                                  className="px-4 py-2 text-foreground border-l border-border align-top"
                                >
                                  {v ?? <span className="text-muted-foreground">–</span>}
                                </td>
                              ))}
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
