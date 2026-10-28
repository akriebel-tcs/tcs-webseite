/**
 * Vorgeschlagener Dateiname für „Als PDF speichern".
 *
 * Der Browser schlägt beim Drucken den Dokumenttitel (`document.title`) als
 * Dateinamen vor. Damit dort nicht der Seitentitel der Website erscheint,
 * wird für die Dauer des Drucks der artikelbezogene Name gesetzt.
 *
 * Reihenfolge der Quellen: `branding.file_name` aus dem Datenblattvertrag,
 * sonst Markenpräfix (Firmenname des aktiven Ausgabekanals) + lokalisierte
 * Dokumentbezeichnung + Artikelnummer + Sprache. Es wird nichts erfunden und
 * nichts in die Datenbank geschrieben.
 */

/** Liest `branding.file_name` aus der Rohantwort des Vertrags. */
export function readContractFileName(raw: unknown): string | null {
  const branding = (raw as { branding?: unknown } | null)?.branding;
  const value = (branding as { file_name?: unknown } | null)?.file_name;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Nur dateisystemsichere Zeichen; Trenner werden zusammengefasst. */
export function sanitizeFileStem(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.pdf$/i, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface DatasheetFileNameInput {
  /** `branding.file_name` aus dem Vertrag, falls vorhanden. */
  readonly contractFileName?: string | null;
  /** Lokalisierte Dokumentbezeichnung, z. B. „Datenblatt". */
  readonly documentType: string;
  readonly artikelNr: string;
  readonly locale: string;
  /** Firmenname des aktiven Markenprofils, z. B. „TCS TürControlSysteme AG". */
  readonly companyName?: string | null;
}

/** Titel ohne Dateiendung — Browser hängen `.pdf` selbst an. */
export function datasheetDocumentTitle({
  contractFileName,
  documentType,
  artikelNr,
  locale,
  companyName,
}: DatasheetFileNameInput): string {
  const fromContract = sanitizeFileStem(contractFileName ?? "");
  if (fromContract) return fromContract;

  // Markenpräfix des aktiven Ausgabekanals (erstes Wort des Firmennamens).
  const brand = sanitizeFileStem(companyName ?? "").split("-")[0] ?? "";
  return [
    brand,
    sanitizeFileStem(documentType),
    sanitizeFileStem(artikelNr),
    sanitizeFileStem(locale),
  ]
    .filter(Boolean)
    .join("-");
}
