/**
 * AdminHardeningNotice — kleiner interner Hinweis im Admin
 * (Sprint-0 „Eine Wahrheit"-Phase).
 *
 * Bewusst klein, nicht modale Marketingseite, sondern Streifen oben im
 * Arbeitsbereich. Dismiss-State liegt in localStorage; bei Bedarf kann
 * der Hinweis über DevTools wieder eingeblendet werden (Key entfernen).
 */
import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "cms-admin.hardening-notice.dismissed-v1";

const initialDismissed = (() => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
})();

const AdminHardeningNotice: React.FC = () => {
  const [dismissed, setDismissed] = useState<boolean>(initialDismissed);
  if (dismissed) return null;
  return (
    <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1 leading-snug">
        <strong>CMS-Light ist aktiv.</strong>{" "}
        Bestehende Inhalte (Texte, Bilder, Alt-Texte, Icons, vorhandene Felder)
        können direkt hier gepflegt werden. Für neue Blöcke, Karten, Kopien,
        Verschiebungen oder größere Umstellungen — und immer dann, wenn der Admin
        bei einer Aktion eine Warnung zeigt — bitte den Wunsch als Prompt mit
        Seite, Block oder Kurz-ID (P-…, B-…, A-…, N-…) formulieren; Lovable legt
        die Struktur CMS-konform über bestehende Templates und Section-Typen an.
        Admin-Warnungen bitte ernst nehmen und nicht erzwingen.
        <br />
        <span className="text-amber-800/80 dark:text-amber-300/80">
          Interner Drift-Report: <code>docs/04-betrieb/contract-drift-audit-latest.md</code>
          {" "}(Audit: <code className="rounded bg-amber-500/15 px-1">npm run cms:audit:contract-drift</code>).
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
        className="shrink-0 rounded p-0.5 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
        aria-label="Hinweis ausblenden"
        title="Hinweis ausblenden (gilt nur für diesen Browser)"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default AdminHardeningNotice;
