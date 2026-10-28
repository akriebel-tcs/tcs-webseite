/**
 * useMerklisteProducts — lädt für die gemerkten Artikelnummern (max. 4) die
 * aktuellen PDP-Daten in der aktiven UI-Sprache.
 *
 * Die Artikelnummer ist die stabile Wahrheit; Titel und Kurztext kommen
 * ausschliesslich aus dem Kanalvertrag (`rpc_get_channel_product_pdp` über
 * `getProductPdp`). Es werden keine Produktdaten geschrieben und keine
 * CMS-Light-Inhalte veraendert.
 *
 * - Laden erfolgt parallel (`Promise.allSettled`); ein einzelner Fehlschlag
 *   blockiert die uebrigen Artikel nicht.
 * - Bei Sprachwechsel bleiben die vorhandenen Texte sichtbar, bis die neuen
 *   Daten da sind (kein Leerflackern).
 * - Die geladenen Payloads werden fuer die Vergleichstabelle wiederverwendet,
 *   damit keine zweite Aufruffolge entsteht.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { getProductPdp, type PdpPayload } from "@/features/service/catalog/api/pdp";
import { asString } from "@/features/service/catalog/lib/pdpAssets";
import { normalizeProductLocale } from "@/features/service/catalog/lib/productLocale";
import type { MerklisteItem } from "./useMerkliste";

export interface MerklisteProductTexts {
  readonly artikel_nr: string;
  /** Titel aus dem Kanalvertrag (leer, wenn nicht geladen). */
  readonly title: string | null;
  /** Kurztext aus dem Kanalvertrag (leer, wenn nicht geladen). */
  readonly teaser: string | null;
  /** Rohpayload zur Wiederverwendung (z. B. technischer Vergleich). */
  readonly payload: PdpPayload | null;
  /** true, wenn dieser Artikel nicht geladen werden konnte. */
  readonly failed: boolean;
}

/** Titel und Kurztext aus einer PDP-Payload lesen. */
export function pickPdpTexts(payload: PdpPayload | null): {
  title: string | null;
  teaser: string | null;
} {
  if (!payload) return { title: null, teaser: null };
  const rec = payload as Record<string, unknown>;
  const title = asString(rec.headline);
  const teaser =
    asString(rec.subheadline) ??
    asString(rec.kurzbeschreibung) ??
    asString(rec.kurztext);
  return { title, teaser };
}

export interface MerklisteProductsState {
  readonly byArtikel: ReadonlyMap<string, MerklisteProductTexts>;
  readonly loading: boolean;
}

export function useMerklisteProducts(
  items: readonly MerklisteItem[],
  rawLocale: string,
): MerklisteProductsState {
  const locale = normalizeProductLocale(rawLocale);
  const key = items.map((i) => i.artikel_nr).join(",");
  const [entries, setEntries] = useState<readonly MerklisteProductTexts[]>([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const nrs = key ? key.split(",") : [];
    if (nrs.length === 0) {
      requestRef.current += 1;
      setEntries([]);
      setLoading(false);
      return;
    }
    const token = (requestRef.current += 1);
    setLoading(true);
    (async () => {
      const results = await Promise.allSettled(
        nrs.map((nr) => getProductPdp(nr, locale)),
      );
      // Antworten aelterer Sprach-/Artikelstaende verwerfen.
      if (requestRef.current !== token) return;
      const next: MerklisteProductTexts[] = results.map((res, idx) => {
        const artikel_nr = nrs[idx];
        if (res.status !== "fulfilled" || !res.value) {
          return { artikel_nr, title: null, teaser: null, payload: null, failed: true };
        }
        const { title, teaser } = pickPdpTexts(res.value);
        return { artikel_nr, title, teaser, payload: res.value, failed: false };
      });
      setEntries(next);
      setLoading(false);
    })();
  }, [key, locale]);

  const byArtikel = useMemo(() => {
    const map = new Map<string, MerklisteProductTexts>();
    for (const e of entries) map.set(e.artikel_nr, e);
    return map;
  }, [entries]);

  return { byArtikel, loading };
}
