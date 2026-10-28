/**
 * Admin-Activity-Log — schlanker, in-memory Verlauf der letzten Admin-Aktionen.
 *
 * Zweck: Nach dem Verschieben, Duplizieren, Ein-/Ausblenden oder Löschen von
 * Knoten und Inhaltsblöcken soll der Anwender sofort sehen, **welche Änderung
 * welche Seite/welchen Abschnitt betroffen hat** — inkl. Zeitstempel und
 * Erfolg/Fehler. Damit lassen sich versehentliche Klicks zuordnen.
 *
 * Bewusst einfach gehalten:
 *  - Module-singleton (kein Context-Provider nötig).
 *  - Subscribe-Pattern für React via `useAdminActivityLog`.
 *  - Hält die letzten 50 Einträge im RAM. Kein Persistieren — beim Reload
 *    der Seite startet das Log leer (Prototyp-Phase, keine DB-Historie).
 *
 * Schreibwege bleiben unverändert: dieses Log ist reine Anzeige und
 * berührt weder RPCs noch Tabellen.
 */

export type ActivityKind =
  | "page_duplicate"
  | "node_create"
  | "section_toggle_active"
  | "section_reorder"
  | "section_duplicate"
  | "section_delete"
  | "node_move"
  | "node_toggle_active"
  | "node_delete";

export type ActivityStatus = "draft" | "saved" | "error";

export interface ActivityEntry {
  /** Stabile ID für React-Keys. */
  id: string;
  /** Zeitpunkt der Aktion (Client-Uhr). */
  at: Date;
  /** Welche Art von Änderung. */
  kind: ActivityKind;
  /** Status der Speicherung gegenüber der DB. */
  status: ActivityStatus;
  /** Kurzer, lesbarer Satz für die UI (Deutsch). */
  summary: string;
  /** Welche Seite war betroffen (page_key, z. B. „home.start"). */
  pageKey?: string;
  /** Welche Section/Block (section_key) war betroffen. */
  sectionKey?: string;
  /** Optionaler zweiter Block (z. B. Quelle bei Duplikat oder Tausch-Partner). */
  relatedSectionKey?: string;
  /** Optionaler Knoten-Schlüssel für Navigations-Aktionen. */
  nodeKey?: string;
  /** Fehlermeldung bei status === "error". */
  error?: string;
}

const MAX_ENTRIES = 50;
let entries: ActivityEntry[] = [];
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

function nextId(): string {
  // Kein crypto.randomUUID-Zwang — reicht als React-Key.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Neuen Eintrag voranstellen. Begrenzt auf MAX_ENTRIES. */
export function logActivity(input: Omit<ActivityEntry, "id" | "at">): ActivityEntry {
  const entry: ActivityEntry = { ...input, id: nextId(), at: new Date() };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  notify();
  return entry;
}

/** Komplett leeren (Button „Verlauf zurücksetzen"). */
export function clearActivityLog() {
  entries = [];
  notify();
}

/** Snapshot — bewusst keine direkte Mutation von außen. */
export function getActivityLog(): ReadonlyArray<ActivityEntry> {
  return entries;
}

/** React-Subscribe-Helfer (ohne externe Lib). */
export function subscribeActivityLog(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Lesbares Label für den Aktions-Typ. */
export function activityKindLabel(kind: ActivityKind): string {
  switch (kind) {
    case "page_duplicate":
      return "Seite dupliziert";
    case "node_create":
      return "Knoten angelegt";
    case "section_toggle_active":
      return "Block ein-/ausgeblendet";
    case "section_reorder":
      return "Block verschoben";
    case "section_duplicate":
      return "Block dupliziert";
    case "section_delete":
      return "Block gelöscht";
    case "node_move":
      return "Knoten verschoben";
    case "node_toggle_active":
      return "Knoten ein-/ausgeblendet";
    case "node_delete":
      return "Knoten gelöscht";
  }
}
