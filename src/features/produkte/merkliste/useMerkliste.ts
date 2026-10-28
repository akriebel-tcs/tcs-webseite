/**
 * useMerkliste — lokale Produkt-Merkliste (nur localStorage, kein Backend).
 *
 * Speichert maximal 4 Produkte als reine UI-Hilfe für den Produktkatalog.
 * Es werden **keine** Produktdaten geschrieben, keine RPC aufgerufen, keine
 * CMS-Light-Inhalte verändert. Die Merkliste lebt ausschließlich im Browser
 * des Nutzers.
 *
 * Felder pro Eintrag: artikel_nr, optional slug (für PDP-Link), Titel,
 * optional Bild-URL, optional Kurztext.
 */
import { useCallback, useEffect, useState } from "react";

export interface MerklisteItem {
  readonly artikel_nr: string;
  readonly slug?: string | null;
  readonly title?: string | null;
  readonly image_url?: string | null;
  readonly teaser?: string | null;
}

export const MERKLISTE_MAX = 4;
const STORAGE_KEY = "tcs.merkliste.v1";
const EVENT = "tcs:merkliste:change";

function readStorage(): MerklisteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is MerklisteItem =>
          !!x && typeof x === "object" && typeof (x as MerklisteItem).artikel_nr === "string",
      )
      .slice(0, MERKLISTE_MAX);
  } catch {
    return [];
  }
}

/**
 * Sprachabhaengige Texte (`title`, `teaser`) werden NICHT mehr dauerhaft
 * gespeichert — sie kaemen sonst als eingefrorene Momentaufnahme in einer
 * fremden Sprache zurueck. Neu gespeichert werden nur `artikel_nr`, `slug`
 * und `image_url`. Altbestand mit `title`/`teaser` bleibt lesbar und dient
 * nur noch als Lade-/Fehlerfallback.
 */
function stripLocalizedTexts(item: MerklisteItem): MerklisteItem {
  const { artikel_nr, slug, image_url } = item;
  return { artikel_nr, slug: slug ?? null, image_url: image_url ?? null };
}

function writeStorage(items: MerklisteItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage voll oder deaktiviert – ignorieren.
  }
}

export type AddResult = "added" | "exists" | "full";

export function useMerkliste() {
  const [items, setItems] = useState<MerklisteItem[]>(() => readStorage());

  useEffect(() => {
    const sync = () => setItems(readStorage());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const has = useCallback(
    (artikelNr: string | null | undefined) =>
      !!artikelNr && items.some((i) => i.artikel_nr === artikelNr),
    [items],
  );

  const add = useCallback(
    (item: MerklisteItem): AddResult => {
      const current = readStorage();
      if (current.some((i) => i.artikel_nr === item.artikel_nr)) return "exists";
      if (current.length >= MERKLISTE_MAX) return "full";
      const next = [...current, stripLocalizedTexts(item)];
      writeStorage(next);
      setItems(next);
      return "added";
    },
    [],
  );

  const remove = useCallback((artikelNr: string) => {
    const next = readStorage().filter((i) => i.artikel_nr !== artikelNr);
    writeStorage(next);
    setItems(next);
  }, []);

  const toggle = useCallback(
    (item: MerklisteItem): AddResult | "removed" => {
      const current = readStorage();
      if (current.some((i) => i.artikel_nr === item.artikel_nr)) {
        remove(item.artikel_nr);
        return "removed";
      }
      return add(item);
    },
    [add, remove],
  );

  const clear = useCallback(() => {
    writeStorage([]);
    setItems([]);
  }, []);

  return { items, count: items.length, has, add, remove, toggle, clear };
}
