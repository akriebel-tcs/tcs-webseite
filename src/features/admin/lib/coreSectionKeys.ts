/**
 * coreSectionKeys — Liste der „Vertragsblöcke", die auf einer Seite
 * systematisch angelegt werden (FAQ, Standard-CTA usw.) und im
 * Admin-Baum IMMER inline sichtbar bleiben sollen — auch wenn sie
 * gerade ausgeblendet sind. Damit kann der Redakteur sie mit einem
 * Klick wieder einblenden, ohne sie im „Altbestand"-Bucket suchen
 * zu müssen.
 *
 * Echte Altbestände (alte, nicht zum aktuellen Vertrag gehörende
 * Sections) bleiben hingegen weiterhin im Altbestand-Bucket und
 * können dort optional eingeblendet werden.
 *
 * Heuristik (eine reicht):
 *   1. `section_key` ist in CORE_SECTION_KEYS, ODER
 *   2. `section_type` ist in CORE_SECTION_TYPES.
 *
 * Reines Anzeige-Verhalten. Kein Schreibweg, keine Auswirkung auf
 * das Public-Rendering.
 */

export const CORE_SECTION_KEYS = new Set<string>([
  "standard_cta",
  "cta",
  "faq",
]);

export const CORE_SECTION_TYPES = new Set<string>([
  "cta_v1",
  "faq_v1",
]);

export function isCoreContractSection(input: {
  section_key?: string | null;
  section_type?: string | null;
}): boolean {
  if (input.section_key && CORE_SECTION_KEYS.has(input.section_key)) return true;
  if (input.section_type && CORE_SECTION_TYPES.has(input.section_type)) return true;
  return false;
}
