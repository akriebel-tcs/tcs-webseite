/**
 * sectionAnchor — eine Wahrheit für Sprungmarken (Anker) auf CMS-Seiten.
 *
 * Jeder öffentlich gerenderte Top-Level-Block bekommt eine Anker-Kennung,
 * die direkt aus seinem Block-Schlüssel (`cms_sections.section_key`)
 * abgeleitet wird. Damit kann eine Standardkarte im Zielfeld
 * (`link_1_href`) einfach `#leistungen` eintragen und landet auf dem
 * Block mit dem Schlüssel `leistungen` derselben Seite.
 *
 * Regeln:
 *  - Kleinschreibung
 *  - alles außer a–z, 0–9, `-` und `_` wird zu `-`
 *  - Punkte in verschachtelten Schlüsseln (`sections.leistungen`) werden
 *    ebenfalls zu `-`; zusätzlich wird das letzte Segment als Alias-Anker
 *    ausgegeben, damit `#leistungen` auch dort funktioniert.
 */

export function sectionAnchorId(sectionKey: string): string {
  return sectionKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Kurz-Alias (letztes Segment), falls der Schlüssel Punkte enthält. */
export function sectionAnchorAlias(sectionKey: string): string | null {
  if (!sectionKey.includes(".")) return null;
  const last = sectionKey.split(".").filter(Boolean).pop() ?? "";
  const alias = sectionAnchorId(last);
  return alias && alias !== sectionAnchorId(sectionKey) ? alias : null;
}
