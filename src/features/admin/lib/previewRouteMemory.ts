/**
 * previewRouteMemory — merkt sich die zuletzt in der Live-Vorschau geladene
 * Route über alle Admin-Bereiche hinweg (Inhalte, Bilder, Templates,
 * Strukturkarte).
 *
 * Hintergrund: Bisher sprang die Live-Vorschau in den Tabs „Bilder",
 * „Templates" und „Strukturkarte" immer auf die Startseite zurück, wenn
 * dort gerade nichts ausgewählt war. Beim Wechsel zwischen den Tabs ging
 * der Bearbeitungsstand der Vorschau verloren. Mit diesem kleinen Speicher
 * kann jeder Aufrufer den letzten gezeigten Pfad wiederherstellen, statt
 * stur auf `/` zurückzufallen.
 *
 * Schreibwege:
 *  - `AdminPreviewDrawer` schreibt bei jedem effektiv geladenen Pfad
 *    (Selection oder iFrame-Navigation).
 *  - `MasterDetailWorkbench` (Inhalte) schreibt bei jedem Wechsel der
 *    `effectivePreviewRoutePath`.
 *
 * Lesewege:
 *  - `AdminPreviewDrawer` benutzt den gemerkten Pfad als Fallback statt
 *    `defaultRoutePath`, wenn kein `routePath` übergeben wurde.
 */
const STORAGE_KEY = "cms-admin.preview.lastRoute";

export function readLastPreviewRoute(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function writeLastPreviewRoute(pathname: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!pathname) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, pathname);
  } catch {
    /* ignore */
  }
}
