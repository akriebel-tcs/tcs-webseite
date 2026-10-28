import { useTranslation } from "react-i18next";
import { ChevronRight, Package } from "lucide-react";
import type { PaketKomponenteItem } from "./types";

/**
 * Paket-Komponenten-Übersicht.
 *
 * Quelle: ausschließlich `api_v1_paket_komponenten` (read-only,
 * nur aktive Komponenten, keine Frontend-Heuristik).
 *
 * Wenn `onSelect` gesetzt ist, werden die Zeilen klickbar und öffnen
 * die PDP der Einzelkomponente als Slide-in-Overlay im Eltern-Modal.
 */

interface Props {
  readonly components: readonly PaketKomponenteItem[];
  readonly onSelect?: (artikelNr: string) => void;
}

export default function ProductPdpPaketKomponenten({
  components,
  onSelect,
}: Props) {
  const { t } = useTranslation("service");
  if (components.length === 0) return null;

  const clickable = typeof onSelect === "function";

  return (
    <section aria-labelledby="pdp-paket-heading" className="space-y-4">
      <h2
        id="pdp-paket-heading"
        className="text-lg font-heading font-semibold text-foreground inline-flex items-center gap-2"
      >
        <Package className="w-5 h-5 text-accent" aria-hidden="true" />
        {t("katalog.pdp.sections.paketKomponenten")}
      </h2>

      <ul className="space-y-2">
        {components.map((c) => {
          const canClick = clickable && !!c.artikelNr;
          const rolle = c.rolle ?? "—";
          const anzahl = c.anzahl !== null ? c.anzahl : null;
          const inner = (
            <div className="flex items-start gap-3 w-full">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span className="capitalize">{rolle}</span>
                  {anzahl !== null && anzahl > 1 ? (
                    <span className="ml-1 normal-case tracking-normal">
                      × {anzahl}
                    </span>
                  ) : null}
                </div>
                <div
                  className="text-sm text-foreground leading-snug break-words"
                  title={c.title ?? ""}
                >
                  {c.title ?? "—"}
                </div>
                {c.artikelNr ? (
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {c.artikelNr}
                  </div>
                ) : null}
              </div>
              {canClick ? (
                <ChevronRight
                  className="w-4 h-4 text-muted-foreground shrink-0 mt-1"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
          return (
            <li key={c.key}>
              {canClick ? (
                <button
                  type="button"
                  onClick={() => onSelect!(c.artikelNr!)}
                  className="w-full text-left rounded-md border border-border bg-card px-3 py-2.5 hover:bg-muted/40 focus:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                >
                  {inner}
                </button>
              ) : (
                <div className="rounded-md border border-border bg-card px-3 py-2.5">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
