/**
 * PreviewSheet — Live-Vorschau als Schublade vom rechten Rand.
 *
 * Etappe `cms-light-admin-preview-overlay-1`:
 * Die Vorschau ist nicht mehr Teil der drei Spalten, sondern legt sich
 * vom rechten Bildschirmrand kommend über die Hälfte des Browsers.
 * Vorteil: deutlich mehr Platz zum Schauen, der Arbeitsbereich darunter
 * bleibt nutzbar und kein modaler „Hintergrund-Dimmer" stört.
 *
 * - Geöffnet: feste Position rechts, halbe Bildschirmbreite (min 520 px),
 *   slide-in Animation. Kein Backdrop, damit man den Editor dahinter
 *   weiterhin lesen/anklicken kann.
 * - Geschlossen: nur ein schmaler Streifen ganz am rechten Rand mit
 *   senkrechter Beschriftung „Live-Vorschau" — Klick öffnet die Schublade.
 * - Persistenz offen/zu in localStorage (`cms-admin.preview.sheet`).
 */
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: React.ReactNode;
}

const PreviewSheet: React.FC<Props> = ({ open, onOpenChange, children }) => {
  // ESC schließt die Schublade — kleiner Komfort, kein „Trap".
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {/* Immer sichtbarer Streifen am rechten Rand: zeigt, dass es die Vorschau gibt. */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        title={open ? "Live-Vorschau schließen" : "Live-Vorschau öffnen (Schublade von rechts)"}
        aria-label={open ? "Live-Vorschau schließen" : "Live-Vorschau öffnen"}
        className="fixed right-0 top-1/2 z-50 flex h-40 w-7 -translate-y-1/2 flex-col items-center justify-between rounded-l-md border border-r-0 bg-primary/90 py-2 text-primary-foreground shadow-lg transition-colors hover:bg-primary"
      >
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        <span
          className="select-none text-[10px] font-semibold uppercase tracking-wider"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Live-Vorschau
        </span>
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Schublade selbst */}
      <aside
        aria-hidden={!open}
        className={
          "fixed right-0 top-0 z-40 flex h-screen flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-out " +
          (open ? "translate-x-0" : "translate-x-full")
        }
        style={{ width: "min(50vw, 100vw - 2.5rem)", minWidth: "520px" }}
      >
        <header className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">Live-Vorschau</h2>
            <p className="text-[11px] text-muted-foreground">
              Zeigt die öffentliche Website — Änderungen im Admin erscheinen nach „Aktualisieren".
              Mit <kbd className="rounded border bg-background px-1 font-mono">Esc</kbd> schließen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Live-Vorschau schließen"
            title="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden bg-background">
          {/* iFrame-Inhalt erst rendern, wenn die Schublade mindestens einmal offen war,
              damit beim ersten Öffnen kein „unsichtbares" Laden im Hintergrund läuft. */}
          {open ? children : null}
        </div>
      </aside>
    </>
  );
};

export default PreviewSheet;
