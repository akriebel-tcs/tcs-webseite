import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

/**
 * Produktkopf der PDP – orientiert sich an der Zielstruktur:
 *  - kleine Kategorie-/Bereichszeile (Eyebrow), falls vorhanden
 *  - große Artikelnummer
 *  - Produktname / Subline
 *  - rechts: Preis und ein sachlicher CTA „Produkt anfragen", der auf
 *    die bestehende Kontakt-Route `/kontakt` führt. Es gibt keinen
 *    Warenkorb / Shop-Endpunkt im DB-Manifest.
 *
 * Es werden ausschließlich Werte angezeigt, die übergeben werden. Leere
 * Werte werden ausgeblendet.
 */

interface Props {
  readonly eyebrow: string | null;
  readonly artikelNr: string | null;
  readonly headline: string | null;
  readonly subheadline: string | null;
  readonly priceFormatted: string | null;
}

export default function ProductPdpHeader({
  eyebrow,
  artikelNr,
  headline,
  subheadline,
  priceFormatted,
}: Props) {
  const { t } = useTranslation("service");

  const hasAnyText = eyebrow || artikelNr || headline || subheadline;
  if (!hasAnyText && !priceFormatted) return null;

  const inquiryHref = artikelNr
    ? `/kontakt?artikel=${encodeURIComponent(artikelNr)}`
    : "/kontakt";

  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1.5 min-w-0">
        {eyebrow ? (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}

        {artikelNr ? (
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground leading-tight break-words">
            {artikelNr}
          </h1>
        ) : headline ? (
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground leading-tight break-words">
            {headline}
          </h1>
        ) : null}

        {artikelNr && headline ? (
          <p className="text-sm md:text-base text-muted-foreground">
            {headline}
          </p>
        ) : null}

        {subheadline && subheadline !== headline ? (
          <p className="text-sm text-muted-foreground">{subheadline}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {priceFormatted ? (
          <div className="text-lg md:text-xl font-semibold text-foreground whitespace-nowrap">
            {priceFormatted}
          </div>
        ) : null}
        <Link
          to={inquiryHref}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          {t("katalog.pdp.inquiry.label")}
        </Link>
      </div>
    </header>
  );
}
