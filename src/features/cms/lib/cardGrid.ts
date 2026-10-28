/**
 * cardGrid — Vereinheitlichte Raster-Regel für ALLE Karten-Container.
 *
 * Ziel (Thomas, 2026-06-04): Es darf nie ein „3 + 1"-Orphan entstehen.
 * Karten werden immer in ausgewogenen Blöcken angeordnet:
 *
 *   1 Karte   → 1 zentriert (volle Breite)
 *   2 Karten  → 2 nebeneinander
 *   3 Karten  → 3 nebeneinander
 *   4 Karten  → 4 nebeneinander (oder 2 + 2 auf schmalerem Layout)
 *   5 Karten  → 3 oben + 2 darunter, auf gleiche Gesamtbreite gezogen
 *   6 Karten  → 3 + 3
 *   7 Karten  → 4 + 3
 *   8 Karten  → 4 + 4
 *   9 Karten  → 3 + 3 + 3
 *  10 Karten  → 4 + 3 + 3
 *  11 Karten  → 4 + 4 + 3
 *  12 Karten  → 4 + 4 + 4
 *   …danach Wiederholung des Musters (immer 2/3/4 pro Reihe, kein „1er").
 *
 * Familien-Caps (visuelle Konvention, kein Orphan-Schutz):
 *   - benefits / vorteile: maximal 3 pro Reihe.
 *   - useCases / anwendungen / einsatz / branche: maximal 4 pro Reihe.
 *   - default: maximal 4 pro Reihe.
 *
 * Umsetzung (Tailwind, alle Klassen literal — wichtig für JIT):
 *   Container: `grid-cols-1 md:grid-cols-6 lg:grid-cols-12` (LCM von 2/3/4/6).
 *   Items setzen je nach Reihen-Größe ein `lg:col-span-{12|6|4|3}`.
 *   Auf md (Tablet) immer 2 Spalten via `md:col-span-3` — bewusst keine
 *   Sonderlogik fürs Tablet, damit alle Seiten gleich aussehen.
 *
 * Verwendung im Renderer:
 *   const container = cardGridClass(sectionKey, "mt-8", items.length);
 *   <div className={container}>
 *     {items.map((it, i) => (
 *       <div key={...} className={cardGridItemClass(sectionKey, items.length, i)}>
 *         …Karte…
 *       </div>
 *     ))}
 *   </div>
 */

export type CardGridFamily = "benefits" | "useCases" | "default";

const BENEFIT_RX = /(^|_|-|\.|\b)(benefit|vorteil)/i;
const USECASE_RX = /(^|_|-|\.|\b)(usecase|use[-_]?case|anwendung|einsatz|branche)/i;

export function detectCardGridFamily(sectionKey: string | null | undefined): CardGridFamily {
  const k = (sectionKey ?? "").toString();
  if (!k) return "default";
  if (BENEFIT_RX.test(k)) return "benefits";
  if (USECASE_RX.test(k)) return "useCases";
  return "default";
}

function maxRowFor(family: CardGridFamily): number {
  return family === "benefits" ? 3 : 4;
}

/**
 * Liefert die Reihen-Aufteilung als Array (z. B. `[4, 3, 3]`).
 * Garantiert: keine Reihe mit 1 Karte (außer Gesamt = 1).
 */
export function computeCardRows(itemCount: number, maxRow = 4): number[] {
  const n = Math.max(0, Math.floor(itemCount || 0));
  if (n === 0) return [];
  if (n <= maxRow) return [n];
  // Bevorzugt gleichmäßige Reihen, wenn n sauber teilbar ist.
  if (maxRow >= 4 && n % 4 === 0) return Array(n / 4).fill(4);
  if (n % 3 === 0) return Array(n / 3).fill(3);

  const rows: number[] = [];
  let rem = n;
  while (rem > maxRow) {
    rows.push(maxRow);
    rem -= maxRow;
  }
  if (rem === 1) {
    // Orphan: letzte volle Reihe auflösen und auf zwei balancierte
    // Reihen verteilen (z. B. 5 → 3+2, 9 → 3+3+3 via Multiple-of-3-Pfad).
    if (rows.length === 0) {
      rows.push(1);
    } else {
      rows.pop();
      rem += maxRow; // jetzt = maxRow + 1
      const a = Math.ceil(rem / 2);
      const b = Math.floor(rem / 2);
      rows.push(a, b);
    }
  } else if (rem === 2 && maxRow >= 4 && rows.length > 0) {
    // 4+4+2 → 4+3+3 (gleichmäßiger).
    rows.pop();
    rem += maxRow; // = 6
    rows.push(3, 3);
  } else {
    rows.push(rem);
  }
  return rows;
}

/** Welche Reihen-Größe (2/3/4 oder 1) gilt für Item `index`? */
export function rowSizeForIndex(itemCount: number, index: number, maxRow = 4): number {
  const rows = computeCardRows(itemCount, maxRow);
  let cursor = 0;
  for (const size of rows) {
    if (index < cursor + size) return size;
    cursor += size;
  }
  return rows[rows.length - 1] ?? 1;
}

/**
 * Container-Klassen für den Karten-Wrapper.
 * Hinweis: `itemCount` ist nicht mehr nötig, bleibt nur aus
 * Kompatibilitätsgründen im Signatur-Slot.
 */
export function cardGridClass(
  sectionKey: string | null | undefined,
  extra = "",
  _itemCount?: number,
): string {
  // Einheitlicher Container, Reihen-Logik passiert in `cardGridItemClass`.
  const base = "grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6";
  return extra ? `${base} ${extra}` : base;
}

/**
 * Per-Item-Klasse: Spalten-Spanne auf lg, immer 2-Spalter auf md.
 * Die literal aufgelisteten Klassen müssen im Quelltext stehen,
 * damit Tailwind sie findet.
 */
export function cardGridItemClass(
  sectionKey: string | null | undefined,
  itemCount: number,
  index: number,
): string {
  const family = detectCardGridFamily(sectionKey);
  const size = rowSizeForIndex(itemCount, index, maxRowFor(family));
  // Tablet (md): bei 1er-Reihe voll, sonst immer Halb (2 Spalten = 3 von 6).
  const md = size === 1 ? "md:col-span-6" : "md:col-span-3";
  // Desktop (lg): 1 → 12, 2 → 6, 3 → 4, 4 → 3.
  const lg =
    size === 1
      ? "lg:col-span-12"
      : size === 2
      ? "lg:col-span-6"
      : size === 3
      ? "lg:col-span-4"
      : "lg:col-span-3";
  return `${md} ${lg}`;
}

/**
 * Bild-Seitenverhältnis pro Karte — abhängig von der tatsächlichen
 * Reihen-Größe (2/3/4 pro Reihe auf Desktop). Verhindert, dass breite
 * 2er-Karten ein zu hohes 4:3-Bild bekommen.
 *
 * Mobile/Tablet: einheitlich 16:9 (Karten sind dort ohnehin
 *   annähernd gleich breit, Stack-Layout).
 * Desktop (lg) — Stand 2026-06-05 (Thomas):
 *   1 Karte  → 21:9 (Hero-artig, breit)
 *   2 Karten → 21:9 (breite Karten verlangen ebenfalls flaches Bild)
 *   3 Karten → 16:9
 *   4 Karten → 4:3 (schmale Spalte, klassisches Foto-Verhältnis)
 *
 * Tailwind-JIT-Hinweis: alle Klassen literal aufgeführt.
 */
export function cardImageAspectClass(
  sectionKey: string | null | undefined,
  itemCount: number,
  index: number,
  override?: string | null,
): string {
  // Redaktioneller Override am Container (`card_aspect`): erzwingt für ALLE
  // Karten dieses Containers dasselbe Bildformat. Leer = heutige Ableitung.
  const forced = cardAspectOverrideClass(override);
  if (forced) return forced;
  const family = detectCardGridFamily(sectionKey);
  const size = rowSizeForIndex(itemCount, index, maxRowFor(family));
  if (size === 1) return "aspect-[16/9] lg:aspect-[21/9]";
  if (size === 2) return "aspect-[16/9] lg:aspect-[21/9]";
  if (size === 3) return "aspect-[16/9]";
  return "aspect-[16/9] lg:aspect-[4/3]";
}

/**
 * Wert des technischen Container-Feldes `card_aspect` → Tailwind-Klasse.
 * Erlaubte Werte: `21-9`, `16-9`, `4-3` (auch mit `:` oder `/` geschrieben).
 * Alles andere (inkl. leer) → `null` = keine Übersteuerung.
 */
export function cardAspectOverrideClass(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase().replace(/[:/]/g, "-");
  if (v === "21-9") return "aspect-[21/9]";
  if (v === "16-9") return "aspect-[16/9]";
  if (v === "4-3") return "aspect-[4/3]";
  return null;
}

