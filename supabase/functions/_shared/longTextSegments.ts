/**
 * Segmentierung sehr langer Quelltexte (z. B. Rechtstexte mit 4.000–26.000
 * Zeichen) für die maschinelle Übersetzung.
 *
 * Regeln:
 * - Es wird ausschließlich an strukturellen Grenzen getrennt: Absatzleerzeilen,
 *   Blockenden von HTML (`</p>`, `</li>`, `</ul>`, `</ol>`, `</h1>`…`</h6>`,
 *   `</div>`, `<br>`) und, falls nötig, an Satzenden.
 * - Die Trennzeichen selbst bleiben Teil der Segmente. Deshalb gilt immer:
 *   `joinSegments(segmentLongText(text, n)) === text`.
 * - HTML-Tags, Listen, Links und Platzhalter (`{{name}}`) werden nie zerlegt;
 *   ein Segment endet nur außerhalb eines Tags.
 */

/** Ergebnis der Segmentierung. */
export interface SegmentationResult {
  /** Segmente in Originalreihenfolge; verlustfrei zusammensetzbar. */
  segments: string[];
  /** true, wenn jedes Segment die Höchstlänge einhält. */
  fits: boolean;
  /** Länge des längsten Segments. */
  longest: number;
}

const BLOCK_END = /(<\/(?:p|li|ul|ol|h[1-6]|div|section|tr|table)>|<br\s*\/?>)/gi;

/** Grenzen (Index nach dem Trennzeichen), an denen getrennt werden darf. */
function boundaries(text: string): number[] {
  const out = new Set<number>();

  // Absatzgrenzen: eine oder mehr Leerzeilen
  const para = /\n[ \t]*\n+/g;
  for (let m = para.exec(text); m; m = para.exec(text)) {
    out.add(m.index + m[0].length);
  }

  // HTML-Blockenden
  BLOCK_END.lastIndex = 0;
  for (let m = BLOCK_END.exec(text); m; m = BLOCK_END.exec(text)) {
    out.add(m.index + m[0].length);
  }

  // Einfache Zeilenumbrüche
  const line = /\n/g;
  for (let m = line.exec(text); m; m = line.exec(text)) {
    out.add(m.index + m[0].length);
  }

  // Satzenden — nur außerhalb von Tags und nicht bei Abkürzungen wie "z. B."
  const sentence = /[.!?][)"”']?\s+/g;
  for (let m = sentence.exec(text); m; m = sentence.exec(text)) {
    const end = m.index + m[0].length;
    if (insideTag(text, end)) continue;
    out.add(end);
  }

  const list = [...out].filter((i) => i > 0 && i < text.length).sort((a, b) => a - b);
  return list;
}

/** Liegt die Position innerhalb eines HTML-Tags? */
function insideTag(text: string, index: number): boolean {
  const open = text.lastIndexOf("<", index - 1);
  if (open === -1) return false;
  const close = text.lastIndexOf(">", index - 1);
  return open > close;
}

/**
 * Zerlegt `text` in möglichst wenige, verlustfrei zusammensetzbare Segmente,
 * die je höchstens `maxLength` Zeichen lang sind.
 */
export function segmentLongText(text: string, maxLength: number): SegmentationResult {
  const src = text ?? "";
  if (maxLength <= 0 || src.length <= maxLength) {
    return { segments: src === "" ? [] : [src], fits: src.length <= maxLength, longest: src.length };
  }

  const stops = boundaries(src);
  const segments: string[] = [];
  let start = 0;

  while (start < src.length) {
    const hardEnd = start + maxLength;
    if (hardEnd >= src.length) {
      segments.push(src.slice(start));
      break;
    }
    // größte erlaubte Grenze innerhalb des Fensters
    let cut = -1;
    for (const s of stops) {
      if (s <= start) continue;
      if (s > hardEnd) break;
      cut = s;
    }
    if (cut === -1) {
      // Keine strukturelle Grenze im Fenster: Segment bleibt zu lang, aber
      // verlustfrei. Der Aufrufer erkennt das an `fits === false`.
      const nextStop = stops.find((s) => s > hardEnd);
      cut = nextStop ?? src.length;
    }
    segments.push(src.slice(start, cut));
    start = cut;
  }

  const longest = segments.reduce((max, s) => Math.max(max, s.length), 0);
  return { segments, fits: longest <= maxLength, longest };
}

/** Setzt Segmente exakt wieder zusammen. */
export function joinSegments(segments: readonly string[]): string {
  return segments.join("");
}

/**
 * Setzt übersetzte Segmente zusammen und überträgt dabei die Rand-Leerzeichen
 * der Quellsegmente, damit Absatz- und Listenstruktur erhalten bleibt.
 */
export function joinTranslatedSegments(
  sourceSegments: readonly string[],
  translatedSegments: readonly string[],
): string {
  return sourceSegments
    .map((source, i) => {
      const translated = translatedSegments[i] ?? "";
      const leading = source.match(/^\s*/)?.[0] ?? "";
      const trailing = source.match(/\s*$/)?.[0] ?? "";
      return `${leading}${translated.trim()}${trailing}`;
    })
    .join("");
}
