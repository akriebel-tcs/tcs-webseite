/**
 * usePdpData — lädt die PDP-Payload (Kanalvertrag), Paket-Komponenten und
 * Capability-Claims für eine Artikelnummer ODER einen Slug.
 *
 * Wird sowohl von der Seiten-PDP (`ProductDetailPage`) als auch vom
 * Karten-Popup (`ProductPdpModal`) genutzt. Inhaltliche Quelle ist
 * ausschließlich `rpc_get_channel_product_pdp` – technische Daten kommen
 * aus `pdp.technical_specs_display`, es gibt keinen zweiten Spec-Aufruf.
 */
import { useEffect, useRef, useState } from "react";
import {
  getPaketKomponenten,
  loadProductPdpLocalized,
  resolveArtikelNrBySlug,
  type PaketKomponente,
  type PdpPayload,
  type SlugResolveDiagnostics,
} from "../api/pdp";
import { asArray, asBoolean, asString } from "../lib/pdpAssets";
import {
  getCapabilityClaims,
  type CapabilityClaim,
} from "@/lib/catalog-contract";
import { normalizeProductLocale } from "../lib/productLocale";

export type PdpDataState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "notfound"; diagnostics: SlugResolveDiagnostics | null }
  | { phase: "error"; message: string }
  | {
      phase: "ready";
      payload: PdpPayload;
      paketKomponenten: readonly PaketKomponente[];
      capabilityClaims: readonly CapabilityClaim[];
      /** Angeforderte Sprache (normalisiert). */
      requestedLocale: string;
      /** Sprache, in der die Produktdaten geliefert wurden. */
      resolvedLocale: string;
      /** true, wenn die Produktdaten in einer Ersatzsprache kommen. */
      usedFallback: boolean;
    };

interface Options {
  /** Slug ODER Artikelnummer. Wenn `slug` gesetzt ist, wird zuerst aufgelöst. */
  readonly slug?: string | null;
  readonly artikelNr?: string | null;
  readonly locale: string;
  /** Wenn false, wird nicht geladen (z. B. wenn Modal geschlossen ist). */
  readonly enabled?: boolean;
}

export function usePdpData({
  slug,
  artikelNr,
  locale: rawLocale,
  enabled = true,
}: Options): PdpDataState {
  const locale = normalizeProductLocale(rawLocale);
  const [state, setState] = useState<PdpDataState>({ phase: "idle" });
  const requestRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      requestRef.current += 1;
      setState({ phase: "idle" });
      return;
    }
    if (!slug && !artikelNr) {
      requestRef.current += 1;
      setState({ phase: "notfound", diagnostics: null });
      return;
    }
    // Nur der jüngste Sprach-/Artikel-Request darf den Zustand setzen.
    // Antworten abgebrochener Requests werden verworfen — sie dürfen
    // insbesondere nie „nicht gefunden" auslösen.
    const token = (requestRef.current += 1);
    const outdated = () => requestRef.current !== token;
    setState({ phase: "loading" });

    (async () => {
      try {
        let nr: string | null = artikelNr ?? null;
        let diag: SlugResolveDiagnostics | null = null;
        if (!nr && slug) {
          diag = await resolveArtikelNrBySlug(slug, locale);
          nr = diag.artikelNr;
        }
        if (outdated()) return;
        if (!nr) {
          if (diag?.transient) {
            setState({
              phase: "error",
              message: diag.reason ?? "slug_resolve_unavailable",
            });
            return;
          }
          setState({ phase: "notfound", diagnostics: diag });
          return;
        }
        const resolution = await loadProductPdpLocalized(nr, locale);
        const payload = resolution.value;
        if (outdated()) return;
        if (!payload || asBoolean(payload.found) === false) {
          setState({ phase: "notfound", diagnostics: diag });
          return;
        }
        const klasse = asString(payload.paket_klasse);
        const inPayload = asArray(payload.paket_komponenten);
        const paket =
          klasse && inPayload.length === 0
            ? await getPaketKomponenten(nr).catch(() => [])
            : [];
        if (outdated()) return;

        const capabilityClaims = await getCapabilityClaims(nr).catch(() => []);
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
    })();
  }, [slug, artikelNr, locale, enabled]);

  return state;
}
