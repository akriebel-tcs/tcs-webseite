/**
 * Zentrale Sprachlogik für den Produktinformationsbereich (Katalog, PDP,
 * Datenblatt, technische Bezeichnungen).
 *
 * Regeln:
 *  - Die öffentliche Sprachwahl ist dynamisch (`de`, `en`, `pl`, `nl`, …).
 *    Der gewählte Sprachcode wird **unverändert** (nur auf die Grundform
 *    normalisiert) an die kanalgebundenen Produktbasis-RPCs übergeben.
 *  - Fachliche Rückfallkette der Produktdaten: angefordert → `en` → `de`.
 *    Diese Kette gilt ausschließlich für Produktdaten; CMS-Seitentexte
 *    behalten ihre eigene Rückfalllogik.
 *  - Liefert die Produktbasis für die angeforderte Sprache still eine andere
 *    Sprache zurück (erkennbar an `locale` / `text_locale` im Envelope bzw.
 *    in der Nutzlast), wird zuerst `en` versucht, bevor Deutsch akzeptiert
 *    wird. Der tatsächlich aufgelöste Sprachcode wird nach außen gemeldet,
 *    damit die Ansicht einen echten Rückfall kennzeichnen kann.
 */

export const PRODUCT_LOCALE_DEFAULT = "de" as const;
export const PRODUCT_LOCALE_INTERMEDIATE = "en" as const;

/** Normalisiert beliebige i18n-Werte auf die Grundform („nl-NL" → „nl"). */
export function normalizeProductLocale(
  input: string | undefined | null,
): string {
  const base = (input ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(base) ? base : PRODUCT_LOCALE_DEFAULT;
}

/** Rückfallkette der Produktdaten: angefordert → en → de (ohne Dubletten). */
export function productLocaleChain(
  requested: string | undefined | null,
): readonly string[] {
  const base = normalizeProductLocale(requested);
  const chain = [base, PRODUCT_LOCALE_INTERMEDIATE, PRODUCT_LOCALE_DEFAULT];
  return chain.filter((c, i) => chain.indexOf(c) === i);
}

/** BCP-47-Tag für Zahlen-/Preisformatierung. */
export function productIntlLocale(locale: string | undefined | null): string {
  const base = normalizeProductLocale(locale);
  const map: Record<string, string> = {
    de: "de-DE",
    en: "en-GB",
    nl: "nl-NL",
    pl: "pl-PL",
  };
  return map[base] ?? base;
}

const LOCALE_FIELDS = [
  "locale",
  "delivered_locale",
  "text_locale",
  "resolved_locale",
  "content_locale",
  "locale_resolved",
] as const;

/**
 * Fachentscheidung (Stand 2026-09): Produktübersetzungen im Status
 * `proposed` werden öffentlich genauso ausgespielt wie `approved`. Es gibt
 * vorerst kein redaktionelles Freigabe-Gate — geprüft und korrigiert wird
 * direkt an der Website.
 *
 * Folge für die Sprachlogik: `proposed` ist eine **vorhandene** Übersetzung
 * und löst keinen Rückfall aus. Nur wirklich fehlende, leere oder veraltete
 * Werte führen zur Kette angefordert → `en` → `de`.
 */
const TRANSLATION_STATUS_PRESENT = new Set([
  "proposed",
  "vorschlag",
  "approved",
  "freigegeben",
  "published",
  "final",
  "machine",
  "maschinell",
  "mt",
  "human",
  "manuell",
  "ok",
  "current",
  "aktuell",
]);

/** Werte, die als nicht ausspielbar gelten (fehlend/leer/veraltet). */
const TRANSLATION_STATUS_ABSENT = new Set([
  "missing",
  "fehlt",
  "empty",
  "leer",
  "none",
  "stale",
  "outdated",
  "veraltet",
  "needs_update",
  "muss_aktualisiert_werden",
  "invalid",
  "error",
  "fehler",
]);

const STATUS_SUFFIXES = ["status", "translation_status", "locale_status"] as const;
const RECORD_STATUS_FIELDS = [
  "translation_status",
  "locale_status",
  "text_status",
] as const;

/**
 * Bewertet einen Übersetzungsstatus.
 *
 * `true`  = vorhanden und ausspielbar (auch `proposed`).
 * `false` = fehlend/leer/veraltet → Rückfall erlaubt.
 * Unbekannte oder fehlende Statuswerte gelten als vorhanden, damit ein
 * unbekanntes Statusfeld niemals vorhandene Texte unterdrückt.
 */
export function isProductTranslationUsable(
  status: unknown,
): boolean {
  if (typeof status !== "string") return true;
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "") return true;
  if (TRANSLATION_STATUS_ABSENT.has(key)) return false;
  if (TRANSLATION_STATUS_PRESENT.has(key)) return true;
  return true;
}

/**
 * Liest den tatsächlich gelieferten Sprachcode aus einem Envelope oder einer
 * Nutzlast. `null`, wenn die Produktbasis keinen Sprachcode meldet.
 */
export function readDeliveredLocale(value: unknown): string | null {
  const direct = readLocaleFields(value);
  if (direct) return direct;
  // Verschachtelte Pfade der Kanal-RPCs: das Datenblatt meldet die
  // tatsächliche Sprache unter `meta.locale`, die PDP teils unter
  // `pdp.text_locale` bzw. im umgebenden Envelope.
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  for (const container of NESTED_LOCALE_CONTAINERS) {
    const nested = rec[container];
    const found = readLocaleFields(nested);
    if (found) return found;
    if (nested && typeof nested === "object") {
      const inner = (nested as Record<string, unknown>).meta;
      const deep = readLocaleFields(inner);
      if (deep) return deep;
    }
  }
  return null;
}

const NESTED_LOCALE_CONTAINERS = [
  "meta",
  "datasheet",
  "pdp",
  "envelope",
  "payload",
  "header",
] as const;

function readLocaleFields(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  for (const field of LOCALE_FIELDS) {
    const raw = rec[field];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return normalizeProductLocale(raw);
    }
  }
  return null;
}

export interface ProductLocaleResolution<T> {
  readonly value: T | null;
  /** Angeforderte (normalisierte) Sprache. */
  readonly requestedLocale: string;
  /** Sprache, in der die Daten tatsächlich geliefert wurden. */
  readonly resolvedLocale: string;
  /** true, wenn die Ausgabe nicht in der angeforderten Sprache erfolgt. */
  readonly usedFallback: boolean;
  /** Reihenfolge der tatsächlich versuchten Sprachen (für Tests/Diagnose). */
  readonly attempted: readonly string[];
}

/**
 * Lädt Produktdaten entlang der Kette angefordert → en → de.
 *
 * `load` wird pro Sprache genau einmal aufgerufen. Meldet die Antwort eine
 * andere Sprache als die angefragte, wird die nächste Kettenstufe versucht;
 * das zuerst erhaltene Ergebnis bleibt als letzte Rückfallebene erhalten.
 */
export async function resolveProductLocaleValue<T>(
  requested: string | undefined | null,
  load: (locale: string) => Promise<T | null>,
): Promise<ProductLocaleResolution<T>> {
  const chain = productLocaleChain(requested);
  const requestedLocale = chain[0];
  const attempted: string[] = [];
  let lastResort: { value: T; locale: string } | null = null;

  for (let i = 0; i < chain.length; i += 1) {
    const candidate = chain[i];
    attempted.push(candidate);
    const value = await load(candidate);
    if (value === null || value === undefined) continue;

    const delivered = readDeliveredLocale(value) ?? candidate;
    const isLast = i === chain.length - 1;
    // `proposed` gilt als vorhanden; nur fehlend/leer/veraltet löst den
    // nächsten Kettenschritt aus.
    const usable = readRecordStatusUsable(value);

    if ((delivered === candidate && usable) || isLast) {
      return {
        value,
        requestedLocale,
        resolvedLocale: delivered,
        usedFallback: delivered !== requestedLocale,
        attempted,
      };
    }

    // Still auf eine andere Sprache zurückgefallen: erst die nächste
    // Kettenstufe versuchen, bevor dieses Ergebnis akzeptiert wird.
    if (!lastResort) lastResort = { value, locale: delivered };
  }

  if (lastResort) {
    return {
      value: lastResort.value,
      requestedLocale,
      resolvedLocale: lastResort.locale,
      usedFallback: lastResort.locale !== requestedLocale,
      attempted,
    };
  }

  return {
    value: null,
    requestedLocale,
    resolvedLocale: requestedLocale,
    usedFallback: false,
    attempted,
  };
}

/**
 * Wählt aus sprachsuffigierten Feldern (`label_nl`, `label_en`, `label_de`)
 * den passenden Wert entlang der Produkt-Rückfallkette
 * (angefordert → `en` → `de`).
 *
 * Reihenfolge bewusst: erst die suffigierten Sprachfelder der Kette, dann
 * ein unsuffigiertes Feld (`label`). So gewinnt bei `pl`/`nl` niemals ein
 * unsuffigierter deutscher Wert über das vorhandene englische Feld
 * (keine deutsche Mischsprache unter einem PL-/NL-Label).
 */
export function pickProductLocalized(
  record: Record<string, unknown> | null | undefined,
  base: string,
  locale: string | undefined | null,
): string | null {
  return pickProductLocalizedDetailed(record, base, locale).value;
}

export interface ProductLocalizedPick {
  readonly value: string | null;
  /** Sprache des gelieferten Werts; `null` bei unsuffigierten Feldern. */
  readonly locale: string | null;
  readonly usedFallback: boolean;
}

/**
 * Wie `pickProductLocalized`, meldet zusätzlich, aus welcher Sprache der
 * Wert stammt und ob dabei zurückgefallen wurde.
 */
export function pickProductLocalizedDetailed(
  record: Record<string, unknown> | null | undefined,
  base: string,
  locale: string | undefined | null,
): ProductLocalizedPick {
  const requested = normalizeProductLocale(locale);
  const empty: ProductLocalizedPick = {
    value: null,
    locale: null,
    usedFallback: false,
  };
  if (!record) return empty;
  const read = (key: string): string | null => {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
    return null;
  };
  const plain = read(base);
  // Sprachmarker eines bereits lokalisierten Werts (z. B. `label_locale`
  // in den Badges der Kanal-RPCs, sonst der Envelope-Sprachcode).
  const marker =
    read(`${base}_locale`) !== null
      ? normalizeProductLocale(read(`${base}_locale`))
      : readDeliveredLocale(record);
  /**
   * Statusprüfung je Wert. `proposed` ist ausspielbar; nur fehlend/leer/
   * veraltet lässt den Wert übergehen. Unbekannte Statuswerte gelten als
   * ausspielbar (kein stilles Unterdrücken vorhandener Texte).
   */
  const usable = (...keys: readonly string[]): boolean => {
    for (const key of keys) {
      const raw = record[key];
      if (typeof raw === "string" && raw.trim() !== "") {
        return isProductTranslationUsable(raw);
      }
    }
    return true;
  };
  const plainUsable = usable(
    ...STATUS_SUFFIXES.map((s) => `${base}_${s}`),
    ...RECORD_STATUS_FIELDS,
  );
  if (plain && marker === requested && plainUsable) {
    return { value: plain, locale: requested, usedFallback: false };
  }
  /**
   * Serverseitig lokalisierter Wert ohne Sprachmarker: Die Kanal-RPCs liefern
   * in `label` bereits die Anzeige in der angeforderten Sprache und führen
   * `label_de`/`label_en` nur als Herkunftsangabe mit (z. B. Karten-Badges).
   * Fehlt ein Feld `${base}_${requested}`, ist `label` die aktuellste
   * Wahrheit und darf nicht von `label_en`/`label_de` überstimmt werden.
   */
  if (plain && marker === null && plainUsable && read(`${base}_${requested}`) === null) {
    return { value: plain, locale: null, usedFallback: false };
  }

  for (const candidate of productLocaleChain(requested)) {
    const value = read(`${base}_${candidate}`);
    if (!value) continue;
    if (!usable(...STATUS_SUFFIXES.map((s) => `${base}_${candidate}_${s}`))) {
      continue;
    }
    return {
      value,
      locale: candidate,
      usedFallback: candidate !== requested,
    };
  }
  if (plain && plainUsable) {
    return {
      value: plain,
      locale: marker,
      usedFallback: marker !== null && marker !== requested,
    };
  }
  return empty;
}

/**
 * Liest ein **Stammdatenfeld** (z. B. `kurzbeschreibung`, `kurztext`) und gibt
 * es nur aus, wenn es wirklich in der angefragten Sprache vorliegt.
 *
 * Hintergrund: Die Produktbasis führt diese Felder als deutsche Stammdaten und
 * liefert sie unverändert mit, obwohl der Envelope die angefragte Sprache
 * meldet (`locale: "nl"`). Die übersetzte Anzeige steht in den
 * Präsentationsfeldern (`headline`, `subheadline`). Deshalb wird der Sprachcode
 * des Envelopes hier bewusst **nicht** als Übersetzungsnachweis akzeptiert.
 * Zulässig sind nur:
 *   - Deutsch als angefragte Sprache (Quellsprache der Stammdaten),
 *   - ein sprachsuffigiertes Feld `<base>_<locale>`,
 *   - ein feldeigener Sprachmarker `<base>_locale` in der angefragten Sprache.
 * Sonst bleibt der Block leer, statt deutschen Text unter einem PL-/NL-Label
 * zu zeigen.
 */
export function pickProductTranslatedOnly(
  record: Record<string, unknown> | null | undefined,
  base: string,
  locale: string | undefined | null,
): string | null {
  const requested = normalizeProductLocale(locale);
  if (!record) return null;
  const read = (key: string): string | null => {
    const raw = record[key];
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  };
  const suffixed = read(`${base}_${requested}`);
  if (suffixed) return suffixed;
  const plain = read(base);
  if (!plain) return null;
  if (requested === PRODUCT_LOCALE_DEFAULT) return plain;
  const fieldMarker = read(`${base}_locale`);
  if (fieldMarker && normalizeProductLocale(fieldMarker) === requested) {
    return plain;
  }
  return null;
}

/**
 * Statusbewertung einer ganzen Nutzlast (PDP-/Datenblatt-Envelope).
 * `proposed` gilt als vorhanden.
 */
export function readRecordStatusUsable(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const rec = value as Record<string, unknown>;
  for (const field of RECORD_STATUS_FIELDS) {
    const raw = rec[field];
    if (typeof raw === "string" && raw.trim() !== "") {
      return isProductTranslationUsable(raw);
    }
  }
  return true;
}

