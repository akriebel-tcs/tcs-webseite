import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Printer, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadProductDatasheetLocalized } from "../api/pdp";
import {
  loadDatasheetBrandProfile,
  TCS_BRAND_PROFILE_KEY,
  type BrandProfileOutcome,
} from "../api/datasheetBrandProfile";
import { normalizeProductLocale, productIntlLocale } from "../lib/productLocale";
import {
  contentSignature,
  DatasheetPrintFrame,
  DatasheetSheet,
  normalizeDatasheet,
  printDatasheet,
  type ContractBadge,
  type ContractDatasheet,
  type DatasheetBrandProfile,
  type NormalizedDatasheet,
} from "@/shared/datasheet";
import {
  datasheetDocumentTitle,
  readContractFileName,
} from "./datasheetFileName";
import tcsLogoFallback from "@/assets/logo-tcs.png";
import "./datasheetPrint.css";

/**
 * Website-Datenblatt: schmaler Adapter auf das gemeinsame, portable Modul
 * `@/shared/datasheet`. Hier wird nichts nachgebaut.
 *
 * Inhalt kommt ausschließlich aus
 * `rpc_get_channel_product_datasheet('datenblatt_de', …).datasheet`
 * (Vertrag `datasheet-contract-2.0`); das Markenprofil (Logo, Farben, Firmen-
 * und Kontaktdaten, Fußzeilentext) kommt aus
 * `rpc_get_datasheet_brand_profile({ p_profile_key: … })`. Seitengröße,
 * Seitenumbrüche, Innenabstände, Fußzeilenposition und Dateiname steuert das
 * gemeinsame Modul bzw. dieser Host — nicht die Datenbank.
 */

interface Props {
  readonly open: boolean;
  readonly artikelNr: string | null;
  readonly onOpenChange: (open: boolean) => void;
}

type State =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | { readonly phase: "empty" }
  | { readonly phase: "error"; readonly message: string }
  | { readonly phase: "brandBlocked"; readonly outcome: BrandProfileOutcome }
  | {
      readonly phase: "ready";
      readonly key: string;
      readonly sheet: NormalizedDatasheet;
      readonly brand: DatasheetBrandProfile;
      /** Artikelbezogener Dateiname aus dem Vertrag (`branding.file_name`). */
      readonly contractFileName: string | null;
    };

export default function ProductDatasheetModal({
  open,
  artikelNr,
  onOpenChange,
}: Props) {
  const { t, i18n } = useTranslation("service");
  const locale = normalizeProductLocale(i18n.language);
  const intlLocale = productIntlLocale(locale);
  const [state, setState] = useState<State>({ phase: "idle" });
  const [printState, setPrintState] = useState<
    { phase: "idle" } | { phase: "busy" } | { phase: "failed" }
  >({ phase: "idle" });
  const [reloadToken, setReloadToken] = useState(0);

  // Aktueller Artikel und aktuelle Sprache: gedruckt wird nur, was dazu passt.
  const requestKey = artikelNr ? `${artikelNr}|${locale}` : null;

  useEffect(() => {
    if (!open || !artikelNr || !requestKey) {
      setState({ phase: "idle" });
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setState({ phase: "loading" });
    setPrintState({ phase: "idle" });

    (async () => {
      try {
        const [resolution, brandOutcome] = await Promise.all([
          loadProductDatasheetLocalized(locale, artikelNr),
          loadDatasheetBrandProfile(TCS_BRAND_PROFILE_KEY, {
            signal: controller.signal,
            force: reloadToken > 0,
          }),
        ]);
        if (cancelled) return;

        const raw = resolution.value as ContractDatasheet | null;
        const sheet = normalizeDatasheet(raw);
        if (!sheet) {
          setState({ phase: "empty" });
          return;
        }
        if (brandOutcome.status !== "ok") {
          setState({ phase: "brandBlocked", outcome: brandOutcome });
          return;
        }
        setState({
          phase: "ready",
          key: requestKey,
          sheet,
          contractFileName: readContractFileName(raw),
          // TCS `logo_url` ist in der Datenbank noch leer: solange greift das
          // vorhandene, gleichmarkige Projektlogo als Zwischenlösung. In die
          // Datenbank wird dafür nichts geschrieben.
          brand: {
            ...brandOutcome.profile,
            logo_url: brandOutcome.profile.logo_url ?? tcsLogoFallback,
          },
        });
      } catch (err) {
        if (cancelled) return;
        const rec = (err ?? {}) as Record<string, unknown>;
        const message =
          [rec.code, rec.message, rec.details]
            .filter((part): part is string => typeof part === "string" && part !== "")
            .join(" | ") || String(err);
        setState({ phase: "error", message });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, artikelNr, locale, requestKey, reloadToken]);

  const labels = useMemo(
    () => ({
      documentType: t("katalog.pdp.datasheet.title", "Datenblatt"),
      price: t("katalog.pdp.datasheet.price", "Preis"),
      contents: t("katalog.pdp.datasheet.contents", "Paketinhalt"),
      features: t("katalog.pdp.datasheet.features", "Merkmale"),
    }),
    [t],
  );

  const formatPrice = useCallback(
    (value: number, currency: string) =>
      new Intl.NumberFormat(intlLocale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(value),
    [intlLocale],
  );

  // Beschriftung kommt bereits lokalisiert aus dem Vertrag — kein deutscher Zwang.
  const resolveBadgeLabel = useCallback(
    (badge: ContractBadge) => badge.label ?? badge.key ?? null,
    [],
  );

  const ready = state.phase === "ready" && state.key === requestKey ? state : null;

  const handlePrint = useCallback(async () => {
    if (!ready) return;
    setPrintState({ phase: "busy" });
    document.body.classList.add("ds-printing");
    try {
      // Dateiname aus Vertrag bzw. Markenpräfix + Artikelnummer + Sprache;
      // das gemeinsame Modul stellt den Seitentitel danach wieder her.
      await printDatasheet(
        datasheetDocumentTitle({
          contractFileName: ready.contractFileName,
          documentType: labels.documentType,
          artikelNr: ready.sheet.artikelNr,
          locale,
          companyName: ready.brand.company_name ?? null,
        }),
      );
      setPrintState({ phase: "idle" });
    } catch {
      setPrintState({ phase: "failed" });
    } finally {
      document.body.classList.remove("ds-printing");
    }
  }, [ready, labels.documentType, locale]);

  useEffect(
    () => () => {
      document.body.classList.remove("ds-printing");
    },
    [],
  );

  const brandMessage = (outcome: BrandProfileOutcome): string => {
    switch (outcome.status) {
      case "inactive":
        return t(
          "katalog.pdp.datasheet.brand.inactive",
          "Das Markenprofil für das Datenblatt ist derzeit nicht aktiv. Deshalb kann nicht gedruckt werden.",
        );
      case "mismatch":
        return t(
          "katalog.pdp.datasheet.brand.mismatch",
          "Es wurde ein fremdes Markenprofil geliefert. Aus Sicherheitsgründen wird nicht gedruckt.",
        );
      case "templateMissing":
        return t(
          "katalog.pdp.datasheet.brand.templateMissing",
          "Im Markenprofil ist keine Datenblatt-Vorlage angegeben. Deshalb wird das Datenblatt nicht angezeigt oder gedruckt.",
        );
      case "templateUnsupported":
        return t(
          "katalog.pdp.datasheet.brand.templateUnsupported",
          "Die im Markenprofil angegebene Datenblatt-Vorlage wird hier nicht unterstützt. Deshalb wird das Datenblatt nicht angezeigt oder gedruckt.",
        );
      case "unconfigured":
        return t(
          "katalog.pdp.datasheet.brand.unconfigured",
          "Die Produktverbindung ist nicht eingerichtet. Das Markenprofil konnte nicht gelesen werden.",
        );
      case "error":
        return `${t(
          "katalog.pdp.datasheet.brand.error",
          "Das Markenprofil konnte nicht gelesen werden.",
        )} (${outcome.message})`;
      default:
        return t(
          "katalog.pdp.datasheet.brand.missing",
          "Für das Datenblatt ist kein Markenprofil hinterlegt. Deshalb kann nicht gedruckt werden.",
        );
    }
  };

  const contentKey = ready
    ? contentSignature(ready.sheet, ready.brand, labels, {
        locale,
        intlLocale,
      })
    : "empty";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ds-print-shell=""
        /*
         * `print:*`: Die Zentrier-Verschiebung des Dialogs muss im Druck weg,
         * sonst entsteht ein Bezugsrahmen und die Seitenboxen sitzen nicht am
         * Blattanfang. Bildschirm bleibt unverändert.
         */
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 print:!translate-x-0 print:!translate-y-0 print:!transform-none"
      >
        <div className="ds-no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background px-6 py-3">
          <DialogTitle className="text-sm font-medium text-muted-foreground">
            {labels.documentType}
          </DialogTitle>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!ready || printState.phase === "busy"}
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
              {printState.phase === "busy"
                ? t("katalog.pdp.datasheet.printPreparing", "Druck wird vorbereitet …")
                : t("katalog.pdp.datasheet.print", "Drucken")}
            </Button>
            <button
              type="button"
              aria-label={t("katalog.pdp.datasheet.close", "Schließen")}
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <DialogDescription className="sr-only">
          {ready?.sheet.title ?? labels.documentType}
        </DialogDescription>

        <div data-ds-print-root="" className="px-6 py-6 print:px-0 print:py-0">
          {state.phase === "loading" ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : null}

          {state.phase === "empty" ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "katalog.pdp.datasheet.empty",
                "Für dieses Produkt ist aktuell kein Datenblatt freigegeben.",
              )}
            </p>
          ) : null}

          {state.phase === "error" ? (
            <div className="ds-error" role="alert">
              <p>{state.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setReloadToken((value) => value + 1)}
              >
                {t("katalog.pdp.datasheet.retry", "Erneut versuchen")}
              </Button>
            </div>
          ) : null}

          {state.phase === "brandBlocked" ? (
            <div className="ds-error" role="alert">
              <p>{brandMessage(state.outcome)}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setReloadToken((value) => value + 1)}
              >
                {t("katalog.pdp.datasheet.retry", "Erneut versuchen")}
              </Button>
            </div>
          ) : null}

          {printState.phase === "failed" ? (
            <p className="ds-no-print mb-3 text-sm text-destructive" role="alert">
              {t(
                "katalog.pdp.datasheet.printFailed",
                "Der Druck konnte nicht vorbereitet werden (Bilder oder Schriften waren nicht rechtzeitig bereit). Bitte erneut versuchen.",
              )}
            </p>
          ) : null}

          {ready ? (
            /*
             * A4-Seitenboxen, Seitenumbrüche und die eine Fußzeile unten auf der
             * letzten Seite macht der gemeinsame Druckrahmen. Vorschau und PDF
             * benutzen exakt dieselben Seiten.
             */
            <DatasheetPrintFrame
              contentKey={contentKey}
              busyLabel={t(
                "katalog.pdp.datasheet.printPreparing",
                "Druck wird vorbereitet …",
              )}
              errorLabel={t(
                "katalog.pdp.datasheet.printFailed",
                "Der Druck konnte nicht vorbereitet werden (Bilder oder Schriften waren nicht rechtzeitig bereit). Bitte erneut versuchen.",
              )}
              retryLabel={t("katalog.pdp.datasheet.retry", "Erneut versuchen")}
            >
              <DatasheetSheet
                sheet={ready.sheet}
                brand={ready.brand}
                labels={labels}
                showPrices
                formatPrice={formatPrice}
                resolveBadgeLabel={resolveBadgeLabel}
              />
            </DatasheetPrintFrame>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
