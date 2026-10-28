import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft, FileText, Package } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  loadProductPdpLocalized,
  getPaketKomponenten,
  resolveArtikelNrBySlug,
  type PdpPayload,
  type SlugResolveDiagnostics,
  type PaketKomponente,
} from "../catalog/api/pdp";
import { readSpecGroups } from "../catalog/lib/pdpReaders";
import {
  asArray,
  asBoolean,
  asNumber,
  asString,
  resolvePublicUrl,
} from "../catalog/lib/pdpAssets";
import ProductPdpHeader from "../catalog/components/pdp/ProductPdpHeader";
import ProductPdpSummary from "../catalog/components/pdp/ProductPdpSummary";
import ProductPdpTechnicalData from "../catalog/components/pdp/ProductPdpTechnicalData";
import ProductPdpDocuments from "../catalog/components/pdp/ProductPdpDocuments";
import ProductPdpPaketKomponenten from "../catalog/components/pdp/ProductPdpPaketKomponenten";
import ProductDatasheetModal from "../catalog/components/ProductDatasheetModal";
import {
  normalizeProductLocale,
  pickProductLocalized,
  pickProductTranslatedOnly,
  productIntlLocale,
} from "../catalog/lib/productLocale";
import type {
  DocumentGroup,
  DocumentItem,
  FeatureItem,
  ImageItem,
  PaketKomponenteItem,
} from "../catalog/components/pdp/types";
import {
  getCapabilityClaims,
  type CapabilityClaim,
} from "@/lib/catalog-contract";
import { Badge } from "@/components/ui/badge";

/**
 * Produktdetailseite (PDP) – Etappe `catalog-contract-render-fix-1`.
 *
 * Quellen strikt nach Vertrag (`catalog-contract.json`, `CATALOG.md`):
 *   1. Slug → Artikelnummer: kanalbegrenzt über
 *      `rpc_get_channel_product_listing('pdp_de', ...)` (via `pdp.ts`)
 *   2. PDP-Payload: `rpc_get_channel_product_pdp('pdp_de', artikel_nr, locale)`
 *      – verwendet wird der enthaltene Wert `pdp`; mit
 *      Default `p_status_filter = ['approved']` (Frontend setzt nichts)
 *   3. Technische Daten: ausschließlich `pdp.technical_specs_display`
 *   4. Paket-Komponenten: bevorzugt `payload.paket_komponenten[]`; nur als
 *      Fallback `api_v1_paket_komponenten`.
 *
 * Reale Sample-Payloads (siehe `samples/`) sind die Wahrheit für Feldnamen.
 * Es werden keine Felder erfunden, keine Buckets im Frontend gesetzt, keine
 * Klassifikation aus `artikel_nr` abgeleitet.
 */

type PdpState =
  | { phase: "loading" }
  | { phase: "notfound"; diagnostics: SlugResolveDiagnostics | null }
  | { phase: "error"; message: string }
  | {
      phase: "ready";
      payload: PdpPayload;
      paketKomponenten: readonly PaketKomponente[];
      capabilityClaims: readonly CapabilityClaim[];
      requestedLocale: string;
      resolvedLocale: string;
      usedFallback: boolean;
    };

const CATALOG_ROUTE = "/produkte/tuerkommunikation" as const;

function readBadges(payload: PdpPayload, locale: string): string[] {
  const raw = asArray(payload.badges);
  const out: { sort: number; label: string }[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== "object") return;
    const rec = item as Record<string, unknown>;
    const label = pickProductLocalized(rec, "label", locale);
    if (!label) return;
    out.push({ sort: asNumber(rec.sort) ?? idx, label });
  });
  out.sort((a, b) => a.sort - b.sort);
  return out.map((b) => b.label);
}

/**
 * Vertrag: Frontend filtert NICHT erneut nach `status` – die DB liefert
 * bereits nur `approved` (Default `p_status_filter`). Reihenfolge führt die
 * DB über `sort_order`/`priority`.
 */
function readFeatures(payload: PdpPayload): FeatureItem[] {
  const raw = asArray(payload.features);
  const items: { sort: number; item: FeatureItem }[] = [];
  raw.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const rec = entry as Record<string, unknown>;
    const label = asString(rec.text) ?? asString(rec.label);
    if (!label) return;
    const sort = asNumber(rec.sort_order) ?? asNumber(rec.priority) ?? idx;
    items.push({
      sort,
      item: { key: `f-${idx}`, label, description: null },
    });
  });
  items.sort((a, b) => a.sort - b.sort);
  return items.map((i) => i.item);
}

// Technische Daten kommen aus dem geteilten Reader `readSpecGroups`
// (Quelle: `pdp.technical_specs_display`, Gruppen-Label/Sortierung aus der DB).

function prettyGroupLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Dokumente: Vertrag verlangt `documents[].public_url`. Liefert die DB nur
 * `file_path`/`file_name`/`category` (siehe Sample), wird das Dokument ohne
 * Link gerendert – das ist eine bekannte DB-/Vertragslücke und wird im
 * Frontend NICHT durch Bucket-Konstruktion kompensiert.
 */
function readDocumentGroups(payload: PdpPayload): DocumentGroup[] {
  const raw = asArray(payload.documents);
  const items: DocumentItem[] = [];
  const categoryLabels = new Map<string, string>();
  raw.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const rec = entry as Record<string, unknown>;
    const linkStatus = asString(rec.link_status);
    if (linkStatus && linkStatus !== "active") return;
    const label =
      asString(rec.title) ??
      asString(rec.label) ??
      asString(rec.file_name) ??
      asString(rec.name);
    if (!label) return;
    const category = asString(rec.category);
    const categoryLabel = asString(rec.category_label);
    if (category && categoryLabel && !categoryLabels.has(category)) {
      categoryLabels.set(category, categoryLabel);
    }
    items.push({
      key:
        asString(rec.id) ??
        asString(rec.document_id) ??
        `d-${idx}-${label}`,
      label,
      url: resolvePublicUrl(rec),
      category,
      fileType: asString(rec.file_type),
    });
  });

  if (items.length === 0) return [];
  const map = new Map<string, DocumentItem[]>();
  const order: string[] = [];
  for (const it of items) {
    const k = it.category ?? "_other";
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push(it);
  }
  return order.map((k) => ({
    key: k,
    label:
      categoryLabels.get(k) ??
      (k === "_other" ? "Weitere" : prettyGroupLabel(k)),
    items: map.get(k)!,
  }));
}

/**
 * Bilder: Vertrag verlangt `images[].public_url`, sortiert nach `sort_order`,
 * `is_primary` zuerst. Frontend setzt KEINE Buckets/Pfade.
 */
function readImages(payload: PdpPayload): ImageItem[] {
  const raw = asArray(payload.images);
  const out: { sort: number; primary: boolean; item: ImageItem }[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== "object") return;
    const rec = item as Record<string, unknown>;
    const url = resolvePublicUrl(rec);
    if (!url) return;
    out.push({
      sort: asNumber(rec.sort_order) ?? idx,
      primary: rec.is_primary === true,
      item: {
        key: `i-${idx}-${url}`,
        url,
        alt: asString(rec.alt_text) ?? asString(rec.alt) ?? null,
      },
    });
  });
  out.sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    return a.sort - b.sort;
  });
  return out.map((o) => o.item);
}

function readAusschreibungstext(
  payload: PdpPayload,
  locale: string,
): string | null {
  const a = payload.ausschreibung;
  if (a && typeof a === "object") {
    const rec = a as Record<string, unknown>;
    return (
      pickProductLocalized(rec, "langbeschreibung", locale) ??
      pickProductLocalized(rec, "kurzbeschreibung", locale)
    );
  }
  return asString(a);
}

function readLieferumfang(payload: PdpPayload): string[] {
  const raw = asArray(payload.lieferumfang);
  const out: string[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const t = asString(rec.text);
    if (t) out.push(t);
  }
  return out;
}

type LabelValueItem = { key: string; label: string; value: string | null };

/**
 * Generischer Reader für DB-Listen mit `label`/`value`-ähnlichen Strukturen
 * (`produktinformationen[]`, `technische_daten_features[]`). Es werden
 * ausschließlich vorhandene Felder gelesen, keine Frontend-Heuristik.
 */
function readLabelValueList(
  raw: unknown,
  prefix: string,
): LabelValueItem[] {
  const arr = asArray(raw);
  const out: LabelValueItem[] = [];
  arr.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    const rec = entry as Record<string, unknown>;
    const label =
      asString(rec.label) ??
      asString(rec.title) ??
      asString(rec.name) ??
      asString(rec.text);
    if (!label) return;
    const value =
      asString(rec.value) ??
      asString(rec.display_value) ??
      asString(rec.text_value);
    out.push({ key: `${prefix}-${idx}`, label, value });
  });
  return out;
}

function readPaketKomponentenItems(
  payloadComponents: unknown,
  fallback: readonly PaketKomponente[],
): PaketKomponenteItem[] {
  const fromPayload = asArray(payloadComponents);
  const source: Record<string, unknown>[] =
    fromPayload.length > 0
      ? fromPayload.filter(
          (e): e is Record<string, unknown> => !!e && typeof e === "object",
        )
      : (fallback as unknown as Record<string, unknown>[]);

  return source.map((r, idx) => ({
    key: `${asString(r.resolved_artikel_nr) ?? asString(r.artikel_nr) ?? "x"}-${asString(r.rolle) ?? "x"}-${idx}`,
    rolle: asString(r.rolle),
    artikelNr:
      asString(r.resolved_artikel_nr) ?? asString(r.artikel_nr),
    title:
      asString(r.resolved_title) ??
      asString(r.kurztext) ??
      asString(r.title),
    anzahl: asNumber(r.anzahl),
  }));
}

/**
 * Vertrag (CATALOG.md `package_pdp_rules`): Paket = `paket_klasse != null`
 * UND `paket_komponenten.length > 0`. Niemals über `artikel_nr`-Präfix.
 */
function isPaket(
  payload: PdpPayload,
  components: readonly unknown[],
): boolean {
  const klasse = asString(payload.paket_klasse);
  return Boolean(klasse) && components.length > 0;
}

function formatPrice(
  amount: number | null,
  currency: string | null,
  locale: string,
): string | null {
  if (amount === null) return null;
  try {
    if (currency) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "code",
      }).format(amount);
    }
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return currency ? `${amount} ${currency}` : String(amount);
  }
}

const ProductDetailPage = () => {
  const { t, i18n } = useTranslation("service");
  const { pdpSlug } = useParams<{ pdpSlug: string }>();
  const locale = normalizeProductLocale(i18n.language);

  const [state, setState] = useState<PdpState>({ phase: "loading" });
  const [datasheetOpen, setDatasheetOpen] = useState(false);
  // Nur die Antwort des jüngsten Sprach-/Slug-Requests darf gelten.
  const requestRef = useRef(0);

  useEffect(() => {
    const token = (requestRef.current += 1);
    const outdated = () => requestRef.current !== token;
    async function load() {
      setState({ phase: "loading" });
      if (!pdpSlug) {
        setState({ phase: "notfound", diagnostics: null });
        return;
      }
      try {
        const diag = await resolveArtikelNrBySlug(pdpSlug, locale);
        if (outdated()) return;
        if (!diag.artikelNr) {
          if (diag.transient) {
            // Transportproblem, kein fachliches „nicht gefunden".
            setState({
              phase: "error",
              message: diag.reason ?? "slug_resolve_unavailable",
            });
            return;
          }
          setState({ phase: "notfound", diagnostics: diag });
          return;
        }
        const resolution = await loadProductPdpLocalized(
          diag.artikelNr,
          locale,
        );
        const payload = resolution.value;
        if (outdated()) return;
        if (!payload || asBoolean(payload.found) === false) {
          setState({ phase: "notfound", diagnostics: diag });
          return;
        }

        // Pakete: nur als Fallback auf api_v1_paket_komponenten zugreifen,
        // wenn die PDP-RPC die Komponenten NICHT mitliefert.
        const klasse = asString(payload.paket_klasse);
        const inPayload = asArray(payload.paket_komponenten);
        const paket =
          klasse && inPayload.length === 0
            ? await getPaketKomponenten(diag.artikelNr).catch(() => [])
            : [];
        if (outdated()) return;

        // Capability-Pills aus Manifest-View `api_v1_product_capability_claims`.
        const capabilityClaims = await getCapabilityClaims(
          diag.artikelNr,
        ).catch(() => []);
        if (outdated()) return;

        setState({
          phase: "ready",
          payload,
          paketKomponenten: paket,
          capabilityClaims,
          requestedLocale: resolution.requestedLocale,
          resolvedLocale: resolution.resolvedLocale,
          usedFallback: resolution.usedFallback,
        });
      } catch (err) {
        if (outdated()) return;
        const message =
          err instanceof Error ? err.message : String(err ?? "unknown");
        setState({ phase: "error", message });
      }
    }
    load();
  }, [pdpSlug, locale]);

  const payload = state.phase === "ready" ? state.payload : null;
  const artikelNr = payload ? asString(payload.artikel_nr) : null;
  // Vertrag: PDP-Header aus den ausdrücklich für die PDP redaktionierten
  // Feldern. Sample-Payloads liefern `headline`/`subheadline` (nicht
  // `headline_resolved` – Vertragslücke wird hingenommen, kein Fallback
  // auf `kurztext`).
  const headline = payload
    ? (asString(payload.headline_resolved) ?? asString(payload.headline))
    : null;
  const subheadline = payload
    ? (asString(payload.subheadline_resolved) ?? asString(payload.subheadline))
    : null;
  const paketKomponenten = payload
    ? readPaketKomponentenItems(
        payload.paket_komponenten,
        state.phase === "ready" ? state.paketKomponenten : [],
      )
    : [];
  const isPackage = payload ? isPaket(payload, paketKomponenten) : false;
  // Eyebrow: nur aus DB-Feld; bei Paketen laut CATALOG.md unterdrückt.
  const eyebrow =
    payload && !isPackage ? asString(payload.eyebrow) : null;
  // Stammdatentexte: nur ausspielen, wenn sie in der angefragten Sprache
  // vorliegen. Sonst bleibt der Block leer statt deutsch unter PL/NL.
  const shortDesc = payload
    ? pickProductTranslatedOnly(payload, "kurzbeschreibung", locale)
    : null;
  const longDesc = payload
    ? pickProductTranslatedOnly(payload, "langbeschreibung", locale)
    : null;

  const price = payload
    ? formatPrice(
        asNumber(payload.preis),
        asString(payload.waehrung),
        productIntlLocale(
          state.phase === "ready" ? state.resolvedLocale : locale,
        ),
      )
    : null;

  const badges = payload ? readBadges(payload, locale) : [];
  const capabilityClaims =
    state.phase === "ready" ? state.capabilityClaims : [];
  const capabilityPills = capabilityClaims
    .map((c, idx) => {
      const label = pickProductLocalized(
        c as unknown as Record<string, unknown>,
        "label",
        locale,
      );
      return label
        ? { key: asString(c.capability_key) ?? `cap-${idx}`, label }
        : null;
    })
    .filter((x): x is { key: string; label: string } => x !== null);
  // Pakete: keine Feature-Bullets (CATALOG.md §package_pdp_rules).
  const features = payload && !isPackage ? readFeatures(payload) : [];
  const specGroups = payload
    ? readSpecGroups(payload)
    : [];
  const documentGroups = payload ? readDocumentGroups(payload) : [];
  const images = payload ? readImages(payload) : [];
  const ausschreibungstext = payload
    ? readAusschreibungstext(payload, locale)
    : null;
  const lieferumfang = payload ? readLieferumfang(payload) : [];
  const produktinformationen = payload
    ? readLabelValueList(payload.produktinformationen, "pi")
    : [];
  const technischeDatenFeatures = payload
    ? readLabelValueList(payload.technische_daten_features, "tdf")
    : [];

  const productInfo =
    payload && typeof payload.produkt_info === "object"
      ? (payload.produkt_info as Record<string, unknown>)
      : null;
  const deliveryTime = productInfo ? asString(productInfo.lieferzeit) : null;
  const warrantyMonths = productInfo
    ? asNumber(productInfo.garantie_monate)
    : null;
  const warranty =
    warrantyMonths !== null
      ? t("katalog.pdp.summary.warrantyValue", { count: warrantyMonths })
      : null;

  const heroImage = images[0]?.url ?? "";

  // Block-Sichtbarkeit: Vertrag sieht `block_visibility` vor; aktuelle DB-
  // Samples liefern es nicht. Wir blenden Blöcke ohne Inhalt aus, ohne im
  // Frontend eine Reihenfolgenlogik zu erfinden.
  const blockVisibility =
    payload && typeof payload.block_visibility === "object" && payload.block_visibility !== null
      ? (payload.block_visibility as Record<string, unknown>)
      : null;
  const showBlock = (key: string, defaultVisible: boolean): boolean => {
    if (!blockVisibility) return defaultVisible;
    const v = blockVisibility[key];
    if (typeof v === "boolean") return v;
    return defaultVisible;
  };

  return (
    <PageLayout
      label={t("katalog.pdp.hero.label")}
      headline={headline ?? t("katalog.pdp.hero.fallbackHeadline")}
      intro={subheadline ?? shortDesc ?? t("katalog.pdp.hero.fallbackIntro")}
      heroImage={heroImage}
      showHeroImage={false}
      fullWidth
    >
      <section className="py-6 lg:py-8 bg-background">
        <div className="container mx-auto">
          <Link
            to={CATALOG_ROUTE}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t("katalog.pdp.back")}
          </Link>
        </div>
      </section>

      {state.phase === "loading" ? (
        <section className="py-8 lg:py-12 bg-background">
          <div className="container mx-auto grid lg:grid-cols-2 gap-8">
            <Skeleton className="h-80 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </section>
      ) : null}

      {state.phase === "notfound" ? (
        <section className="py-12 lg:py-16 bg-background">
          <div className="container mx-auto max-w-2xl">
            <Card>
              <CardContent className="p-6 flex items-start gap-3">
                <Package
                  className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="text-foreground font-medium mb-1">
                    {t("katalog.pdp.notFound.headline")}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("katalog.pdp.notFound.text")}
                  </p>
                  <Link
                    to={CATALOG_ROUTE}
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    {t("katalog.pdp.back")}
                  </Link>
                  {import.meta.env.DEV && state.diagnostics ? (
                    <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-xs font-mono text-muted-foreground">
                      <div className="font-semibold mb-1 text-foreground">
                        {t("katalog.pdp.notFound.devHeadline")}
                      </div>
                      <div>requestedRaw: {state.diagnostics.requestedRaw ?? "—"}</div>
                      <div>requestedNormalized: {state.diagnostics.requestedNormalized ?? "—"}</div>
                      <div>pdpViewQueriesAttempted: {state.diagnostics.pdpViewQueriesAttempted.join(" | ") || "—"}</div>
                      <div>pdpViewMatchField: {state.diagnostics.pdpViewMatchField ?? "—"}</div>
                      <div>pdpViewMatch: {String(state.diagnostics.pdpViewMatch)}</div>
                      <div>artikelNr: {state.diagnostics.artikelNr ?? "null"}</div>
                      <div>reason: {state.diagnostics.reason ?? "—"}</div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {state.phase === "error" ? (
        <section className="py-12 lg:py-16 bg-background">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-destructive/30">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle
                  className="w-5 h-5 text-destructive shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-foreground font-medium mb-1">
                    {t("katalog.pdp.errorBox.headline")}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("katalog.pdp.errorBox.text")}
                  </p>
                  <pre className="text-xs text-muted-foreground bg-muted/40 rounded p-2 overflow-x-auto">
                    {state.message}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {state.phase === "ready" ? (
        <section className="pb-12 lg:pb-16 bg-background">
          <div className="container mx-auto space-y-12">
            {showBlock("header", true) ? (
              <ProductPdpHeader
                eyebrow={eyebrow}
                artikelNr={artikelNr}
                headline={headline}
                subheadline={subheadline}
                priceFormatted={price}
              />
            ) : null}

            {artikelNr ? (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDatasheetOpen(true)}
                >
                  <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
                  {t("katalog.pdp.datasheet.open")}
                </Button>
                <ProductDatasheetModal
                  open={datasheetOpen}
                  artikelNr={artikelNr}
                  onOpenChange={setDatasheetOpen}
                />
              </div>
            ) : null}

            {capabilityPills.length > 0 ? (
              <div
                className="flex flex-wrap gap-2"
                aria-label={t("katalog.pdp.sections.capabilities", {
                  defaultValue: "Capabilities",
                })}
              >
                {capabilityPills.map((p) => (
                  <Badge key={p.key} variant="outline" className="text-xs">
                    {p.label}
                  </Badge>
                ))}
              </div>
            ) : null}

            {showBlock("images", true) ||
            showBlock("feature_items", features.length > 0) ? (
              <ProductPdpSummary
                headline={headline}
                artikelNr={artikelNr}
                shortDesc={shortDesc}
                longDesc={longDesc}
                features={features}
                badges={badges}
                images={images}
                deliveryTime={deliveryTime}
                warranty={warranty}
              />
            ) : null}

            {isPackage && showBlock("paket_komponenten", true) ? (
              <ProductPdpPaketKomponenten components={paketKomponenten} />
            ) : null}

            {lieferumfang.length > 0 ? (
              <section
                aria-labelledby="pdp-lieferumfang-heading"
                className="space-y-3"
              >
                <h2
                  id="pdp-lieferumfang-heading"
                  className="text-lg font-heading font-semibold text-foreground"
                >
                  {t("katalog.pdp.sections.lieferumfang")}
                </h2>
                <ul className="space-y-1.5 pl-1">
                  {lieferumfang.map((l, i) => (
                    <li key={`lu-${i}`} className="flex gap-2 text-sm">
                      <span aria-hidden="true" className="text-muted-foreground">
                        ›
                      </span>
                      <span className="text-foreground/90">{l}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {specGroups.length > 0 && showBlock("spec_groups", true) ? (
              <ProductPdpTechnicalData groups={specGroups} />
            ) : null}

            {technischeDatenFeatures.length > 0 ? (
              <section
                aria-labelledby="pdp-tdf-heading"
                className="space-y-3"
              >
                <h2
                  id="pdp-tdf-heading"
                  className="text-lg font-heading font-semibold text-foreground"
                >
                  {t("katalog.pdp.sections.technischeDatenFeatures")}
                </h2>
                <ul className="space-y-1.5">
                  {technischeDatenFeatures.map((it) => (
                    <li
                      key={it.key}
                      className="flex flex-wrap gap-x-2 text-sm"
                    >
                      <span className="text-muted-foreground">{it.label}:</span>
                      <span className="text-foreground/90">
                        {it.value ?? ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {produktinformationen.length > 0 ? (
              <section
                aria-labelledby="pdp-pi-heading"
                className="space-y-3"
              >
                <h2
                  id="pdp-pi-heading"
                  className="text-lg font-heading font-semibold text-foreground"
                >
                  {t("katalog.pdp.sections.produktinformationen")}
                </h2>
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {produktinformationen.map((it) => (
                    <div key={it.key} className="flex flex-col">
                      <dt className="text-muted-foreground">{it.label}</dt>
                      <dd className="text-foreground/90">{it.value ?? ""}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {documentGroups.length > 0 && showBlock("documents", true) ? (
              <ProductPdpDocuments groups={documentGroups} />
            ) : null}

            {ausschreibungstext && showBlock("ausschreibung", true) ? (
              <section
                aria-labelledby="pdp-ausschreibung-heading"
                className="space-y-2"
              >
                <Accordion type="single" collapsible>
                  <AccordionItem value="ausschreibung">
                    <AccordionTrigger id="pdp-ausschreibung-heading">
                      {t("katalog.pdp.sections.ausschreibung")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                        {ausschreibungstext}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            ) : null}
          </div>
        </section>
      ) : null}
    </PageLayout>
  );
};

export default ProductDetailPage;
