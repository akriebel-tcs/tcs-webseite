/**
 * Trennstrich über Kartenlinks — globale Einstellung + Block-Override.
 *
 * Feld `card_dividers` (nur DE, sprachneutral):
 *   - global: page `global.einstellungen`, Block `card_settings` → on | off
 *   - je Kartenblock: inherit (leer) | on | off
 * Der Strich erscheint nur bei Karten mit mindestens einem aktiven Link.
 * Solange der globale Wert lädt oder fehlt, gilt „an" (vereinbarter Standard).
 */
import { useEffect, useState } from "react";
import { fetchCmsPageFields } from "@/features/cms/api/cmsContent";

export const CARD_DIVIDERS_FIELD_KEY = "card_dividers";
export const CARD_SETTINGS_PAGE_KEY = "global.einstellungen";
export const CARD_SETTINGS_SECTION_KEY = "card_settings";
/** mt-6 = mindestens eine Textzeile Abstand zur Beschreibung darüber. */
export const CARD_DIVIDER_CLASS = "border-t border-border pt-3 mt-6";

export type DividerSetting = "inherit" | "on" | "off";

export function normalizeDividerSetting(raw: string | null | undefined): DividerSetting {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "on" || v === "true" || v === "an") return "on";
  if (v === "off" || v === "false" || v === "aus") return "off";
  return "inherit";
}

/** Block-Wert schlägt globalen Wert; globaler Wert leer/unbekannt = an. */
export function resolveCardDividers(
  blockRaw: string | null | undefined,
  globalRaw: string | null | undefined,
): boolean {
  const block = normalizeDividerSetting(blockRaw);
  if (block !== "inherit") return block === "on";
  return normalizeDividerSetting(globalRaw) !== "off";
}

let globalCache: string | null = null;
let globalPromise: Promise<string> | null = null;
const listeners = new Set<(v: string) => void>();

export function loadGlobalCardDividers(force = false): Promise<string> {
  if (!force && globalPromise) return globalPromise;
  globalPromise = fetchCmsPageFields(CARD_SETTINGS_PAGE_KEY, "de").then((map) => {
    globalCache = map[`${CARD_SETTINGS_SECTION_KEY}.${CARD_DIVIDERS_FIELD_KEY}`] ?? "";
    listeners.forEach((l) => l(globalCache as string));
    return globalCache;
  });
  return globalPromise;
}

export function useGlobalCardDividers(): string {
  const [value, setValue] = useState<string>(globalCache ?? "");
  useEffect(() => {
    listeners.add(setValue);
    void loadGlobalCardDividers();
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

/** Hook: soll der Block Trennstriche über den Kartenlinks zeigen? */
export function useCardDividers(blockRaw?: string | null): boolean {
  const globalRaw = useGlobalCardDividers();
  return resolveCardDividers(blockRaw, globalRaw);
}
