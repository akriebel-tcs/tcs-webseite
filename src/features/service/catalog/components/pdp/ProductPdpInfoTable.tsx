import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";

/**
 * Abschnitt „Produktinformationen".
 *
 * Kleine Tabelle mit Bezeichnung, Art.-Nr. und Preis/Stk. Diese Werte
 * stammen 1:1 aus dem RPC-Payload (Bezeichnung = Headline/Kurzbeschreibung,
 * Art.-Nr. = `artikel_nr`, Preis = formatierter Listenpreis). Wenn keine
 * sinnvollen Daten vorhanden sind, wird der Abschnitt vom Aufrufer
 * ausgeblendet.
 *
 * Der Warenkorb-Button ist hier ein **deaktivierter Platzhalter**. Es wird
 * keine Shop-Funktion eingeführt.
 */

interface Props {
  readonly description: string | null;
  readonly artikelNr: string | null;
  readonly priceFormatted: string | null;
}

export default function ProductPdpInfoTable({
  description,
  artikelNr,
  priceFormatted,
}: Props) {
  const { t } = useTranslation("service");

  // Sinnvoll nur, wenn mindestens Art.-Nr. + (Bezeichnung oder Preis) da sind.
  if (!artikelNr || (!description && !priceFormatted)) return null;

  return (
    <section aria-labelledby="pdp-info-heading" className="space-y-4">
      <h2
        id="pdp-info-heading"
        className="text-lg font-heading font-semibold text-foreground"
      >
        {t("katalog.pdp.sections.info")}
      </h2>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_8rem_8rem_3rem] items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40">
          <div>{t("katalog.pdp.info.cols.description")}</div>
          <div>{t("katalog.pdp.info.cols.artikelNr")}</div>
          <div>{t("katalog.pdp.info.cols.price")}</div>
          <div className="sr-only">{t("katalog.pdp.cart.label")}</div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_8rem_8rem_3rem] items-center gap-3 px-4 py-3 text-sm">
          <div className="text-foreground/90 truncate" title={description ?? ""}>
            {description ?? ""}
          </div>
          <div className="text-foreground">{artikelNr}</div>
          <div className="text-foreground whitespace-nowrap">
            {priceFormatted ?? ""}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label={t("katalog.pdp.cart.label")}
              title={t("katalog.pdp.cart.disabledHint")}
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border text-muted-foreground opacity-60 cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
