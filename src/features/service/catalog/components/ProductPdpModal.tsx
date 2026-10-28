import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, FileText, Package, X } from "lucide-react";
import { toast } from "sonner";
import { useMerkliste, MERKLISTE_MAX } from "@/features/produkte/merkliste/useMerkliste";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ROUTES } from "@/navigation/routes";
import ProductPdpTechnicalData from "./pdp/ProductPdpTechnicalData";
import ProductPdpDocuments from "./pdp/ProductPdpDocuments";
import ProductPdpPaketKomponenten from "./pdp/ProductPdpPaketKomponenten";
import ProductDatasheetModal from "./ProductDatasheetModal";
import {
  normalizeProductLocale,
  pickProductTranslatedOnly,
  productIntlLocale,
} from "../lib/productLocale";
import { usePdpData } from "../hooks/usePdpData";
import { asNumber, asString } from "../lib/pdpAssets";
import {
  formatPrice,
  isPaket,
  readAusschreibungstext,
  readBadges,
  readDocumentGroups,
  readFeatures,
  readImages,
  readPaketKomponentenItems,
  readSpecGroups,
} from "../lib/pdpReaders";

/**
 * Karten-Popup (Produktdetail im Modal).
 *
 * Erweiterung: Paketkomponenten sind klickbar. Beim Klick öffnet sich die
 * Komponenten-PDP als von rechts einblendendes Overlay innerhalb desselben
 * Modals (Stack). Mit „Zurück" oder dem floating X kehrt man zurück.
 *
 * Das floating X bleibt durch sticky-Positionierung immer am oberen Rand
 * sichtbar – auch beim Scrollen weit nach unten.
 */

interface Props {
  readonly open: boolean;
  readonly artikelNr: string | null;
  readonly slug?: string | null;
  readonly onOpenChange: (open: boolean) => void;
}

export default function ProductPdpModal({
  open,
  artikelNr,
  slug,
  onOpenChange,
}: Props) {
  const { t } = useTranslation("service");
  const [stack, setStack] = useState<string[]>([]);
  const [datasheetNr, setDatasheetNr] = useState<string | null>(null);

  // Reset des Stacks beim Schließen oder Wechsel des Basis-Produkts.
  useEffect(() => {
    if (!open) setStack([]);
  }, [open]);
  useEffect(() => {
    setStack([]);
  }, [artikelNr, slug]);

  const handleClose = () => onOpenChange(false);
  const handlePush = (nr: string) => setStack((s) => [...s, nr]);
  const handlePop = () => setStack((s) => s.slice(0, -1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl h-[90vh] p-0 overflow-hidden [&>button.absolute]:hidden"
      >
        {/* Floating Close X – nur auf Basis-Ansicht (Paket-PDP) sichtbar.
            Auf verschachtelten Komponenten-PDPs würde das X das gesamte Modal
            schließen, was nicht gewünscht ist – dort gibt es stattdessen
            einen „Zurück"-Button oben rechts. */}
        {stack.length === 0 ? (
          <div className="pointer-events-none absolute right-3 top-3 z-[60]">
            <button
              type="button"
              onClick={handleClose}
              aria-label={t("common.close", { defaultValue: "Schließen" }) as string}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-sm bg-transparent border border-black/80 text-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.25)] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/40"
            >
              <X className="w-[20px] h-[20px] text-black/80" strokeWidth={2} />
            </button>
          </div>
        ) : null}

        {/* Basis-Ansicht */}
        <div className="relative h-full w-full overflow-hidden">
          <PdpView
            artikelNr={artikelNr}
            slug={slug ?? null}
            onOpenChange={onOpenChange}
            onSelectComponent={handlePush}
            onShowDatasheet={setDatasheetNr}
          />

          {/* Nested Slide-in Panels (Stack) */}
          <AnimatePresence>
            {stack.map((nr, idx) => (
              <motion.div
                key={`${nr}-${idx}`}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
                className="absolute inset-0 bg-background"
                style={{ zIndex: 10 + idx }}
              >
                <PdpView
                  artikelNr={nr}
                  slug={null}
                  onOpenChange={onOpenChange}
                  onSelectComponent={handlePush}
                  onBack={handlePop}
                  onShowDatasheet={setDatasheetNr}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </DialogContent>

      {/* Website-Datenblatt (Inhalt ausschließlich aus dem Kanalvertrag) */}
      <ProductDatasheetModal
        open={datasheetNr !== null}
        artikelNr={datasheetNr}
        onOpenChange={(next) => {
          if (!next) setDatasheetNr(null);
        }}
      />
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Innere PDP-Ansicht (wiederverwendet für Basis + verschachtelte)     */
/* ------------------------------------------------------------------ */

interface ViewProps {
  readonly artikelNr: string | null;
  readonly slug: string | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelectComponent: (artikelNr: string) => void;
  readonly onBack?: () => void;
  readonly onShowDatasheet: (artikelNr: string) => void;
}

function PdpView({
  artikelNr,
  slug,
  onOpenChange,
  onSelectComponent,
  onBack,
  onShowDatasheet,
}: ViewProps) {
  const { t, i18n } = useTranslation("service");
  const locale = normalizeProductLocale(i18n.language);

  const state = usePdpData({
    artikelNr,
    slug,
    locale,
    enabled: true,
  });

  const payload = state.phase === "ready" ? state.payload : null;
  const nr = payload ? asString(payload.artikel_nr) : artikelNr;
  // Rückfall auf die Stammdatenfelder `kurztext`/`kurzbeschreibung` nur,
  // wenn sie in der angefragten Sprache vorliegen (sonst kein deutscher
  // Text unter einem PL-/NL-Label).
  const headline = payload
    ? (asString(payload.headline_resolved) ??
      asString(payload.headline) ??
      pickProductTranslatedOnly(payload, "kurztext", locale))
    : null;
  const subheadline = payload
    ? (asString(payload.subheadline_resolved) ??
      asString(payload.subheadline) ??
      pickProductTranslatedOnly(payload, "kurzbeschreibung", locale))
    : null;
  const price = payload
    ? formatPrice(
        asNumber(payload.preis),
        asString(payload.waehrung),
        productIntlLocale(state.phase === "ready" ? state.resolvedLocale : locale),
      )
    : null;

  const paketKomponenten = payload
    ? readPaketKomponentenItems(
        payload.paket_komponenten,
        state.phase === "ready" ? state.paketKomponenten : [],
      )
    : [];
  const pkg = payload ? isPaket(payload, paketKomponenten) : false;
  const features = payload && !pkg ? readFeatures(payload) : [];
  const badges = payload ? readBadges(payload, locale) : [];
  const images = payload ? readImages(payload) : [];
  const specGroups = payload ? readSpecGroups(payload) : [];
  const documentGroups = payload ? readDocumentGroups(payload) : [];
  const ausschreibungstext = payload
    ? readAusschreibungstext(payload, locale)
    : null;

  const inquiryHref = nr
    ? `/kontakt?artikel=${encodeURIComponent(nr)}`
    : "/kontakt";

  const fullPdpHref =
    slug
      ? `${ROUTES.produkte.tuerkommunikation}/${encodeURIComponent(slug)}`
      : nr
        ? `${ROUTES.produkte.tuerkommunikation}/${encodeURIComponent(nr)}`
        : null;

  return (
    <div className="h-full w-full overflow-y-auto">
      {/* Zurück-Button bei verschachtelten Ansichten – oben rechts,
          dort wo sonst das Floating-X säße. Schließt nur die aktuelle
          Komponenten-PDP, nicht das gesamte Modal. */}
      {onBack ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[60]">
          <button
            type="button"
            onClick={onBack}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur border border-border shadow-md px-3 h-9 text-sm text-foreground hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("katalog.merkliste.back")}
          </button>
        </div>
      ) : null}

      <div className="p-6 md:p-8 space-y-6">
        <header className="space-y-2 pr-12">
          {nr ? (
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              {nr}
            </p>
          ) : null}
          <DialogTitle className="text-2xl md:text-3xl font-heading font-semibold text-foreground leading-tight">
            {headline ?? nr ?? t("katalog.pdp.hero.fallbackHeadline")}
          </DialogTitle>
          {subheadline ? (
            <DialogDescription className="text-sm md:text-base text-muted-foreground">
              {subheadline}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {t("katalog.pdp.sections.details")}
            </DialogDescription>
          )}
        </header>

        {state.phase === "loading" ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        ) : null}

        {state.phase === "notfound" ? (
          <p className="text-sm text-muted-foreground">
            {t("katalog.pdp.notFound.text")}
          </p>
        ) : null}

        {state.phase === "error" ? (
          <p className="text-sm text-destructive">
            {t("katalog.pdp.errorBox.text")}
          </p>
        ) : null}

        {state.phase === "ready" ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="grid md:grid-cols-2 gap-6 items-start"
            >
              <div className="aspect-[4/3] w-full bg-muted/40 rounded-md overflow-hidden flex items-center justify-center border border-border/60">
                {images[0] ? (
                  <img
                    src={images[0].url}
                    alt={images[0].alt ?? headline ?? nr ?? ""}
                    className="w-full h-full object-contain p-4"
                    loading="eager"
                  />
                ) : (
                  <Package
                    className="w-12 h-12 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="space-y-4">
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

                {features.length > 0 ? (
                  <ul className="space-y-1.5 pl-1">
                    {features.map((f) => (
                      <li key={f.key} className="flex gap-2 text-sm">
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground select-none"
                        >
                          ›
                        </span>
                        <span className="text-foreground/90">{f.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {/* Paket-Komponenten neben dem Bild, falls vorhanden */}
                {pkg ? (
                  <ProductPdpPaketKomponenten
                    components={paketKomponenten}
                    onSelect={onSelectComponent}
                  />
                ) : null}

                {price ? (
                  <div className="pt-2 text-lg font-semibold text-foreground">
                    {price}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <MerklisteToggleButton
                    artikelNr={nr}
                    slug={slug ?? null}
                    title={headline ?? null}
                    teaser={subheadline ?? null}
                    imageUrl={images[0]?.url ?? null}
                  />
                  {nr ? (
                    <button
                      type="button"
                      onClick={() => onShowDatasheet(nr)}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <FileText className="w-4 h-4" aria-hidden="true" />
                      {t("katalog.pdp.datasheet.open", "Datenblatt anzeigen")}
                    </button>
                  ) : null}
                  <Link
                    to={inquiryHref}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {t("katalog.merkliste.inquireProduct")}
                  </Link>
                </div>
              </div>
            </motion.div>

            {specGroups.length > 0 ? (
              <ProductPdpTechnicalData groups={specGroups} />
            ) : null}

            {documentGroups.length > 0 ? (
              <ProductPdpDocuments groups={documentGroups} />
            ) : null}

            {ausschreibungstext ? (
              <Accordion type="single" collapsible>
                <AccordionItem value="ausschreibung">
                  <AccordionTrigger>
                    {t("katalog.pdp.sections.ausschreibung")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {ausschreibungstext}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Merkliste-Toggle-Button (lokal, kein Backend).                      */
/* ------------------------------------------------------------------ */

interface MerklisteToggleProps {
  readonly artikelNr: string | null;
  readonly slug: string | null;
  readonly title: string | null;
  readonly teaser: string | null;
  readonly imageUrl: string | null;
}

function MerklisteToggleButton({
  artikelNr,
  slug,
  title,
  teaser,
  imageUrl,
}: MerklisteToggleProps) {
  const { t } = useTranslation("service");
  const { has, add, remove } = useMerkliste();
  if (!artikelNr) return null;
  const active = has(artikelNr);
  return (
    <button
      type="button"
      onClick={() => {
        if (active) {
          remove(artikelNr);
          toast.success(t("katalog.merkliste.toastRemoved"));
          return;
        }
        const result = add({
          artikel_nr: artikelNr,
          slug,
          title,
          teaser,
          image_url: imageUrl,
        });
        if (result === "added") {
          toast.success(t("katalog.merkliste.toastAdded"));
        } else if (result === "full") {
          toast.error(t("katalog.merkliste.toastFull", { max: MERKLISTE_MAX }));
        }
      }}
      className={
        "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
        (active
          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          : "bg-foreground text-background hover:bg-foreground/90")
      }
    >
      {active ? (
        <>
          <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
          {t("katalog.merkliste.removeLabel")}
        </>
      ) : (
        <>
          <Bookmark className="w-4 h-4" aria-hidden="true" />
          {t("katalog.merkliste.add")}
        </>
      )}
    </button>
  );
}
